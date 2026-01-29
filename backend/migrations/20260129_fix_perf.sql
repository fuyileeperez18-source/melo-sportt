-- Fix performance indexes for conversations, messages, orders
-- Run this in Supabase SQL Editor

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_last ON conversations (user_id, last_message_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conv_created ON messages (conversation_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created ON orders (payment_status, created_at DESC);