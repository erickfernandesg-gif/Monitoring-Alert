-- Ative a extensão PostGIS para funções espaciais
CREATE EXTENSION IF NOT EXISTS postgis;

-- Adicione a coluna location na tabela monitoring_zones
ALTER TABLE public.monitoring_zones ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- Crie um índice espacial GIST para a coluna location
CREATE INDEX IF NOT EXISTS idx_monitoring_zones_location ON public.monitoring_zones USING GIST (location);

-- Crie a função RPC que retorna zonas dentro de um raio de perigo
CREATE OR REPLACE FUNCTION get_zones_in_radius(alert_lat DOUBLE PRECISION, alert_lon DOUBLE PRECISION, radius_km DOUBLE PRECISION)
RETURNS SETOF public.monitoring_zones AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.monitoring_zones
  WHERE active = true AND ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(alert_lon, alert_lat), 4326)::geography,
    radius_km * 1000 -- Convertendo kilômetros em metros
  );
END;
$$ LANGUAGE plpgsql;
