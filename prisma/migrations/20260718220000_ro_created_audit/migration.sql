-- Structural audit event when a repair order is created (Activity tab seed entry)

ALTER TYPE "ShopAuditEventType" ADD VALUE IF NOT EXISTS 'RO_CREATED';
