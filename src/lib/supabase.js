// src/lib/supabase.js
// Cliente único do Supabase, lido das variáveis de ambiente (.env).
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anon);

if (!supabaseConfigured) {
  console.warn("Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no .env");
}

// URL de placeholder evita que createClient() quebre o carregamento do app
// quando as variáveis de ambiente ainda não foram configuradas.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anon || "placeholder-anon-key"
);
