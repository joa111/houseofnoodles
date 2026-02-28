-- Create user_roles table to map auth.users to a specific role
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read only their own role
CREATE POLICY "Users can read own role" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- NOTE: To give a user the admin role, you should run an INSERT query manually, for example:
-- INSERT INTO public.user_roles (user_id, role) VALUES ('<their-uuid>', 'admin');
