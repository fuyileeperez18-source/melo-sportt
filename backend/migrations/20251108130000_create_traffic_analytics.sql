-- Migración para crear tabla de tráfico web y analítica de conversiones

-- Tabla para registrar visitas al sitio
CREATE TABLE IF NOT EXISTS website_traffic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0, -- en segundos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para registrar conversiones y tasas de conversión
CREATE TABLE IF NOT EXISTS conversion_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    total_visits INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0, -- Porcentaje de conversión
    revenue_per_visitor DECIMAL(10,2) DEFAULT 0, -- Ingresos por visitante
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para registrar fuentes de tráfico
CREATE TABLE IF NOT EXISTS traffic_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- direct, referral, organic, paid, social
    visits INTEGER DEFAULT 0,
    orders INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_website_traffic_date ON website_traffic(date);
CREATE INDEX IF NOT EXISTS idx_conversion_tracking_date ON conversion_tracking(date);
CREATE INDEX IF NOT EXISTS idx_traffic_sources_date_type ON traffic_sources(date, source_type);

-- Función para actualizar la tasa de conversión
CREATE OR REPLACE FUNCTION update_conversion_rate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_visits > 0 THEN
        NEW.conversion_rate = (NEW.total_orders::DECIMAL / NEW.total_visits) * 100;
    ELSE
        NEW.conversion_rate = 0;
    END IF;

    NEW.revenue_per_visitor = 0; -- Se calculará desde la lógica de aplicación

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar la tasa de conversión automáticamente
DROP TRIGGER IF EXISTS trigger_update_conversion_rate ON conversion_tracking;
CREATE TRIGGER trigger_update_conversion_rate
    BEFORE INSERT OR UPDATE ON conversion_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_conversion_rate();