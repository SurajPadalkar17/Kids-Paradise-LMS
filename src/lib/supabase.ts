import { supabase } from "@/integrations/supabase/client";

export { supabase };

export type UserRole = 'admin' | 'student';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  grade: number | null;
  created_at: string;
  updated_at: string;
}
