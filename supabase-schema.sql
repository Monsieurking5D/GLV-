-- Script de configuration initiale pour GoldenLudo (Supabase)

-- 1. Création de la table des profils
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  wallet_balance NUMERIC DEFAULT 100, -- Bonus de bienvenue de 100€
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Création de la table transactions
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- 'deposit', 'win', 'bet'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Sécurisation : Activer RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS (Le joueur ne voit que son propre profil et ses transactions)
CREATE POLICY "Les utilisateurs peuvents voir leur propre profil"
ON public.profiles FOR SELECT
USING ( auth.uid() = id );

CREATE POLICY "Les utilisateurs peuvents modifier leur propre profil"
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );

CREATE POLICY "Les utilisateurs peuvent voir leurs transactions"
ON public.transactions FOR SELECT
USING ( auth.uid() = user_id );

CREATE POLICY "Les utilisateurs peuvent inserer des transactions"
ON public.transactions FOR INSERT
WITH CHECK ( auth.uid() = user_id );
