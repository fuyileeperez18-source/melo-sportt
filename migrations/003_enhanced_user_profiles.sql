-- ============================================
-- MELO SPORTT - ENHANCED USER PROFILES
-- Migration 003: Perfiles mejorados y sistema de comisiones
-- ============================================

-- Agregar nuevos campos al perfil de usuario
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_type VARCHAR(20) CHECK (document_type IN ('cc', 'ce', 'passport', 'nit'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_size VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_shoe_size VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('masculino', 'femenino', 'otro', 'prefiero_no_decir'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Actualizar el constraint de role para incluir 'developer'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'admin', 'super_admin', 'developer'));

-- Tabla para registrar el equipo de la tienda (walmer, fuyi, etc)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  position VARCHAR(100) NOT NULL, -- 'owner', 'developer', 'manager', etc
  commission_percentage DECIMAL(5, 2) DEFAULT 0, -- Porcentaje de comisión (ej: 12.00 = 12%)
  can_manage_products BOOLEAN DEFAULT false,
  can_manage_orders BOOLEAN DEFAULT false,
  can_view_analytics BOOLEAN DEFAULT false,
  can_manage_customers BOOLEAN DEFAULT false,
  can_manage_settings BOOLEAN DEFAULT false,
  can_manage_team BOOLEAN DEFAULT false,
  notes TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Tabla para registrar las comisiones ganadas
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_total DECIMAL(12, 2) NOT NULL,
  commission_percentage DECIMAL(5, 2) NOT NULL,
  commission_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_team_member ON commissions(team_member_id);
CREATE INDEX IF NOT EXISTS idx_commissions_order ON commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions(created_at);

-- Tabla para pagos de comisiones
CREATE TABLE IF NOT EXISTS commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50), -- 'bank_transfer', 'nequi', 'daviplata', 'cash'
  reference_number VARCHAR(100),
  notes TEXT,
  paid_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_payments_team_member ON commission_payments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_created_at ON commission_payments(created_at);

-- Tabla para notificaciones del usuario
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'order', 'commission', 'promotion', 'system'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);

-- Triggers para updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_team_members_updated_at') THEN
        CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_commissions_updated_at') THEN
        CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

-- Función para calcular comisión automáticamente cuando se confirma una orden
CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
DECLARE
    team_member RECORD;
BEGIN
    -- Solo cuando la orden cambia a 'delivered' o 'paid'
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        -- Buscar todos los miembros del equipo con comisión
        FOR team_member IN
            SELECT tm.id, tm.commission_percentage
            FROM team_members tm
            WHERE tm.commission_percentage > 0
        LOOP
            -- Insertar la comisión
            INSERT INTO commissions (
                team_member_id,
                order_id,
                order_total,
                commission_percentage,
                commission_amount,
                status
            ) VALUES (
                team_member.id,
                NEW.id,
                NEW.total,
                team_member.commission_percentage,
                NEW.total * (team_member.commission_percentage / 100),
                'pending'
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para comisiones automáticas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_calculate_commission') THEN
        CREATE TRIGGER trigger_calculate_commission
        AFTER UPDATE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION calculate_order_commission();
    END IF;
END$$;
