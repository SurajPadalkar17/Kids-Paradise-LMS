-- Allow service role to bypass RLS for profiles table
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- Create a new insert policy that allows service role to insert profiles
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Create a policy that allows admins to insert student profiles
CREATE POLICY "Admins can insert student profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) AND 
    (role = 'student')
  );

-- Ensure the service role can update profiles
CREATE POLICY "Service role can update profiles"
  ON public.profiles FOR UPDATE
  USING (auth.role() = 'service_role');

-- Ensure the service role can select profiles
CREATE POLICY "Service role can select profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'service_role');
