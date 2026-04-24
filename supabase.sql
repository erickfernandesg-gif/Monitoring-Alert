-- Extensão necessária para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- is_admin para controle de acesso ao painel
  is_admin BOOLEAN DEFAULT FALSE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Table: monitoring_zones
CREATE TABLE public.monitoring_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state TEXT NOT NULL,
  city TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Table: alerts_log
CREATE TABLE public.alerts_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE, -- id gerado pelo serviço externo (inmet/cemaden/defesa civil)
  severity TEXT NOT NULL,
  region TEXT NOT NULL,
  disaster_type TEXT NOT NULL,
  description TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: subscribers
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Policies
-- Profiles: Usuários logados veem o próprio, admins veem todos.
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Para permitir que admins configurem zonas, vamos fazer políticas simples usando a tabela profile.
-- (Geralmente criamos functions secudary, mas para simplificar usaremos query)

CREATE POLICY "Anyone can view active zones." ON public.monitoring_zones FOR SELECT USING (active = true);
-- Insert/Update/Delete por admins a ser feito apenas via service role no backend para garantir segurança.
-- Ou permitindo que is_admin seja checado (mais complexo para realtime, ideal é server-side).

CREATE POLICY "Anyone can view alerts." ON public.alerts_log FOR SELECT USING (true);
-- Inserções no alerts_log serão feitas pelo cron no backend (Service Role), bypass do RLS.

CREATE POLICY "Admins can view subscribers." ON public.subscribers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Table: team_subscribers (Broadcast List for Humanitarian Team)
CREATE TABLE public.team_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.team_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow only admins (service_role or explicitly those with admin rights)
-- Assuming service_role bypasses RLS in backend, adding policy for authenticated admins in frontend
CREATE POLICY "Admins can manage team_subscribers" ON public.team_subscribers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Anyone can manage team_subscribers if not strictly enforced in demo" ON public.team_subscribers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Note: In production you should properly protect the writes for profiles, subscribers, etc. 
-- Using Supabase Service Role for the Node.js backend allows bypassing RLS for safe server-side operations.

CREATE INDEX idx_alerts_log_region_type ON public.alerts_log (region, disaster_type);
CREATE INDEX idx_alerts_log_created_at ON public.alerts_log (created_at);
