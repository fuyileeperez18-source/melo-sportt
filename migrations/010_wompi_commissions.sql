-- Migration 010: Add Wompi commissions tracking
-- This table will store the 10% commission for the developer/intermediary (Fuyi)

CREATE TABLE IF NOT EXISTS wompi_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    transaction_id VARCHAR(255) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL, -- 10%
    merchant_amount DECIMAL(12,2) NOT NULL,   -- 90%
    status VARCHAR(50) DEFAULT 'pending',     -- pending, paid, cancelled
    fuyi_phone VARCHAR(20) NOT NULL,           -- To identify who gets the commission
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wompi_commissions_order_id ON wompi_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_wompi_commissions_transaction_id ON wompi_commissions(transaction_id);

-- Add comments for documentation
COMMENT ON TABLE wompi_commissions IS 'Stores internal commissions for Wompi payments (10% for the developer).';
COMMENT ON COLUMN wompi_commissions.fuyi_phone IS 'The phone number of the developer/intermediary receiving the commission.';
