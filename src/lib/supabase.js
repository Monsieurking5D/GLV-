// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// ⚠️ Remplacez par vos vraies credentials Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mock auth pour dev sans Supabase configuré
export const isMockMode = !import.meta.env.VITE_SUPABASE_URL;
