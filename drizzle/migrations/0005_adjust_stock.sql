CREATE OR REPLACE FUNCTION public.adjust_stock(p_product_id uuid, p_new_stock numeric, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_old numeric; v_name text; v_delta numeric;
BEGIN
  IF p_new_stock IS NULL OR p_new_stock < 0 THEN RAISE EXCEPTION 'Stock invalide'; END IF;
  SELECT stock, name INTO v_old, v_name FROM products WHERE id = p_product_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  v_delta := round(p_new_stock - v_old, 2);
  IF v_delta = 0 THEN RETURN jsonb_build_object('delta', 0); END IF;
  UPDATE products SET stock = round(p_new_stock, 2) WHERE id = p_product_id;
  INSERT INTO stock_movements(product_id, quantity_delta, type, reference_type, reference_id, note)
  VALUES (p_product_id, v_delta, 'adjustment', 'product', p_product_id, COALESCE(NULLIF(p_reason,''), 'Correction manuelle'));
  INSERT INTO activity_log(type, description, reference_type, reference_id, status)
  VALUES ('stock_adjustment', 'Correction stock ' || v_name || ' : ' || v_old || ' → ' || round(p_new_stock,2) || COALESCE(' (' || NULLIF(p_reason,'') || ')', ''), 'product', p_product_id, 'completed');
  RETURN jsonb_build_object('delta', v_delta, 'old', v_old, 'new', round(p_new_stock,2));
END $$;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, numeric, text) TO authenticated;