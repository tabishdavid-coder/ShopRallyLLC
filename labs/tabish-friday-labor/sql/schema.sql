-- =============================================================================
-- Tabish Friday Labor — Proprietary Self-Correcting Labor Guide
-- PostgreSQL 15+ DDL (standalone — not wired to ShopRally CRM)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------

CREATE TYPE chassis_tier AS ENUM ('1', '2', '3', '4', '5');
-- 1 = open / simple packaging
-- 2 = moderate density
-- 3 = tight bay / transverse complexity
-- 4 = performance / dual powertrain
-- 5 = EV / heavy commercial packaging

CREATE TYPE fitment_status AS ENUM (
  'confirmed',
  'estimated',
  'pending_scrape',
  'rejected'
);

CREATE TYPE labor_row_status AS ENUM (
  'verified',
  'estimated',
  'provisional'
);

-- ---------------------------------------------------------------------------
-- vehicle_taxonomy
-- ---------------------------------------------------------------------------

CREATE TABLE vehicle_taxonomy (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_year      smallint NOT NULL CHECK (model_year BETWEEN 1980 AND 2100),
  make            text NOT NULL,
  model           text NOT NULL,
  engine_config   text NOT NULL,
  chassis_tier    chassis_tier NOT NULL DEFAULT '1',
  embedding       vector(384),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_vehicle_taxonomy_natural UNIQUE (model_year, make, model, engine_config)
);

CREATE INDEX idx_vehicle_taxonomy_ymm
  ON vehicle_taxonomy (model_year, make, model);

CREATE INDEX idx_vehicle_taxonomy_trgm
  ON vehicle_taxonomy USING gin ((make || ' ' || model || ' ' || engine_config) gin_trgm_ops);

CREATE INDEX idx_vehicle_taxonomy_embedding
  ON vehicle_taxonomy
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON TABLE vehicle_taxonomy IS
  'Normalized YMME registry for Tabish Friday Labor. Embedding powers L1 neighbor inherit.';
COMMENT ON COLUMN vehicle_taxonomy.chassis_tier IS
  'Packaging complexity 1 (open) … 5 (EV/HD). Drives chassis multiplier scaling.';

-- ---------------------------------------------------------------------------
-- service_categories  (Main → Sub → Component → Action)
-- ---------------------------------------------------------------------------

CREATE TABLE service_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid REFERENCES service_categories (id) ON DELETE RESTRICT,
  level       smallint NOT NULL CHECK (level BETWEEN 1 AND 4),
  key         varchar(128) NOT NULL,
  name        text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_service_categories_level_key UNIQUE (level, key),
  CONSTRAINT chk_service_categories_root CHECK (
    (level = 1 AND parent_id IS NULL) OR (level > 1 AND parent_id IS NOT NULL)
  )
);

CREATE INDEX idx_service_categories_parent ON service_categories (parent_id);
CREATE INDEX idx_service_categories_level ON service_categories (level);

COMMENT ON TABLE service_categories IS
  'Hierarchical repair tree: level 1 Main System → 2 Sub → 3 Component → 4 Action.';

-- ---------------------------------------------------------------------------
-- service_operations  (billable leaves bound to level-4 categories)
-- ---------------------------------------------------------------------------

CREATE TABLE service_operations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     uuid NOT NULL REFERENCES service_categories (id) ON DELETE RESTRICT,
  operation_code  varchar(160) NOT NULL,
  description     text NOT NULL,
  standard_hours  numeric(5, 2) NOT NULL DEFAULT 0 CHECK (standard_hours >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_service_operations_code UNIQUE (operation_code)
);

CREATE INDEX idx_service_operations_code ON service_operations (operation_code);
CREATE INDEX idx_service_operations_category ON service_operations (category_id);

-- Enforce category_id points at a level-4 node
CREATE OR REPLACE FUNCTION enforce_operation_category_level()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  lvl smallint;
BEGIN
  SELECT level INTO lvl FROM service_categories WHERE id = NEW.category_id;
  IF lvl IS DISTINCT FROM 4 THEN
    RAISE EXCEPTION 'service_operations.category_id must reference a level-4 Action category';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_service_operations_level
  BEFORE INSERT OR UPDATE OF category_id ON service_operations
  FOR EACH ROW EXECUTE FUNCTION enforce_operation_category_level();

COMMENT ON TABLE service_operations IS
  'Billable operations. category_id must be a level-4 Action node.';

-- ---------------------------------------------------------------------------
-- manufacturers / parts_catalog
-- ---------------------------------------------------------------------------

CREATE TABLE manufacturers (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL,
  CONSTRAINT uq_manufacturers_name UNIQUE (name)
);

CREATE TABLE parts_catalog (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number      text NOT NULL,
  manufacturer_id  uuid NOT NULL REFERENCES manufacturers (id) ON DELETE RESTRICT,
  description      text NOT NULL DEFAULT '',
  unit_cost        numeric(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  list_price       numeric(12, 2) NOT NULL DEFAULT 0 CHECK (list_price >= 0),
  category_hint    text,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_parts_catalog_pn_mfr UNIQUE (part_number, manufacturer_id)
);

CREATE INDEX idx_parts_catalog_active ON parts_catalog (is_active) WHERE is_active;
CREATE INDEX idx_parts_catalog_hint ON parts_catalog (category_hint);

COMMENT ON TABLE parts_catalog IS
  'Manufacturer SKU index independent of vehicle fitment.';

-- ---------------------------------------------------------------------------
-- vehicle_part_fitment
-- ---------------------------------------------------------------------------

CREATE TABLE vehicle_part_fitment (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id         uuid NOT NULL REFERENCES vehicle_taxonomy (id) ON DELETE CASCADE,
  operation_id       uuid NOT NULL REFERENCES service_operations (id) ON DELETE RESTRICT,
  part_id            uuid NOT NULL REFERENCES parts_catalog (id) ON DELETE RESTRICT,
  quantity_required  numeric(10, 3) NOT NULL DEFAULT 1 CHECK (quantity_required > 0),
  variant_flags      jsonb NOT NULL DEFAULT '{}'::jsonb,
  fitment_status     fitment_status NOT NULL DEFAULT 'confirmed',
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_vehicle_part_fitment UNIQUE (vehicle_id, operation_id, part_id)
);

CREATE INDEX idx_vpf_vehicle_op ON vehicle_part_fitment (vehicle_id, operation_id);
CREATE INDEX idx_vpf_status ON vehicle_part_fitment (fitment_status);
CREATE INDEX idx_vpf_flags ON vehicle_part_fitment USING gin (variant_flags);

COMMENT ON TABLE vehicle_part_fitment IS
  'M:N vehicle × operation × part. pending_scrape rows enqueue OEM catalog sweeps.';

-- ---------------------------------------------------------------------------
-- labor_time_matrix  (self-correcting)
-- ---------------------------------------------------------------------------

CREATE TABLE labor_time_matrix (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        uuid NOT NULL REFERENCES vehicle_taxonomy (id) ON DELETE CASCADE,
  operation_id      uuid NOT NULL REFERENCES service_operations (id) ON DELETE RESTRICT,
  base_labor_hrs    numeric(5, 2) NOT NULL CHECK (base_labor_hrs >= 0),
  telemetry_score   numeric(8, 3) NOT NULL DEFAULT 0,
  sample_count      integer NOT NULL DEFAULT 0 CHECK (sample_count >= 0),
  status            labor_row_status NOT NULL DEFAULT 'estimated',
  confidence        numeric(4, 3) NOT NULL DEFAULT 0.500 CHECK (confidence BETWEEN 0 AND 1),
  inherited_from_id uuid REFERENCES labor_time_matrix (id) ON DELETE SET NULL,
  last_updated      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_labor_time_matrix UNIQUE (vehicle_id, operation_id)
);

CREATE INDEX idx_ltm_operation ON labor_time_matrix (operation_id);
CREATE INDEX idx_ltm_status ON labor_time_matrix (status);
CREATE INDEX idx_ltm_updated ON labor_time_matrix (last_updated);

COMMENT ON TABLE labor_time_matrix IS
  'Vehicle×operation hours. base_labor_hrs used for billing; telemetry_score EMA from closeouts.';

CREATE TABLE labor_telemetry_events (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  labor_time_matrix_id   uuid NOT NULL REFERENCES labor_time_matrix (id) ON DELETE CASCADE,
  actual_hours           numeric(8, 3) NOT NULL CHECK (actual_hours >= 0),
  previous_telemetry     numeric(8, 3),
  new_telemetry          numeric(8, 3) NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lte_matrix ON labor_telemetry_events (labor_time_matrix_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- shop_config / chassis_multipliers
-- ---------------------------------------------------------------------------

CREATE TABLE shop_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region      text NOT NULL,
  shop_rate   numeric(8, 2) NOT NULL CHECK (shop_rate > 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_shop_config_region UNIQUE (region)
);

INSERT INTO shop_config (region, shop_rate) VALUES
  ('Albany/Capital Region', 145.00);

COMMENT ON TABLE shop_config IS
  'Regional shop labor rates. Billing reads ONLY from here + labor_time_matrix.';

CREATE TABLE chassis_multipliers (
  from_tier   chassis_tier NOT NULL,
  to_tier     chassis_tier NOT NULL,
  multiplier  numeric(6, 4) NOT NULL CHECK (multiplier > 0),
  notes       text,
  PRIMARY KEY (from_tier, to_tier)
);

INSERT INTO chassis_multipliers (from_tier, to_tier, multiplier, notes) VALUES
  ('1', '1', 1.0000, 'identity'),
  ('1', '2', 1.0500, 'moderate packaging'),
  ('1', '3', 1.1800, 'tight bay'),
  ('1', '4', 1.3000, 'performance / dual powertrain'),
  ('1', '5', 1.4500, 'EV / heavy commercial'),
  ('2', '1', 0.9500, 'relax to open'),
  ('2', '2', 1.0000, 'identity'),
  ('2', '3', 1.1200, 'tighten'),
  ('2', '4', 1.2200, 'performance step-up'),
  ('2', '5', 1.3500, 'EV/HD step-up'),
  ('3', '1', 0.8500, 'downscale open'),
  ('3', '2', 0.9000, 'downscale moderate'),
  ('3', '3', 1.0000, 'identity'),
  ('3', '4', 1.1000, 'performance step-up'),
  ('3', '5', 1.2200, 'EV/HD step-up'),
  ('4', '4', 1.0000, 'identity'),
  ('4', '5', 1.1200, 'EV/HD step-up'),
  ('5', '5', 1.0000, 'identity'),
  ('5', '3', 0.8200, 'downscale from EV/HD');

COMMENT ON TABLE chassis_multipliers IS
  'Strict tier→tier labor hour scaling for fallback interpolation.';

-- ---------------------------------------------------------------------------
-- scrape staging
-- ---------------------------------------------------------------------------

CREATE TABLE oem_scrape_staging (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year          smallint NOT NULL,
  make          text NOT NULL,
  model         text NOT NULL,
  engine        text,
  source        text NOT NULL,
  raw_payload   jsonb NOT NULL,
  scraped_at    timestamptz NOT NULL DEFAULT now(),
  normalized_at timestamptz
);

CREATE INDEX idx_oem_scrape_vehicle ON oem_scrape_staging (year, make, model);

CREATE TABLE parts_scrape_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid NOT NULL REFERENCES vehicle_taxonomy (id) ON DELETE CASCADE,
  operation_id  uuid NOT NULL REFERENCES service_operations (id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued', 'running', 'done', 'failed')),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz
);

CREATE INDEX idx_parts_scrape_jobs_status ON parts_scrape_jobs (status);

-- ---------------------------------------------------------------------------
-- updated_at helper
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

CREATE TRIGGER trg_shop_config_updated
  BEFORE UPDATE ON shop_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- =============================================================================
-- Tabish Friday Labor — Fluid Capacities & Specifications (additive DDL)
-- Apply after sql/schema.sql. Standalone — no ShopRally CRM / Prisma.
-- vehicle_id uses uuid to match vehicle_taxonomy.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- fluid_categories
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fluid_categories (
  id    serial PRIMARY KEY,
  name  text NOT NULL,
  key   varchar(64) NOT NULL UNIQUE
);

INSERT INTO fluid_categories (name, key) VALUES
  ('Engine Oil', 'ENG_OIL'),
  ('Transmission Fluid', 'ATF'),
  ('Brake Fluid', 'BRAKE_FLUID'),
  ('Coolant', 'COOLANT'),
  ('Power Steering Fluid', 'PS_FLUID'),
  ('Differential Fluid', 'DIFF_FLUID'),
  ('Transfer Case Fluid', 'TC_FLUID'),
  ('Washer Fluid', 'WASHER')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- vehicle_fluid_specs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vehicle_fluid_specs (
  id                 serial PRIMARY KEY,
  vehicle_id         uuid NOT NULL REFERENCES vehicle_taxonomy (id) ON DELETE CASCADE,
  fluid_category_id  integer NOT NULL REFERENCES fluid_categories (id) ON DELETE RESTRICT,
  capacity           numeric(6, 2) NOT NULL CHECK (capacity >= 0),
  capacity_unit      varchar(16) NOT NULL DEFAULT 'qt',
  fluid_type         varchar(160),
  alternative_types  text[] NOT NULL DEFAULT '{}',
  notes              text,
  source             varchar(80),
  confidence         smallint NOT NULL DEFAULT 100 CHECK (confidence BETWEEN 0 AND 100),
  last_verified      timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_vehicle_fluid_specs_cap
    UNIQUE (vehicle_id, fluid_category_id, capacity)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_fluid_specs_vehicle
  ON vehicle_fluid_specs (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_fluid_specs_category
  ON vehicle_fluid_specs (fluid_category_id);

COMMENT ON TABLE vehicle_fluid_specs IS
  'Resolved fluid capacities/types per vehicle. confidence reflects OEM×fluidcapacity merge.';

-- ---------------------------------------------------------------------------
-- owner_manual_urls
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS owner_manual_urls (
  id          serial PRIMARY KEY,
  make        text NOT NULL,
  model       text NOT NULL,
  year_start  smallint NOT NULL CHECK (year_start BETWEEN 1980 AND 2100),
  year_end    smallint NOT NULL CHECK (year_end BETWEEN 1980 AND 2100),
  url_pattern text NOT NULL,
  url         text,
  http_status smallint,
  fetched_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_owner_manual_years CHECK (year_end >= year_start)
);

CREATE INDEX IF NOT EXISTS idx_owner_manual_urls_ymm
  ON owner_manual_urls (make, model, year_start, year_end);

-- ---------------------------------------------------------------------------
-- fluid_scrape_log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fluid_scrape_log (
  id            serial PRIMARY KEY,
  vehicle_id    uuid REFERENCES vehicle_taxonomy (id) ON DELETE SET NULL,
  job_type      varchar(64) NOT NULL,
  status        text NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued', 'running', 'done', 'failed', 'skipped')),
  source        varchar(80),
  detail        jsonb NOT NULL DEFAULT '{}'::jsonb,
  error         text,
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fluid_scrape_log_status ON fluid_scrape_log (status);
CREATE INDEX IF NOT EXISTS idx_fluid_scrape_log_vehicle ON fluid_scrape_log (vehicle_id);

-- ---------------------------------------------------------------------------
-- Staging from fluidcapacity.com (pre-merge)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fluid_capacity_staging (
  id            serial PRIMARY KEY,
  vehicle_id    uuid REFERENCES vehicle_taxonomy (id) ON DELETE CASCADE,
  year          smallint NOT NULL,
  make          text NOT NULL,
  model         text NOT NULL,
  engine        text,
  category_key  varchar(64) NOT NULL,
  capacity      numeric(6, 2),
  capacity_unit varchar(16) NOT NULL DEFAULT 'qt',
  fluid_type    varchar(160),
  notes         text,
  source_url    text,
  raw_row       jsonb NOT NULL DEFAULT '{}'::jsonb,
  scraped_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fluid_capacity_staging_vehicle
  ON fluid_capacity_staging (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_fluid_capacity_staging_ymm
  ON fluid_capacity_staging (year, make, model);

-- ---------------------------------------------------------------------------
-- OEM PDF extraction staging
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fluid_oem_staging (
  id            serial PRIMARY KEY,
  vehicle_id    uuid REFERENCES vehicle_taxonomy (id) ON DELETE CASCADE,
  year          smallint NOT NULL,
  make          text NOT NULL,
  model         text NOT NULL,
  engine        text,
  category_key  varchar(64) NOT NULL,
  capacity      numeric(6, 2),
  capacity_unit varchar(16) NOT NULL DEFAULT 'qt',
  fluid_type    varchar(160),
  alternative_types text[] NOT NULL DEFAULT '{}',
  notes         text,
  source        varchar(80) NOT NULL DEFAULT 'oem_manual',
  pdf_path      text,
  raw_payload   jsonb NOT NULL DEFAULT '{}'::jsonb,
  scraped_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fluid_oem_staging_vehicle ON fluid_oem_staging (vehicle_id);

-- ---------------------------------------------------------------------------
-- Technician discrepancy reports (review tickets)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fluid_discrepancy_reports (
  id                 serial PRIMARY KEY,
  vehicle_id         uuid NOT NULL REFERENCES vehicle_taxonomy (id) ON DELETE CASCADE,
  fluid_category_id  integer REFERENCES fluid_categories (id) ON DELETE SET NULL,
  observed_capacity  numeric(6, 2),
  observed_unit      varchar(16) DEFAULT 'qt',
  observed_type      varchar(160),
  note               text NOT NULL,
  status             text NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_by         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  resolved_at        timestamptz,
  resolution_notes   text
);

CREATE INDEX IF NOT EXISTS idx_fluid_discrepancy_open
  ON fluid_discrepancy_reports (status)
  WHERE status IN ('open', 'reviewing');

-- updated_at trigger for vehicle_fluid_specs
DROP TRIGGER IF EXISTS trg_vehicle_fluid_specs_updated ON vehicle_fluid_specs;
CREATE TRIGGER trg_vehicle_fluid_specs_updated
  BEFORE UPDATE ON vehicle_fluid_specs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- =============================================================================
-- Tabish Friday Labor — Dynamic Job Associations (additive DDL)
-- Adapt: service_operations / vehicle_taxonomy use uuid (not integer).
-- Apply after sql/schema.sql. Standalone lab — not ShopRally CRM Prisma.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- operation_associations  (frequently combined / add-on jobs)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS operation_associations (
  id                      serial PRIMARY KEY,
  primary_operation_id    uuid NOT NULL REFERENCES service_operations (id) ON DELETE CASCADE,
  associated_operation_id uuid NOT NULL REFERENCES service_operations (id) ON DELETE CASCADE,
  association_type        varchar(20) NOT NULL DEFAULT 'add_on'
                          CHECK (association_type IN ('add_on', 'often_with', 'requires')),
  frequency_score         numeric(5, 2) NOT NULL DEFAULT 0
                          CHECK (frequency_score >= 0 AND frequency_score <= 100),
  avg_combined_labor      numeric(5, 2),
  overlap_discount        numeric(5, 2) NOT NULL DEFAULT 0 CHECK (overlap_discount >= 0),
  is_active               boolean NOT NULL DEFAULT true,
  last_updated            timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_operation_associations_pair
    UNIQUE (primary_operation_id, associated_operation_id),
  CONSTRAINT chk_operation_associations_distinct
    CHECK (primary_operation_id <> associated_operation_id)
);

CREATE INDEX IF NOT EXISTS idx_op_assoc_primary_active
  ON operation_associations (primary_operation_id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_op_assoc_associated
  ON operation_associations (associated_operation_id);

COMMENT ON TABLE operation_associations IS
  'MOTOR/ProDemand-style frequently-combined jobs. frequency_score and avg_combined_labor learn from repair_order_lines telemetry.';

-- ---------------------------------------------------------------------------
-- repair_order_lines  (closed-order telemetry for association learning)
-- Groups operations performed together; actual_hours = clocked time.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS repair_order_lines (
  id               serial PRIMARY KEY,
  repair_order_id  uuid NOT NULL,
  vehicle_id       uuid REFERENCES vehicle_taxonomy (id) ON DELETE SET NULL,
  operation_id     uuid REFERENCES service_operations (id) ON DELETE SET NULL,
  technician_id    text,
  actual_hours     numeric(5, 2) CHECK (actual_hours IS NULL OR actual_hours >= 0),
  is_closed        boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  closed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rol_order ON repair_order_lines (repair_order_id);
CREATE INDEX IF NOT EXISTS idx_rol_closed ON repair_order_lines (is_closed) WHERE is_closed;
CREATE INDEX IF NOT EXISTS idx_rol_operation ON repair_order_lines (operation_id);
CREATE INDEX IF NOT EXISTS idx_rol_vehicle ON repair_order_lines (vehicle_id);

COMMENT ON TABLE repair_order_lines IS
  'Lab telemetry for association learning. One row per operation on a closed RO; pair co-occurrence drives frequency_score.';

-- Scratch / staging for learner batch updates (temp-like, persisted for debug)
CREATE TABLE IF NOT EXISTS association_cooccurrence_staging (
  primary_operation_id    uuid NOT NULL,
  associated_operation_id uuid NOT NULL,
  co_count                integer NOT NULL DEFAULT 0,
  primary_appearances     integer NOT NULL DEFAULT 0,
  combined_hours_sum      numeric(12, 3) NOT NULL DEFAULT 0,
  combined_hours_n        integer NOT NULL DEFAULT 0,
  PRIMARY KEY (primary_operation_id, associated_operation_id)
);
