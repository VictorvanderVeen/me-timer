-- First, let's update the existing tables to be user-specific by adding user_id references

-- Add user_id column to klanten table
ALTER TABLE public.klanten ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to uren table  
ALTER TABLE public.uren ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for klanten table to be user-specific
DROP POLICY IF EXISTS "Allow all delete on klanten" ON public.klanten;
DROP POLICY IF EXISTS "Allow all insert on klanten" ON public.klanten;
DROP POLICY IF EXISTS "Allow all select on klanten" ON public.klanten;
DROP POLICY IF EXISTS "Allow all update on klanten" ON public.klanten;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.klanten;

CREATE POLICY "Users can view their own clients" 
ON public.klanten 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients" 
ON public.klanten 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" 
ON public.klanten 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" 
ON public.klanten 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update RLS policies for uren table to be user-specific
DROP POLICY IF EXISTS "Allow all delete on uren" ON public.uren;
DROP POLICY IF EXISTS "Allow all insert on uren" ON public.uren;
DROP POLICY IF EXISTS "Allow all select on uren" ON public.uren;
DROP POLICY IF EXISTS "Allow all update on uren" ON public.uren;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.uren;

CREATE POLICY "Users can view their own time records" 
ON public.uren 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own time records" 
ON public.uren 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time records" 
ON public.uren 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time records" 
ON public.uren 
FOR DELETE 
USING (auth.uid() = user_id);