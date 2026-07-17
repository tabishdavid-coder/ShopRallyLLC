-- Shop audit event when staff log RO activity (note / call / email)

ALTER TYPE "ShopAuditEventType" ADD VALUE IF NOT EXISTS 'RO_ACTIVITY_ADDED';
