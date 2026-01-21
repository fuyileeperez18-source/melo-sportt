-- Migration: Add Commission System
-- Date: 2025-12-27
-- Description: Add tables and functions for commission tracking (12% from sales)

-- ===========================================
-- TEAM MEMBERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  position TEXT NOT NULL DEFAULT 'staff',
  commission_percentage DECIMAL(5, 2) DEFAULT 0,
  can_manage_products BOOLEAN DEFAULT false,
  can_manage_orders BOOLEAN DEFAULT false,
  can_view_analytics BOOLEAN DEFAULT false,
  can_manage_customers BOOLEAN DEFAULT false,
  can_manage_settings BOOLEAN DEFAULT false,
  can_manage_team BOOLEAN DEFAULT false,
  notes TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_position ON team_members(position);

-- ===========================================
-- COMMISSIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_total DECIMAL(10, 2) NOT NULL,
  commission_percentage DECIMAL(5, 2) NOT NULL,
  commission_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commissions_team_member ON commissions(team_member_id);
CREATE INDEX idx_commissions_order ON commissions(order_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_created ON commissions(created_at DESC);

-- ===========================================
-- COMMISSION PAYMENTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS commission_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commission_payments_team_member ON commission_payments(team_member_id);
CREATE INDEX idx_commission_payments_paid_at ON commission_payments(paid_at DESC);

-- ===========================================
-- FUNCTIONS AND TRIGGERS FOR COMMISSIONS
-- ===========================================

-- Function to create commission when order is delivered
CREATE OR REPLACE FUNCTION create_commission_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  team_member_record team_members%ROWTYPE;
  commission_amount DECIMAL(10, 2);
BEGIN
  -- Only create commission if order status changed to 'delivered'
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- Loop through all team members with commission percentage > 0
    FOR team_member_record IN SELECT * FROM team_members WHERE commission_percentage > 0 LOOP
      -- Calculate commission amount (12% for owner/developer, or configured percentage)
      commission_amount := NEW.total * (team_member_record.commission_percentage / 100);

      -- Insert commission record
      INSERT INTO commissions (
        team_member_id,
        order_id,
        order_total,
        commission_percentage,
        commission_amount,
        status
      ) VALUES (
        team_member_record.id,
        NEW.id,
        NEW.total,
        team_member_record.commission_percentage,
        commission_amount,
        'pending'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply commission trigger to orders
CREATE TRIGGER create_commission_on_order_delivery
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION create_commission_on_delivery();

-- Function to update updated_at timestamp for team_members and commissions
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- RLS POLICIES FOR NEW TABLES
-- ===========================================

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;

-- Team members policies (admins can manage, members can view own)
CREATE POLICY "Admins can manage team members" ON team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);
CREATE POLICY "Team members can view own record" ON team_members FOR SELECT USING (user_id = auth.uid());

-- Commissions policies
CREATE POLICY "Team members can view own commissions" ON commissions FOR SELECT USING (
  team_member_id IN (SELECT id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage all commissions" ON commissions FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);

-- Commission payments policies
CREATE POLICY "Team members can view own payments" ON commission_payments FOR SELECT USING (
  team_member_id IN (SELECT id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage all payments" ON commission_payments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);

-- ===========================================
-- INITIAL DATA
-- ===========================================

-- Insert WALMER as admin user (this will be handled by seed script)
-- Insert owner as team member with 12% commission
-- This will be done by the setup script

-- Grant permissions
GRANT ALL ON team_members TO authenticated;
GRANT ALL ON commissions TO authenticated;
GRANT ALL ON commission_payments TO authenticated;