-- MEDPLENI: Atualização de constraints e compatibilidade para Convites & RBAC
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard/project/yfaaiemwzdgvyfnavgxa/sql)

-- 1. Remove restrições herdadas da v1.0 que travam os novos planos (pleno_anual, pleno_mensal, etc.) e papéis
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;

-- 2. Atualiza a trigger handle_new_user para aceitar com segurança qualquer plano e papel
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    plan,
    sub_brand,
    onboarding_completed
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'role', NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'plan', 'diagnostico'),
    COALESCE(NEW.raw_user_meta_data->>'sub_brand', 'RESID'),
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
