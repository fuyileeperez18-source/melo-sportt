-- Migration to create analytics tables used by AnalyticsService

-- Table: analytics_sales_by_month
CREATE TABLE IF NOT EXISTS analytics_sales_by_month (
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    active_products INTEGER DEFAULT 0,
    total_products INTEGER DEFAULT 0,
    PRIMARY KEY (year, month)
);

-- Table: analytics_product_performance
CREATE TABLE IF NOT EXISTS analytics_product_performance (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_sales DECIMAL(15, 2) DEFAULT 0,
    total_quantity INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    PRIMARY KEY (product_id, year, month)
);

-- Table: analytics_category_performance
CREATE TABLE IF NOT EXISTS analytics_category_performance (
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_sales DECIMAL(15, 2) DEFAULT 0,
    total_quantity INTEGER DEFAULT 0,
    total_products INTEGER DEFAULT 0,
    PRIMARY KEY (category_id, year, month)
);

-- Table: analytics_user_stats
CREATE TABLE IF NOT EXISTS analytics_user_stats (
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    new_users INTEGER DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    active_orders INTEGER DEFAULT 0,
    PRIMARY KEY (year, month)
);

-- Table: analytics_payment_methods
CREATE TABLE IF NOT EXISTS analytics_payment_methods (
    payment_method VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    PRIMARY KEY (payment_method, year, month)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_sales_date ON analytics_sales_by_month(year, month);
CREATE INDEX IF NOT EXISTS idx_analytics_product_perf_date ON analytics_product_performance(year, month);
CREATE INDEX IF NOT EXISTS idx_analytics_product_perf_sales ON analytics_product_performance(total_sales DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_category_perf_date ON analytics_category_performance(year, month);
CREATE INDEX IF NOT EXISTS idx_analytics_user_stats_date ON analytics_user_stats(year, month);
CREATE INDEX IF NOT EXISTS idx_analytics_payment_date ON analytics_payment_methods(year, month);
