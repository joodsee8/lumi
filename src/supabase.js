import { createClient } from '@supabase/supabase-js'
// La llave "publishable" es segura en el frontend: los permisos los controla RLS en la base de datos.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)
