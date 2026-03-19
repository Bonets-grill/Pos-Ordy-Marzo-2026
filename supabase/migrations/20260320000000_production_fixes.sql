ALTER TABLE wa_sessions DROP CONSTRAINT IF EXISTS wa_sessions_state_check;
ALTER TABLE wa_sessions ADD CONSTRAINT wa_sessions_state_check CHECK (state IN ('idle','browsing_menu','ordering','confirming_order','checking_status','reserving','awaiting_pickup_confirmation'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check CHECK (order_type IN ('dine_in','takeaway','delivery','qr','whatsapp'));

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'menu_ads') THEN
    DROP POLICY IF EXISTS "Tenant users manage own ads" ON menu_ads;
    EXECUTE 'CREATE POLICY "Tenant users manage own ads" ON menu_ads FOR ALL USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())) WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()))';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usage_counters') THEN
    DROP POLICY IF EXISTS "Tenant sees own usage" ON usage_counters;
    EXECUTE 'CREATE POLICY "Tenant sees own usage" ON usage_counters FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()))';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_daily') THEN
    DROP POLICY IF EXISTS "Tenant sees own analytics" ON analytics_daily;
    EXECUTE 'CREATE POLICY "Tenant sees own analytics" ON analytics_daily FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()))';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION recalculate_order_totals(p_order_id uuid)
RETURNS void AS $$
DECLARE
  v_subtotal numeric; v_tax_rate numeric; v_tax_included boolean;
  v_tax numeric; v_total numeric; v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM orders WHERE id = p_order_id;
  SELECT COALESCE(tax_rate,10), COALESCE(tax_included,true) INTO v_tax_rate, v_tax_included FROM tenants WHERE id = v_tenant_id;
  SELECT COALESCE(SUM(subtotal),0) INTO v_subtotal FROM order_items WHERE order_id = p_order_id AND voided = false;
  IF v_tax_included THEN v_tax := 0; ELSE v_tax := ROUND(v_subtotal * v_tax_rate / 100, 2); END IF;
  v_total := v_subtotal + v_tax;
  UPDATE orders SET subtotal=v_subtotal, tax_amount=v_tax, total=v_total - discount_amount + tip_amount, updated_at=now() WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
