-- Migration: Add Cash on Delivery Payment Method
-- Date: 2025-12-30
-- Description: Add support for cash on delivery and prepaid payment methods

-- ===========================================
-- UPDATE PAYMENT METHOD OPTIONS
-- ===========================================

-- Add comment to orders table documenting payment methods
COMMENT ON COLUMN orders.payment_method IS 'Payment methods: card, bank_transfer, cash_on_delivery, prepaid, wompi, nequi, daviplata, other';

-- ===========================================
-- ENSURE COMMISSIONS ARE CREATED FOR ALL PAYMENT METHODS
-- ===========================================

-- The existing trigger create_commission_on_delivery() already handles this correctly
-- It creates commissions when order status = 'delivered', regardless of payment method
-- This ensures Fuyi's 12% commission is always recorded

-- ===========================================
-- ADD PAYMENT METHOD VALIDATION
-- ===========================================

-- Optional: Add a check constraint to validate payment methods
-- (Commented out to allow flexibility for future payment methods)
-- ALTER TABLE orders ADD CONSTRAINT valid_payment_methods
-- CHECK (payment_method IN ('card', 'bank_transfer', 'cash_on_delivery', 'prepaid', 'wompi', 'nequi', 'daviplata', 'other'));

-- ===========================================
-- NOTES
-- ===========================================

-- Payment flow for cash_on_delivery:
-- 1. Customer places order with payment_method = 'cash_on_delivery'
-- 2. Order is created with payment_status = 'pending'
-- 3. Admin processes and ships the order (status = 'shipped')
-- 4. When customer receives and pays, admin marks order as 'delivered'
-- 5. Trigger automatically creates commission record for Fuyi (12%)
-- 6. Admin updates payment_status to 'paid' to confirm payment received

-- Payment flow for prepaid:
-- 1. Customer places order with payment_method = 'prepaid' (card, transfer, etc.)
-- 2. Payment is processed immediately
-- 3. Order is created with payment_status = 'paid'
-- 4. Admin processes and ships the order
-- 5. When delivered, trigger creates commission for Fuyi (12%)

-- The commission system ensures that Fuyi ALWAYS gets 12% commission
-- when orders are marked as delivered, regardless of payment method.
