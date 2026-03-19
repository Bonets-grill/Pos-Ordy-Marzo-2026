ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE payments
  ADD CONSTRAINT payments_method_check
  CHECK (method IN ('cash', 'card', 'stripe', 'transfer', 'other', 'refund'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_completed_per_order
  ON payments (order_id)
  WHERE status = 'completed' AND method != 'refund';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency
  ON orders (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
