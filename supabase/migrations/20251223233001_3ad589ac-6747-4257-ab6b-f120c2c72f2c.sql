-- Criar tabela de pacientes
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  birth_date DATE NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública (sistema hospitalar interno)
CREATE POLICY "Permitir leitura de pacientes" 
ON public.patients 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Política para permitir inserção
CREATE POLICY "Permitir inserção de pacientes" 
ON public.patients 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Política para permitir atualização
CREATE POLICY "Permitir atualização de pacientes" 
ON public.patients 
FOR UPDATE 
TO anon, authenticated
USING (true);

-- Política para permitir exclusão
CREATE POLICY "Permitir exclusão de pacientes" 
ON public.patients 
FOR DELETE 
TO anon, authenticated
USING (true);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();