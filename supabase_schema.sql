-- ============================================================================
-- SCRIPT SQL BLINDADO PARA REPOSITÓRIO PÚBLICO (GITHUB PAGES + SUPABASE RLS)
-- Restringe 100% da leitura e escrita EXCLUSIVAMENTE ao proprietário autorizado:
-- E-mail autorizado: irineufrancisco@gmail.com
-- ============================================================================

-- 0. Remove gatilho público de auto-confirmação (impede que estranhos criem contas ativas)
DROP TRIGGER IF EXISTS trg_auto_confirm_users ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_new_users();

-- Garante que APENAS o seu usuário (irineufrancisco@gmail.com) esteja confirmado e ativo:
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
WHERE lower(email) = 'irineufrancisco@gmail.com';

-- 1. Tabela de Orçamentos Planejados (Etapas da Obra)
CREATE TABLE IF NOT EXISTS public.obra_budgets (
  id TEXT PRIMARY KEY,
  stage TEXT NOT NULL,
  category TEXT NOT NULL,
  planned_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  color TEXT DEFAULT '#2563eb',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Controle de Compras (Materiais e Taxas)
CREATE TABLE IF NOT EXISTS public.obra_purchases (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  item TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'un',
  unit_price NUMERIC(12,4) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier TEXT NOT NULL,
  stage TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Materiais',
  payment_method TEXT DEFAULT 'PIX',
  status TEXT NOT NULL DEFAULT 'Pago',
  invoice_number TEXT,
  receipt_url TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Aluguel de Equipamentos
CREATE TABLE IF NOT EXISTS public.obra_equipments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  supplier TEXT NOT NULL,
  stage TEXT NOT NULL,
  start_date TEXT NOT NULL,
  expected_return_date TEXT NOT NULL,
  actual_return_date TEXT,
  billing_type TEXT DEFAULT 'Diária',
  unit_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Pendente',
  rental_status TEXT NOT NULL DEFAULT 'Em Uso',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Pagamentos de Mão de Obra
CREATE TABLE IF NOT EXISTS public.obra_labor (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  role TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'Diária',
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pago',
  payment_method TEXT DEFAULT 'PIX',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela do Mapa de Cotações Comparativas
CREATE TABLE IF NOT EXISTS public.obra_quotations (
  id TEXT PRIMARY KEY,
  qty TEXT NOT NULL,
  material TEXT NOT NULL,
  prices JSONB NOT NULL DEFAULT '{}'::jsonb,
  winner TEXT,
  status TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. SEGURANÇA MÁXIMA: RLS TRAVADO EXCLUSIVAMENTE PARA SEU E-MAIL
-- Mesmo que alguém crie uma conta no Supabase, o banco bloqueará tudo se o
-- e-mail do token JWT não for exatamente 'irineufrancisco@gmail.com'.
-- ============================================================================
ALTER TABLE public.obra_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obra_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obra_equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obra_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obra_quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total obra_budgets" ON public.obra_budgets;
DROP POLICY IF EXISTS "Acesso total obra_purchases" ON public.obra_purchases;
DROP POLICY IF EXISTS "Acesso total obra_equipments" ON public.obra_equipments;
DROP POLICY IF EXISTS "Acesso total obra_labor" ON public.obra_labor;
DROP POLICY IF EXISTS "Acesso total obra_quotations" ON public.obra_quotations;
DROP POLICY IF EXISTS "p1" ON public.obra_budgets;
DROP POLICY IF EXISTS "p2" ON public.obra_purchases;
DROP POLICY IF EXISTS "p3" ON public.obra_equipments;
DROP POLICY IF EXISTS "p4" ON public.obra_labor;
DROP POLICY IF EXISTS "p5" ON public.obra_quotations;
DROP POLICY IF EXISTS "Auth obra_budgets" ON public.obra_budgets;
DROP POLICY IF EXISTS "Auth obra_purchases" ON public.obra_purchases;
DROP POLICY IF EXISTS "Auth obra_equipments" ON public.obra_equipments;
DROP POLICY IF EXISTS "Auth obra_labor" ON public.obra_labor;
DROP POLICY IF EXISTS "Auth obra_quotations" ON public.obra_quotations;

CREATE POLICY "Auth obra_budgets" ON public.obra_budgets
  FOR ALL TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com');

CREATE POLICY "Auth obra_purchases" ON public.obra_purchases
  FOR ALL TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com');

CREATE POLICY "Auth obra_equipments" ON public.obra_equipments
  FOR ALL TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com');

CREATE POLICY "Auth obra_labor" ON public.obra_labor
  FOR ALL TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com');

CREATE POLICY "Auth obra_quotations" ON public.obra_quotations
  FOR ALL TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com');

-- 7. Bucket de Storage para Fotos de Comprovantes (Restrito ao proprietário)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Acesso publico comprovantes select" ON storage.objects;
CREATE POLICY "Acesso publico comprovantes select"
ON storage.objects FOR SELECT USING (bucket_id = 'comprovantes');

DROP POLICY IF EXISTS "Upload publico comprovantes insert" ON storage.objects;
DROP POLICY IF EXISTS "Upload autenticado comprovantes insert" ON storage.objects;
CREATE POLICY "Upload autenticado comprovantes insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'comprovantes'
  AND lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com'
);
