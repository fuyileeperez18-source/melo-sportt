-- ===========================================
-- SECURITY HARDENING MIGRATION V2
-- ===========================================
-- Date: 2026-02-12
-- Purpose: Fix remaining security issues from audit
--
-- This migration addresses:
-- 1. Fix invoices RLS policy (was using non-existent user_id column)
-- 2. Add search_path to functions (prevent schema injection)
-- 3. Enable RLS on remaining tables
-- 4. Add missing policies for additional tables
-- ===========================================

BEGIN;

-- ===========================================
-- 1. FIX INVOICES RLS POLICY
-- ===========================================
-- The previous migration incorrectly used user_id which doesn't exist
-- invoices relates to users through orders.user_id

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        -- Drop the incorrect policies
        DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;

        -- Create correct policy using join through orders
        CREATE POLICY "Users can view own invoices" ON public.invoices
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM orders
                    WHERE orders.id = invoices.order_id
                    AND orders.user_id = auth.uid()
                )
            );

        -- Grant SELECT to authenticated users (RLS will filter)
        GRANT SELECT ON public.invoices TO authenticated;

        RAISE NOTICE 'Fixed invoices RLS policy';
    END IF;
END $$;

-- ===========================================
-- 2. ENABLE RLS ON REMAINING TABLES
-- ===========================================
-- Tables reported without RLS in the audit

DO $$
DECLARE
    tables_to_enable TEXT[] := ARRAY[
        'user_notifications',
        'reviews',
        'traffic_analytics',
        'website_traffic',
        'conversion_tracking',
        'traffic_sources',
        'mercadopago_commissions',
        'wompi_commissions',
        'whatsapp_orders',
        'whatsapp_conversations',
        'analytics_sales_by_month',
        'analytics_product_performance',
        'analytics_user_stats',
        'analytics_category_performance',
        'analytics_payment_methods',
        'messages'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables_to_enable
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
            RAISE NOTICE 'RLS enabled on public.%', tbl;
        END IF;
    END LOOP;
END $$;

-- ===========================================
-- 3. ADD POLICIES FOR TABLES WITHOUT POLICIES
-- ===========================================

-- Messages table (different from chat_messages)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
        DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
        DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;

        -- Users can view messages in their own conversations
        CREATE POLICY "Users can view own messages" ON public.messages
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM conversations
                    WHERE conversations.id = messages.conversation_id
                    AND (conversations.user_id = auth.uid() OR conversations.assigned_admin_id = auth.uid())
                )
            );

        -- Users can send messages to their own conversations
        CREATE POLICY "Users can send messages" ON public.messages
            FOR INSERT
            WITH CHECK (
                sender_id = auth.uid() AND
                EXISTS (
                    SELECT 1 FROM conversations
                    WHERE conversations.id = messages.conversation_id
                    AND (conversations.user_id = auth.uid() OR conversations.assigned_admin_id = auth.uid())
                )
            );

        -- Admins can view all messages
        CREATE POLICY "Admins can view all messages" ON public.messages
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = auth.uid()
                    AND users.role IN ('admin', 'super_admin')
                )
            );

        GRANT SELECT, INSERT ON public.messages TO authenticated;
        RAISE NOTICE 'Created policies on messages';
    END IF;
END $$;

-- WhatsApp orders (admin only)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'whatsapp_orders') THEN
        DROP POLICY IF EXISTS "Admins can manage whatsapp orders" ON public.whatsapp_orders;

        CREATE POLICY "Admins can manage whatsapp orders" ON public.whatsapp_orders
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = auth.uid()
                    AND users.role IN ('admin', 'super_admin')
                )
            );

        GRANT SELECT, INSERT, UPDATE ON public.whatsapp_orders TO authenticated;
        RAISE NOTICE 'Created policy on whatsapp_orders';
    END IF;
END $$;

-- WhatsApp conversations (admin only)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'whatsapp_conversations') THEN
        DROP POLICY IF EXISTS "Admins can manage whatsapp conversations" ON public.whatsapp_conversations;

        CREATE POLICY "Admins can manage whatsapp conversations" ON public.whatsapp_conversations
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = auth.uid()
                    AND users.role IN ('admin', 'super_admin')
                )
            );

        GRANT SELECT, INSERT, UPDATE ON public.whatsapp_conversations TO authenticated;
        RAISE NOTICE 'Created policy on whatsapp_conversations';
    END IF;
END $$;

-- Analytics tables (admin read-only)
DO $$
DECLARE
    analytics_tables TEXT[] := ARRAY[
        'analytics_sales_by_month',
        'analytics_product_performance',
        'analytics_user_stats',
        'analytics_category_performance',
        'analytics_payment_methods',
        'traffic_analytics',
        'website_traffic',
        'conversion_tracking',
        'traffic_sources'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY analytics_tables
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('DROP POLICY IF EXISTS "Admins can view %I" ON public.%I', tbl, tbl);
            EXECUTE format(
                'CREATE POLICY "Admins can view %I" ON public.%I FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM users
                        WHERE users.id = auth.uid()
                        AND users.role IN (''admin'', ''super_admin'')
                    )
                )', tbl, tbl
            );
            EXECUTE format('GRANT SELECT ON public.%I TO authenticated', tbl);
            RAISE NOTICE 'Created admin-only policy on %', tbl;
        END IF;
    END LOOP;
END $$;

-- User notifications
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_notifications') THEN
        DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
        DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;

        CREATE POLICY "Users can view own notifications" ON public.user_notifications
            FOR SELECT
            USING (user_id = auth.uid());

        CREATE POLICY "Users can update own notifications" ON public.user_notifications
            FOR UPDATE
            USING (user_id = auth.uid());

        GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
        RAISE NOTICE 'Created policies on user_notifications';
    END IF;
END $$;

-- Reviews table (if different from product_reviews)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reviews') THEN
        DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
        DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
        DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;

        CREATE POLICY "Anyone can view reviews" ON public.reviews
            FOR SELECT
            USING (true);

        CREATE POLICY "Users can create reviews" ON public.reviews
            FOR INSERT
            WITH CHECK (user_id = auth.uid());

        CREATE POLICY "Users can update own reviews" ON public.reviews
            FOR UPDATE
            USING (user_id = auth.uid());

        GRANT SELECT ON public.reviews TO anon, authenticated;
        GRANT INSERT, UPDATE ON public.reviews TO authenticated;
        RAISE NOTICE 'Created policies on reviews';
    END IF;
END $$;

-- Commission tables (payment providers)
DO $$
DECLARE
    commission_tables TEXT[] := ARRAY['mercadopago_commissions', 'wompi_commissions'];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY commission_tables
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('DROP POLICY IF EXISTS "Admins can manage %I" ON public.%I', tbl, tbl);
            EXECUTE format(
                'CREATE POLICY "Admins can manage %I" ON public.%I FOR ALL USING (
                    EXISTS (
                        SELECT 1 FROM users
                        WHERE users.id = auth.uid()
                        AND users.role IN (''admin'', ''super_admin'')
                    )
                )', tbl, tbl
            );
            EXECUTE format('GRANT SELECT ON public.%I TO authenticated', tbl);
            RAISE NOTICE 'Created admin-only policy on %', tbl;
        END IF;
    END LOOP;
END $$;

-- ===========================================
-- 4. SECURE FUNCTIONS WITH FIXED SEARCH_PATH
-- ===========================================
-- Recreate functions with SET search_path to prevent schema injection

-- update_conversation_last_message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.conversations
    SET
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- mark_messages_as_read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS INTEGER
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.messages
    SET
        is_read = true,
        read_at = NOW()
    WHERE
        conversation_id = p_conversation_id
        AND sender_id != p_user_id
        AND is_read = false;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- get_unread_messages_count
CREATE OR REPLACE FUNCTION get_unread_messages_count(p_user_id UUID)
RETURNS INTEGER
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND role IN ('admin', 'super_admin')) THEN
        SELECT COUNT(*)
        INTO unread_count
        FROM public.messages m
        INNER JOIN public.conversations c ON m.conversation_id = c.id
        WHERE m.sender_id != p_user_id
            AND m.is_read = false;
    ELSE
        SELECT COUNT(*)
        INTO unread_count
        FROM public.messages m
        INNER JOIN public.conversations c ON m.conversation_id = c.id
        WHERE c.user_id = p_user_id
            AND m.sender_id != p_user_id
            AND m.is_read = false;
    END IF;

    RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- assign_support_request
CREATE OR REPLACE FUNCTION assign_support_request(
    p_conversation_id UUID,
    p_admin_id UUID
)
RETURNS public.conversations
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    updated_conversation public.conversations;
BEGIN
    UPDATE public.conversations
    SET
        assigned_admin_id = p_admin_id,
        status = 'active',
        updated_at = NOW()
    WHERE id = p_conversation_id
        AND is_support_request = true
    RETURNING * INTO updated_conversation;

    RETURN updated_conversation;
END;
$$ LANGUAGE plpgsql;

-- resolve_support_request
CREATE OR REPLACE FUNCTION resolve_support_request(
    p_conversation_id UUID,
    p_admin_id UUID
)
RETURNS public.conversations
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    updated_conversation public.conversations;
BEGIN
    UPDATE public.conversations
    SET
        status = 'resolved',
        resolved_at = NOW(),
        resolved_by = p_admin_id,
        updated_at = NOW()
    WHERE id = p_conversation_id
        AND is_support_request = true
    RETURNING * INTO updated_conversation;

    RETURN updated_conversation;
END;
$$ LANGUAGE plpgsql;

-- get_support_request_stats
CREATE OR REPLACE FUNCTION get_support_request_stats()
RETURNS TABLE (
    total_pending BIGINT,
    total_active BIGINT,
    total_resolved_today BIGINT,
    by_type JSONB
)
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.conversations WHERE is_support_request = true AND status = 'pending')::BIGINT as total_pending,
        (SELECT COUNT(*) FROM public.conversations WHERE is_support_request = true AND status = 'active')::BIGINT as total_active,
        (SELECT COUNT(*) FROM public.conversations WHERE is_support_request = true AND status = 'resolved' AND resolved_at >= CURRENT_DATE)::BIGINT as total_resolved_today,
        (
            SELECT jsonb_object_agg(COALESCE(problem_type, 'unknown'), cnt)
            FROM (
                SELECT problem_type, COUNT(*) as cnt
                FROM public.conversations
                WHERE is_support_request = true AND status IN ('pending', 'active')
                GROUP BY problem_type
            ) sub
        )::JSONB as by_type;
END;
$$ LANGUAGE plpgsql;

-- update_updated_at_column (from schema.sql)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- generate_order_number (from schema.sql)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.order_number = 'WLM-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- update_product_quantity (from schema.sql)
CREATE OR REPLACE FUNCTION update_product_quantity()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE public.product_variants SET quantity = quantity - NEW.quantity WHERE id = NEW.variant_id;
  ELSE
    UPDATE public.products SET quantity = quantity - NEW.quantity WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- handle_new_user needs SECURITY DEFINER to access auth.users
-- But we can still set search_path
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Revoke execute on SECURITY DEFINER function from public
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM authenticated;

-- WhatsApp functions (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_whatsapp_order_number') THEN
        CREATE OR REPLACE FUNCTION generate_whatsapp_order_number()
        RETURNS TRIGGER
        SECURITY INVOKER
        SET search_path = public, pg_temp
        AS $func$
        BEGIN
            NEW.order_number := 'WA-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
                LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
                      FROM public.whatsapp_orders WHERE order_number LIKE 'WA-' || to_char(NOW(), 'YYYYMMDD') || '-%')::TEXT, 4, '0');
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
        RAISE NOTICE 'Secured generate_whatsapp_order_number';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_whatsapp_order_timestamp') THEN
        CREATE OR REPLACE FUNCTION update_whatsapp_order_timestamp()
        RETURNS TRIGGER
        SECURITY INVOKER
        SET search_path = public, pg_temp
        AS $func$
        BEGIN
            NEW.updated_at := NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
        RAISE NOTICE 'Secured update_whatsapp_order_timestamp';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_whatsapp_conversation_timestamp') THEN
        CREATE OR REPLACE FUNCTION update_whatsapp_conversation_timestamp()
        RETURNS TRIGGER
        SECURITY INVOKER
        SET search_path = public, pg_temp
        AS $func$
        BEGIN
            NEW.updated_at := NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
        RAISE NOTICE 'Secured update_whatsapp_conversation_timestamp';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_invoices_updated_at') THEN
        CREATE OR REPLACE FUNCTION update_invoices_updated_at()
        RETURNS TRIGGER
        SECURITY INVOKER
        SET search_path = public, pg_temp
        AS $func$
        BEGIN
            NEW.updated_at := NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
        RAISE NOTICE 'Secured update_invoices_updated_at';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_order_commission') THEN
        CREATE OR REPLACE FUNCTION calculate_order_commission()
        RETURNS TRIGGER
        SECURITY INVOKER
        SET search_path = public, pg_temp
        AS $func$
        DECLARE
            team_rec RECORD;
        BEGIN
            -- Find team member for this order's user
            FOR team_rec IN
                SELECT tm.id, tm.commission_percentage
                FROM public.team_members tm
                WHERE tm.user_id = NEW.user_id AND tm.commission_percentage > 0
            LOOP
                INSERT INTO public.commissions (
                    team_member_id,
                    order_id,
                    order_total,
                    commission_percentage,
                    commission_amount,
                    status
                ) VALUES (
                    team_rec.id,
                    NEW.id,
                    NEW.total,
                    team_rec.commission_percentage,
                    NEW.total * (team_rec.commission_percentage / 100),
                    'pending'
                );
            END LOOP;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
        RAISE NOTICE 'Secured calculate_order_commission';
    END IF;
END $$;

-- ===========================================
-- 5. SECURE pending_support_requests VIEW
-- ===========================================
-- The view is not SECURITY DEFINER (good), but let's ensure
-- it can only be accessed by admins via RLS on underlying tables

-- Grant SELECT only to authenticated (RLS on conversations will filter)
GRANT SELECT ON pending_support_requests TO authenticated;

-- Revoke from anon
REVOKE SELECT ON pending_support_requests FROM anon;

-- ===========================================
-- 6. ADD INDEX FOR RLS PERFORMANCE
-- ===========================================
-- RLS policies using auth.uid() comparisons benefit from indexes

DO $$
BEGIN
    -- Index on orders.user_id (likely exists but ensure)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_user_id_rls') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id_rls ON public.orders(user_id);
    END IF;

    -- Index on messages.conversation_id for RLS joins
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_conversation_id_rls') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_id_rls ON public.messages(conversation_id);
    END IF;

    -- Index on conversations for RLS
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversations_user_admin_rls') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_admin_rls ON public.conversations(user_id, assigned_admin_id);
    END IF;
END $$;

COMMIT;

-- ===========================================
-- VERIFICATION QUERIES (run after migration)
-- ===========================================
-- Check all public tables have RLS enabled:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check functions have search_path set:
-- SELECT proname, prosecdef, proconfig FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proconfig IS NOT NULL;

-- ===========================================
-- POST-MIGRATION CHECKLIST
-- ===========================================
-- 1. [ ] Verify invoices are accessible to order owners
-- 2. [ ] Test admin can access whatsapp_orders
-- 3. [ ] Test analytics tables are admin-only
-- 4. [ ] Verify messages are accessible in conversations
-- 5. [ ] Test support request functions still work
-- 6. [ ] Rotate mercadopago tokens if potentially exposed
