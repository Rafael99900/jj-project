// src/lib/supabase.js
// Cliente único do Supabase, lido das variáveis de ambiente (.env).
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn("Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no .env");
}

export const supabase = createClient(url, anon);
