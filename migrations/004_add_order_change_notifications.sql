CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION notify_order_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_payload JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    notification_payload = jsonb_build_object(
      'eventId', gen_random_uuid(),
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'occurredAt', CURRENT_TIMESTAMP,
      'orderId', OLD.id,
      'old', to_jsonb(OLD),
      'new', NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    notification_payload = jsonb_build_object(
      'eventId', gen_random_uuid(),
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'occurredAt', CURRENT_TIMESTAMP,
      'orderId', NEW.id,
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
  ELSE
    notification_payload = jsonb_build_object(
      'eventId', gen_random_uuid(),
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'occurredAt', CURRENT_TIMESTAMP,
      'orderId', NEW.id,
      'old', NULL,
      'new', to_jsonb(NEW)
    );
  END IF;

  PERFORM pg_notify('order_changes', notification_payload::TEXT);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_notify_changes ON orders;

CREATE TRIGGER trg_orders_notify_changes
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_change();
