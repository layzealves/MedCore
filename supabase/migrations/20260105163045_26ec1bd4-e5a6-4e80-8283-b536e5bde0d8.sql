-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can delete avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars');

-- Create user profiles table
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT 'Administrador do Sistema',
  role TEXT NOT NULL DEFAULT 'Administrador',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth yet)
CREATE POLICY "Permitir leitura de perfis"
ON public.user_profiles
FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção de perfis"
ON public.user_profiles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização de perfis"
ON public.user_profiles
FOR UPDATE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default profile
INSERT INTO public.user_profiles (full_name, role, email, phone)
VALUES ('Administrador do Sistema', 'Administrador', 'admin@hospitalcentral.com.br', '(11) 98765-4321');