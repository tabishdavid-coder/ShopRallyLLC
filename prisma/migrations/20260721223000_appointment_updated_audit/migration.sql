-- Shop Activity: appointment status / schedule edits as audit events

ALTER TYPE "ShopAuditEventType" ADD VALUE IF NOT EXISTS 'APPOINTMENT_UPDATED';
