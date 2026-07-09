SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'RepairOrder'
  AND column_name IN ('approvalSignerName', 'approvalSignedAt', 'approvalSignatureJson', 'approvalSignatureUrl')
ORDER BY column_name;
