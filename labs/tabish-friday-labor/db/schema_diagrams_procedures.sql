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
