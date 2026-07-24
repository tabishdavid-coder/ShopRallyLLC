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
