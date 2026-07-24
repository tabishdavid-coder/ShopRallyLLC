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
-- Tabish Friday Labor — Exploded Diagrams + Repair Procedures (additive DDL)
-- Adapt: UUID FKs for service_categories / service_operations / vehicle_taxonomy.
-- =============================================================================

CREATE TABLE IF NOT EXISTS diagrams (
  id            serial PRIMARY KEY,
  category_id   uuid REFERENCES service_categories (id) ON DELETE SET NULL,
  operation_id  uuid REFERENCES service_operations (id) ON DELETE SET NULL,
  vehicle_id    uuid REFERENCES vehicle_taxonomy (id) ON DELETE CASCADE,
  image_url     text NOT NULL,
  local_path    text,
  source        varchar(100),
  caption       text,
  captured_at   timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_diagrams_url_op UNIQUE (operation_id, image_url)
);

CREATE INDEX IF NOT EXISTS idx_diagrams_operation ON diagrams (operation_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_category ON diagrams (category_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_vehicle ON diagrams (vehicle_id);

COMMENT ON TABLE diagrams IS
  'OEM exploded-view illustrations captured from Partsouq / 7zap / RevolutionParts (cached locally).';

CREATE TABLE IF NOT EXISTS procedures (
  id            serial PRIMARY KEY,
  operation_id  uuid NOT NULL REFERENCES service_operations (id) ON DELETE CASCADE,
  vehicle_id    uuid REFERENCES vehicle_taxonomy (id) ON DELETE CASCADE,
  title         varchar(255) NOT NULL,
  steps         jsonb NOT NULL DEFAULT '[]'::jsonb,
  author        varchar(100),
  source        varchar(100) NOT NULL DEFAULT 'scraped'
                CHECK (source IN ('scraped', 'tech_contribution', 'TSB', 'seed')),
  votes         integer NOT NULL DEFAULT 0,
  is_approved   boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procedures_op_vehicle
  ON procedures (operation_id, vehicle_id);

CREATE INDEX IF NOT EXISTS idx_procedures_approved_votes
  ON procedures (is_approved, votes DESC, created_at DESC)
  WHERE is_approved = true;

COMMENT ON TABLE procedures IS
  'Shop procedure KB: scraped DIY + tech contributions. steps = [{step_number, instruction, torque_spec, tool, image_url}].';

CREATE TABLE IF NOT EXISTS procedure_votes (
  id            serial PRIMARY KEY,
  procedure_id  integer NOT NULL REFERENCES procedures (id) ON DELETE CASCADE,
  voter_key     text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_procedure_votes UNIQUE (procedure_id, voter_key)
);

DROP TRIGGER IF EXISTS trg_diagrams_updated ON diagrams;
CREATE TRIGGER trg_diagrams_updated
  BEFORE UPDATE ON diagrams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_procedures_updated ON procedures;
CREATE TRIGGER trg_procedures_updated
  BEFORE UPDATE ON procedures
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
