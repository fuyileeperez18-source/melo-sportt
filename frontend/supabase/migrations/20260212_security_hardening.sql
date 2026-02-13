-- ===========================================
-- SECURITY HARDENING MIGRATION
-- ===========================================
-- Date: 2026-02-12
-- Purpose: Fix critical security vulnerabilities identified in audit
--
-- IMPORTANT: Review each section before running in production
-- Run this migration in a transaction and test in staging first
-- ===========================================

BEGIN;

-- ===========================================
-- 1. ENABLE RLS ON SENSITIVE TABLES
-- ===========================================
-- These tables were found without RLS enabled

-- Enable RLS on tables that may have been created without it
DO $$
BEGIN
    -- Check and enable RLS on public.users if not already enabled
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on public.users';
    END IF;

    -- Enable RLS on orders
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on public.orders';
    END IF;

    -- Enable RLS on mercadopago_accounts if exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mercadopago_accounts') THEN
        ALTER TABLE public.mercadopago_accounts ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on public.mercadopago_accounts';
    END IF;

    -- Enable RLS on invoices if exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on public.invoices';
    END IF;

    -- Enable RLS on vault.secrets if exists (critical!)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'vault' AND tablename = 'secrets') THEN
        ALTER TABLE vault.secrets ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on vault.secrets';
    END IF;
END $$;

-- ===========================================
-- 2. REVOKE OVERLY PERMISSIVE GRANTS
-- ===========================================
-- The original schema granted ALL to authenticated on ALL tables
-- This is too permissive. We'll revoke and grant specific permissions.

-- Revoke ALL and grant specific permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- ===========================================
-- 3. GRANT SPECIFIC PERMISSIONS PER TABLE
-- ===========================================

-- Public read-only tables (products, categories, etc.)
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT SELECT ON public.store_settings TO anon, authenticated;

-- User-owned tables (require authentication + RLS)
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated;
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.wishlist_items TO authenticated;
GRANT SELECT, INSERT ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT ON public.product_reviews TO authenticated;

-- Admin-only tables
GRANT SELECT ON public.team_members TO authenticated;
GRANT SELECT ON public.commissions TO authenticated;
GRANT SELECT ON public.commission_payments TO authenticated;

-- Sequences (needed for inserts)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ===========================================
-- 4. SECURE SECURITY DEFINER FUNCTIONS
-- ===========================================
-- Revoke execute from PUBLIC on sensitive functions

-- Revoke execute on handle_new_user from public (trigger function)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
        REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC;
        REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon;
        REVOKE EXECUTE ON FUNCTION handle_new_user() FROM authenticated;
        RAISE NOTICE 'Revoked execute on handle_new_user from PUBLIC';
    END IF;
END $$;

-- Grant execute only to service_role for trigger functions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
        -- The trigger will still work because it runs as the function owner
        -- but direct invocation is blocked
        RAISE NOTICE 'handle_new_user secured - only accessible via trigger';
    END IF;
END $$;

-- ===========================================
-- 5. ADD MISSING RLS POLICIES
-- ===========================================

-- Policy for vault.secrets (if table exists) - only service_role should access
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'vault' AND tablename = 'secrets') THEN
        -- Drop existing policies if any
        DROP POLICY IF EXISTS "No public access to secrets" ON vault.secrets;

        -- Create restrictive policy - no one can access via client
        CREATE POLICY "No public access to secrets" ON vault.secrets
            FOR ALL
            USING (false);

        RAISE NOTICE 'Created restrictive policy on vault.secrets';
    END IF;
END $$;

-- Policy for mercadopago_accounts (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mercadopago_accounts') THEN
        -- Only admins can access mercadopago accounts
        DROP POLICY IF EXISTS "Only admins can access mercadopago accounts" ON public.mercadopago_accounts;

        CREATE POLICY "Only admins can access mercadopago accounts" ON public.mercadopago_accounts
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = auth.uid()
                    AND users.role IN ('admin', 'super_admin')
                )
            );

        RAISE NOTICE 'Created admin-only policy on mercadopago_accounts';
    END IF;
END $$;

-- Policy for invoices (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
        DROP POLICY IF EXISTS "Admins can manage all invoices" ON public.invoices;

        -- Users can only see their own invoices
        CREATE POLICY "Users can view own invoices" ON public.invoices
            FOR SELECT
            USING (user_id = auth.uid());

        -- Admins can manage all
        CREATE POLICY "Admins can manage all invoices" ON public.invoices
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = auth.uid()
                    AND users.role IN ('admin', 'super_admin')
                )
            );

        RAISE NOTICE 'Created policies on invoices';
    END IF;
END $$;

-- ===========================================
-- 6. SECURE REALTIME SCHEMA
-- ===========================================
-- Enable RLS on realtime.messages if accessible

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages') THEN
        ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on realtime.messages';
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Cannot modify realtime.messages - requires superuser. Contact Supabase support.';
END $$;

-- ===========================================
-- 7. AUDIT DANGEROUS EXTENSIONS
-- ===========================================
-- This section logs which dangerous extensions are installed
-- You should manually review and disable if not needed

DO $$
DECLARE
    ext_name TEXT;
    dangerous_extensions TEXT[] := ARRAY['http', 'pg_net', 'dblink', 'postgres_fdw', 'file_fdw'];
BEGIN
    FOREACH ext_name IN ARRAY dangerous_extensions
    LOOP
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = ext_name) THEN
            RAISE WARNING 'SECURITY AUDIT: Extension "%" is installed. Review if needed and revoke EXECUTE from untrusted roles.', ext_name;
        END IF;
    END LOOP;
END $$;

-- ===========================================
-- 8. FORCE RLS FOR TABLE OWNERS
-- ===========================================
-- By default, table owners bypass RLS. Force RLS for all tables.

DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', tbl.schemaname, tbl.tablename);
    END LOOP;
    RAISE NOTICE 'Forced RLS on all public tables';
END $$;

-- ===========================================
-- VERIFICATION QUERIES (run after migration)
-- ===========================================
-- Uncomment to verify RLS is enabled on all tables:

-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname IN ('public', 'vault')
-- ORDER BY schemaname, tablename;

-- Check for tables without RLS:
-- SELECT schemaname, tablename
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND rowsecurity = false;

COMMIT;

-- ===========================================
-- POST-MIGRATION CHECKLIST
-- ===========================================
-- 1. [ ] Run verification queries above
-- 2. [ ] Test all user flows (signup, login, orders)
-- 3. [ ] Verify admin panel still works
-- 4. [ ] Check that products are publicly visible
-- 5. [ ] Verify users can only see their own orders
-- 6. [ ] Test that vault.secrets is inaccessible
-- 7. [ ] Review extension warnings and disable unused ones
