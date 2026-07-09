-- Phase 2 legal: DPA, Payment Addendum, SMS Addendum agreement types
ALTER TYPE "AgreementType" ADD VALUE IF NOT EXISTS 'DPA';
ALTER TYPE "AgreementType" ADD VALUE IF NOT EXISTS 'PAYMENT_ADDENDUM';
ALTER TYPE "AgreementType" ADD VALUE IF NOT EXISTS 'SMS_ADDENDUM';
