// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// ⚠️ Remplacez par vos vraies credentials Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mock auth pour dev sans Supabase configuré
export const isMockMode = !import.meta.env.VITE_SUPABASE_URL;
