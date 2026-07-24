-- =============================================================================
-- ShopRally Proprietary Repair Taxonomy & Dynamic Parts Fitment
-- PostgreSQL 15+ production DDL (expand-only, multi-tenant safe)
-- =============================================================================
-- Design goals:
--   1. Normalized vehicle identity independent of commercial catalog APIs
--   2. Hierarchical service operations (Main → Sub → Component → Action)
--   3. Manufacturer / hardware SKU catalog decoupled from vehicle fitment
--   4. Dynamic M:N vehicle × operation × part fitment with qty + variant flags
--   5. Labor time matrix with factory hours + live technician telemetry score
--
-- Money is NOT stored here — billing rates live in shop settings (SoC).
-- All IDs are UUID; timestamps are timestamptz; soft-delete via archived_at.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";          -- pgvector for config similarity
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- fuzzy text fallbacks

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------

CREATE TYPE chassis_complexity_tier AS ENUM (
  'INLINE_4_OPEN',          -- roomy transverse/longitudinal I4
  'INLINE_4_PACKED',        -- tight FWD bay / hybrid packaging
  'V6_MODERATE',            -- typical V6 clearance
  'V6_TIGHT',               -- cramped V6 (e.g. many transverse packages)
  'V8_TRUCK',               -- pickup / body-on-frame V8
  'V8_PERFORMANCE',         -- dense performance bay
  'BOXER_SUBARU',           -- flat packaging quirks
  'EV_SKATEBOARD',          -- BEV skateboard / high-voltage procedures
  'HYBRID_DUAL_POWERTRAIN', -- ICE + electric dual constraints
  'HEAVY_DUTY_COMMERCIAL'   -- class 3–7 / fleet density
);

CREATE TYPE service_hierarchy_level AS ENUM (
  'MAIN_SYSTEM',
  'SUB_SYSTEM',
  'COMPONENT',
  'ACTION_TYPE'
);

CREATE TYPE part_catalog_kind AS ENUM (
  'OEM',
  'AFTERMARKET',
  'HARDWARE_BOX',           -- shop hardware SKU (bolts, clips, fluids sold as SKU)
  'REMAN',
  'GENERIC_CATEGORY'        -- category placeholder pending SKU resolution
);

CREATE TYPE labor_telemetry_source AS ENUM (
  'FACTORY_SEED',
  'SHOP_INVOICE_CLOSEOUT',
  'VECTOR_INHERIT',
  'CHASSIS_INTERPOLATED',
  'MANUAL_OVERRIDE'
);

-- ---------------------------------------------------------------------------
-- 1. vehicle_taxonomy
--    Year / Make / Model / Engine + abstracted chassis_complexity_tier
-- ---------------------------------------------------------------------------

CREATE TABLE vehicle_taxonomy (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year                        smallint NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  make                        text NOT NULL,
  make_normalized             text NOT NULL,          -- lower(trim) canonical
  model                       text NOT NULL,
  model_normalized            text NOT NULL,
  trim                        text,
  engine_configuration        text NOT NULL,          -- e.g. "2.4L I4", "3.5L V6"
  engine_displacement_l       numeric(4, 2),
  engine_cylinders            smallint,
  engine_aspiration           text,                   -- NA | TURBO | SUPERCHARGED
  engine_fuel                 text,                   -- GAS | DIESEL | HYBRID | EV
  drive_type                  text,                   -- FWD | RWD | AWD | 4WD
  transmission_class          text,                   -- AT | MT | CVT | DCT
  chassis_complexity_tier     chassis_complexity_tier NOT NULL,
  -- Dense embedding of YMME + packaging attributes for nearest-neighbor inherit
  config_embedding            vector(384),
  -- Stable natural key for upserts / external sync (proprietary, not ACES)
  taxonomy_key                text NOT NULL,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  archived_at                 timestamptz,

  CONSTRAINT uq_vehicle_taxonomy_key UNIQUE (taxonomy_key),
  CONSTRAINT uq_vehicle_taxonomy_natural UNIQUE (
    year, make_normalized, model_normalized, engine_configuration, drive_type
  )
);

CREATE INDEX idx_vehicle_taxonomy_ymm
  ON vehicle_taxonomy (year, make_normalized, model_normalized)
  WHERE archived_at IS NULL;

CREATE INDEX idx_vehicle_taxonomy_chassis
  ON vehicle_taxonomy (chassis_complexity_tier)
  WHERE archived_at IS NULL;

CREATE INDEX idx_vehicle_taxonomy_embedding
  ON vehicle_taxonomy
  USING ivfflat (config_embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON TABLE vehicle_taxonomy IS
  'Normalized vehicle configuration registry. Chassis tier drives labor scaling.';
COMMENT ON COLUMN vehicle_taxonomy.chassis_complexity_tier IS
  'Abstract packaging difficulty used by chassis interpolation multipliers.';
COMMENT ON COLUMN vehicle_taxonomy.config_embedding IS
  'pgvector embedding for nearest-neighbor labor inheritance on cache miss.';

-- ---------------------------------------------------------------------------
-- 2. service_operations
--    Hierarchical repair tree: Main System → Sub-System → Component → Action
-- ---------------------------------------------------------------------------

CREATE TABLE service_operations (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id                   uuid REFERENCES service_operations (id) ON DELETE RESTRICT,
  hierarchy_level             service_hierarchy_level NOT NULL,
  -- Explicit system keys (stable, machine-readable)
  operation_key               text NOT NULL,          -- e.g. BRAKES.FRONT.PADS.R_AND_R
  display_name                text NOT NULL,          -- e.g. "Brake Pads — Remove & Replace"
  short_name                  text,
  sort_order                  integer NOT NULL DEFAULT 0,
  -- Denormalized path for fast breadcrumb / Miller-column UI
  path_keys                   text[] NOT NULL DEFAULT '{}',
  depth                       smallint NOT NULL CHECK (depth BETWEEN 0 AND 3),
  is_billable_leaf            boolean NOT NULL DEFAULT false,
  -- Optional embedding for intent → operation matching
  operation_embedding         vector(384),
  metadata                    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  archived_at                 timestamptz,

  CONSTRAINT uq_service_operations_key UNIQUE (operation_key),
  CONSTRAINT chk_service_operations_root CHECK (
    (hierarchy_level = 'MAIN_SYSTEM' AND parent_id IS NULL AND depth = 0)
    OR (hierarchy_level <> 'MAIN_SYSTEM' AND parent_id IS NOT NULL AND depth > 0)
  ),
  CONSTRAINT chk_service_operations_leaf CHECK (
    (hierarchy_level = 'ACTION_TYPE' AND is_billable_leaf = true)
    OR (hierarchy_level <> 'ACTION_TYPE')
  )
);

CREATE INDEX idx_service_operations_parent
  ON service_operations (parent_id)
  WHERE archived_at IS NULL;

CREATE INDEX idx_service_operations_level
  ON service_operations (hierarchy_level)
  WHERE archived_at IS NULL;

CREATE INDEX idx_service_operations_path_gin
  ON service_operations USING gin (path_keys);

CREATE INDEX idx_service_operations_embedding
  ON service_operations
  USING ivfflat (operation_embedding vector_cosine_ops)
  WITH (lists = 50);

COMMENT ON TABLE service_operations IS
  'Proprietary hierarchical repair tree. Leaves (ACTION_TYPE) are billable ops.';
COMMENT ON COLUMN service_operations.operation_key IS
  'Dot-delimited stable key: MAIN.SUB.COMPONENT.ACTION';

-- ---------------------------------------------------------------------------
-- 3. parts_catalog
--    Master index of unique manufacturer parts + hardware-box SKUs
-- ---------------------------------------------------------------------------

CREATE TABLE parts_catalog (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_kind                part_catalog_kind NOT NULL DEFAULT 'AFTERMARKET',
  manufacturer_code           text,                   -- e.g. ACDELCO, GATES, RAYBESTOS
  manufacturer_part_number    text,
  sku                         text NOT NULL,          -- internal / supplier SKU
  upc                         text,
  display_name                text NOT NULL,
  description                 text,
  -- Generic category used when exact SKU unknown (scraper trigger key)
  generic_category_key        text,                   -- e.g. BRAKE_PAD_FRONT_CERAMIC
  brand_tier                  text,                   -- ECONOMY | STANDARD | PREMIUM | OEM
  unit_of_measure             text NOT NULL DEFAULT 'EA',
  is_hardware_box             boolean NOT NULL DEFAULT false,
  attributes                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  archived_at                 timestamptz,

  CONSTRAINT uq_parts_catalog_sku UNIQUE (sku),
  CONSTRAINT uq_parts_catalog_mfr_pn UNIQUE (manufacturer_code, manufacturer_part_number)
);

CREATE INDEX idx_parts_catalog_category
  ON parts_catalog (generic_category_key)
  WHERE archived_at IS NULL;

CREATE INDEX idx_parts_catalog_name_trgm
  ON parts_catalog USING gin (display_name gin_trgm_ops);

COMMENT ON TABLE parts_catalog IS
  'SKU-level parts index independent of vehicle fitment mappings.';

-- ---------------------------------------------------------------------------
-- 4. vehicle_part_fitment
--    M:N vehicle × operation × part with qty + variant flags
-- ---------------------------------------------------------------------------

CREATE TABLE vehicle_part_fitment (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_taxonomy_id         uuid NOT NULL REFERENCES vehicle_taxonomy (id) ON DELETE CASCADE,
  service_operation_id        uuid NOT NULL REFERENCES service_operations (id) ON DELETE RESTRICT,
  parts_catalog_id            uuid NOT NULL REFERENCES parts_catalog (id) ON DELETE RESTRICT,
  quantity_required           numeric(10, 3) NOT NULL DEFAULT 1
                              CHECK (quantity_required > 0),
  -- Dynamic variant / fitment flags extracted from notes or supplier data
  variant_flags               text[] NOT NULL DEFAULT '{}',
  -- e.g. ARRAY['premium','ceramic','with_hardware']
  position_code               text,                   -- FRONT | REAR | LH | RH | ALL
  is_primary                  boolean NOT NULL DEFAULT true,
  fitment_confidence          numeric(4, 3) NOT NULL DEFAULT 1.000
                              CHECK (fitment_confidence BETWEEN 0 AND 1),
  source                      text NOT NULL DEFAULT 'MANUAL'
                              CHECK (source IN (
                                'MANUAL',
                                'INVOICE_LEARNED',
                                'SUPPLIER_SCRAPE',
                                'ACCOUNT_CATALOG_SWEEP',
                                'LLM_SUGGESTED'
                              )),
  source_ref                  text,                   -- scraper run id / supplier quote id
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  archived_at                 timestamptz,

  CONSTRAINT uq_vehicle_part_fitment UNIQUE (
    vehicle_taxonomy_id,
    service_operation_id,
    parts_catalog_id,
    position_code
  )
);

CREATE INDEX idx_vpf_vehicle_op
  ON vehicle_part_fitment (vehicle_taxonomy_id, service_operation_id)
  WHERE archived_at IS NULL;

CREATE INDEX idx_vpf_variant_gin
  ON vehicle_part_fitment USING gin (variant_flags);

CREATE INDEX idx_vpf_source
  ON vehicle_part_fitment (source)
  WHERE archived_at IS NULL;

COMMENT ON TABLE vehicle_part_fitment IS
  'Dynamic many-to-many fitment: vehicle config + operation → catalog SKU.';
COMMENT ON COLUMN vehicle_part_fitment.variant_flags IS
  'Free-form fitment/sub-variant tags (premium, ceramic, with_sensors, etc.).';

-- ---------------------------------------------------------------------------
-- 5. labor_time_matrix
--    Factory hours + moving telemetry score from real invoice closeouts
-- ---------------------------------------------------------------------------

CREATE TABLE labor_time_matrix (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_taxonomy_id         uuid NOT NULL REFERENCES vehicle_taxonomy (id) ON DELETE CASCADE,
  service_operation_id        uuid NOT NULL REFERENCES service_operations (id) ON DELETE RESTRICT,
  -- Canonical factory / seed hours (never overwritten by telemetry)
  factory_hours               numeric(8, 3) NOT NULL CHECK (factory_hours >= 0),
  -- Effective hours used for quoting (may be interpolated / telemetry-adjusted)
  standard_hours              numeric(8, 3) NOT NULL CHECK (standard_hours >= 0),
  -- Moving telemetry: EMA of actual tech time at invoice closeout
  telemetry_score             numeric(8, 3),          -- rolling actual hours
  telemetry_sample_count      integer NOT NULL DEFAULT 0 CHECK (telemetry_sample_count >= 0),
  telemetry_ema_alpha         numeric(4, 3) NOT NULL DEFAULT 0.200
                              CHECK (telemetry_ema_alpha > 0 AND telemetry_ema_alpha <= 1),
  last_telemetry_at           timestamptz,
  last_telemetry_source       labor_telemetry_source,
  -- Inheritance provenance when row was created via fallback chain
  inherited_from_id           uuid REFERENCES labor_time_matrix (id) ON DELETE SET NULL,
  chassis_multiplier_applied  numeric(6, 4) NOT NULL DEFAULT 1.0000,
  confidence                  numeric(4, 3) NOT NULL DEFAULT 1.000
                              CHECK (confidence BETWEEN 0 AND 1),
  metadata                    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  archived_at                 timestamptz,

  CONSTRAINT uq_labor_time_matrix UNIQUE (vehicle_taxonomy_id, service_operation_id)
);

CREATE INDEX idx_ltm_operation
  ON labor_time_matrix (service_operation_id)
  WHERE archived_at IS NULL;

CREATE INDEX idx_ltm_telemetry_stale
  ON labor_time_matrix (last_telemetry_at NULLS FIRST)
  WHERE archived_at IS NULL;

COMMENT ON TABLE labor_time_matrix IS
  'Vehicle×operation labor hours. factory_hours immutable; telemetry_score updates on closeout.';
COMMENT ON COLUMN labor_time_matrix.factory_hours IS
  'Seed / factory baseline — billing never mutates this column.';
COMMENT ON COLUMN labor_time_matrix.telemetry_score IS
  'EMA of actual technician hours observed when invoices close.';

-- ---------------------------------------------------------------------------
-- Telemetry closeout audit (append-only learning signal)
-- ---------------------------------------------------------------------------

CREATE TABLE labor_telemetry_events (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  labor_time_matrix_id        uuid NOT NULL REFERENCES labor_time_matrix (id) ON DELETE CASCADE,
  shop_id                     uuid NOT NULL,          -- tenant; FK optional at blueprint stage
  repair_order_id             uuid,
  invoice_id                  uuid,
  actual_hours                numeric(8, 3) NOT NULL CHECK (actual_hours >= 0),
  previous_telemetry_score    numeric(8, 3),
  new_telemetry_score         numeric(8, 3) NOT NULL,
  source                      labor_telemetry_source NOT NULL DEFAULT 'SHOP_INVOICE_CLOSEOUT',
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lte_matrix_created
  ON labor_telemetry_events (labor_time_matrix_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Chassis complexity multiplier table (interpolation engine input)
-- ---------------------------------------------------------------------------

CREATE TABLE chassis_labor_multipliers (
  from_tier                   chassis_complexity_tier NOT NULL,
  to_tier                     chassis_complexity_tier NOT NULL,
  labor_hour_multiplier       numeric(6, 4) NOT NULL CHECK (labor_hour_multiplier > 0),
  notes                       text,
  PRIMARY KEY (from_tier, to_tier)
);

COMMENT ON TABLE chassis_labor_multipliers IS
  'Strict scaling matrix for chassis hierarchy interpolation on labor miss.';

-- Seed common transitions (I4 open → tighter packages increase hours)
INSERT INTO chassis_labor_multipliers (from_tier, to_tier, labor_hour_multiplier, notes) VALUES
  ('INLINE_4_OPEN', 'INLINE_4_OPEN', 1.0000, 'identity'),
  ('INLINE_4_OPEN', 'INLINE_4_PACKED', 1.1000, 'tighter bay access'),
  ('INLINE_4_OPEN', 'V6_MODERATE', 1.1500, 'additional clearance / accessory density'),
  ('INLINE_4_OPEN', 'V6_TIGHT', 1.2800, 'space-constrained V6 packaging'),
  ('INLINE_4_OPEN', 'V8_TRUCK', 1.2000, 'mass / reach penalties'),
  ('INLINE_4_OPEN', 'V8_PERFORMANCE', 1.3500, 'dense performance packaging'),
  ('INLINE_4_OPEN', 'BOXER_SUBARU', 1.2200, 'flat-engine access penalties'),
  ('INLINE_4_OPEN', 'EV_SKATEBOARD', 1.4000, 'HV isolation / special procedures'),
  ('INLINE_4_OPEN', 'HYBRID_DUAL_POWERTRAIN', 1.3000, 'dual powertrain constraints'),
  ('INLINE_4_OPEN', 'HEAVY_DUTY_COMMERCIAL', 1.4500, 'fleet / HD complexity'),
  ('V6_MODERATE', 'V6_TIGHT', 1.1200, 'same family, tighter bay'),
  ('V6_TIGHT', 'V6_MODERATE', 0.9000, 'relax toward moderate V6'),
  ('V6_TIGHT', 'INLINE_4_OPEN', 0.7800, 'downscale toward open I4');

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vehicle_taxonomy_updated
  BEFORE UPDATE ON vehicle_taxonomy
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_service_operations_updated
  BEFORE UPDATE ON service_operations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_parts_catalog_updated
  BEFORE UPDATE ON parts_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vehicle_part_fitment_updated
  BEFORE UPDATE ON vehicle_part_fitment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_labor_time_matrix_updated
  BEFORE UPDATE ON labor_time_matrix
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper: EMA telemetry update on invoice closeout
--   CALL apply_labor_telemetry(matrix_id, shop_id, ro_id, invoice_id, actual_hours);
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION apply_labor_telemetry(
  p_matrix_id uuid,
  p_shop_id uuid,
  p_repair_order_id uuid,
  p_invoice_id uuid,
  p_actual_hours numeric
)
RETURNS labor_time_matrix
LANGUAGE plpgsql
AS $$
DECLARE
  v_row labor_time_matrix;
  v_prev numeric(8, 3);
  v_new numeric(8, 3);
  v_alpha numeric(4, 3);
BEGIN
  SELECT * INTO v_row
  FROM labor_time_matrix
  WHERE id = p_matrix_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'labor_time_matrix % not found', p_matrix_id;
  END IF;

  v_alpha := v_row.telemetry_ema_alpha;
  v_prev := v_row.telemetry_score;

  IF v_prev IS NULL THEN
    v_new := p_actual_hours;
  ELSE
    v_new := round((v_alpha * p_actual_hours) + ((1 - v_alpha) * v_prev), 3);
  END IF;

  UPDATE labor_time_matrix
  SET
    telemetry_score = v_new,
    telemetry_sample_count = telemetry_sample_count + 1,
    last_telemetry_at = now(),
    last_telemetry_source = 'SHOP_INVOICE_CLOSEOUT',
    -- Optionally nudge standard_hours toward telemetry after N samples
    standard_hours = CASE
      WHEN telemetry_sample_count + 1 >= 5
        THEN round((0.70 * factory_hours) + (0.30 * v_new), 3)
      ELSE standard_hours
    END
  WHERE id = p_matrix_id
  RETURNING * INTO v_row;

  INSERT INTO labor_telemetry_events (
    labor_time_matrix_id,
    shop_id,
    repair_order_id,
    invoice_id,
    actual_hours,
    previous_telemetry_score,
    new_telemetry_score,
    source
  ) VALUES (
    p_matrix_id,
    p_shop_id,
    p_repair_order_id,
    p_invoice_id,
    p_actual_hours,
    v_prev,
    v_new,
    'SHOP_INVOICE_CLOSEOUT'
  );

  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- Example seed: brakes front pads R&R tree (illustrative)
-- ---------------------------------------------------------------------------

INSERT INTO service_operations (
  hierarchy_level, operation_key, display_name, short_name,
  sort_order, path_keys, depth, is_billable_leaf
) VALUES
  ('MAIN_SYSTEM', 'BRAKES', 'Brakes', 'Brakes', 10, ARRAY['BRAKES'], 0, false);

INSERT INTO service_operations (
  parent_id, hierarchy_level, operation_key, display_name, short_name,
  sort_order, path_keys, depth, is_billable_leaf
)
SELECT id, 'SUB_SYSTEM', 'BRAKES.FRONT', 'Front Brakes', 'Front',
       10, ARRAY['BRAKES', 'BRAKES.FRONT'], 1, false
FROM service_operations WHERE operation_key = 'BRAKES';

INSERT INTO service_operations (
  parent_id, hierarchy_level, operation_key, display_name, short_name,
  sort_order, path_keys, depth, is_billable_leaf
)
SELECT id, 'COMPONENT', 'BRAKES.FRONT.PADS', 'Brake Pads', 'Pads',
       10, ARRAY['BRAKES', 'BRAKES.FRONT', 'BRAKES.FRONT.PADS'], 2, false
FROM service_operations WHERE operation_key = 'BRAKES.FRONT';

INSERT INTO service_operations (
  parent_id, hierarchy_level, operation_key, display_name, short_name,
  sort_order, path_keys, depth, is_billable_leaf
)
SELECT id, 'ACTION_TYPE', 'BRAKES.FRONT.PADS.R_AND_R',
       'Brake Pads — Remove & Replace', 'R&R',
       10,
       ARRAY['BRAKES', 'BRAKES.FRONT', 'BRAKES.FRONT.PADS', 'BRAKES.FRONT.PADS.R_AND_R'],
       3, true
FROM service_operations WHERE operation_key = 'BRAKES.FRONT.PADS';
