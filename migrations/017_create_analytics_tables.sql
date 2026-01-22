
-- Crear tabla de analítica de ventas por mes
CREATE TABLE IF NOT EXISTS analytics_sales_by_month (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  active_products INTEGER NOT NULL DEFAULT 0,
  total_products INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de analítica de productos
CREATE TABLE IF NOT EXISTS analytics_product_performance (
  id SERIAL PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_sales DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de analítica de usuarios
CREATE TABLE IF NOT EXISTS analytics_user_stats (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  new_users INTEGER NOT NULL DEFAULT 0,
  total_users INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  active_orders INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de analítica de categorías
CREATE TABLE IF NOT EXISTS analytics_category_performance (
  id SERIAL PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES categories(id) ON UPDATE CASCADE ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_sales DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  total_products INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de analítica de métodos de pago
CREATE TABLE IF NOT EXISTS analytics_payment_methods (
  id SERIAL PRIMARY KEY,
  payment_method VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de analítica de tráfico
CREATE TABLE IF NOT EXISTS traffic_analytics (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255),
    path VARCHAR(255),
    visits INTEGER DEFAULT 0,
    date DATE
);


-- Crear índices para mejorar el rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_analytics_sales_by_month_year_month ON analytics_sales_by_month (year, month);
CREATE INDEX IF NOT EXISTS idx_analytics_product_performance_product_id_year_month ON analytics_product_performance (product_id, year, month);
CREATE INDEX IF NOT EXISTS idx_analytics_user_stats_year_month ON analytics_user_stats (year, month);
CREATE INDEX IF NOT EXISTS idx_analytics_category_performance_category_id_year_month ON analytics_category_performance (category_id, year, month);
CREATE INDEX IF NOT EXISTS idx_analytics_payment_methods_payment_method_year_month ON analytics_payment_methods (payment_method, year, month);
