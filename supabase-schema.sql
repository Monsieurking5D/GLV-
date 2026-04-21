-- Script de configuration finale pour GoldenLudo (Supabase)
-- Ce fichier contient toutes les tables, politiques RLS et triggers optimisés.

-- 1. Création de la table des profils
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  wallet_balance NUMERIC DEFAULT 100, -- Solde initial (bonus)
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour un Leaderboard ultra-rapide
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_balance ON public.profiles(wallet_balance DESC);

-- 2. Création de la table transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- 'deposit', 'win', 'bet', 'withdraw'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_transaction_type CHECK (type IN ('deposit', 'win', 'bet', 'withdraw'))
);

-- 3. Sécurisation : Activer RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS
DROP POLICY IF EXISTS "Leaderboard public" ON public.profiles;
CREATE POLICY "Leaderboard public"
ON public.profiles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Les utilisateurs peuvents modifier leur propre profil" ON public.profiles;
CREATE POLICY "Les utilisateurs peuvents modifier leur propre profil"
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );

DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs transactions" ON public.transactions;
CREATE POLICY "Les utilisateurs peuvent voir leurs transactions"
ON public.transactions FOR SELECT
USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Les utilisateurs peuvent inserer des transactions" ON public.transactions;
CREATE POLICY "Les utilisateurs peuvent inserer des transactions"
ON public.transactions FOR INSERT
WITH CHECK ( auth.uid() = user_id );

-- 5. Trigger d'inscription (Gestion robuste des pseudos et bonus)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles with fallback username
  INSERT INTO public.profiles (id, username, email, wallet_balance)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username', 
      split_part(new.email, '@', 1), 
      'player_' || left(new.id::text, 5)
    ),
    new.email,
    0 -- Le wallet démarre à 0 (les 100€ sont crédités par la transaction ci-dessous)
  );
  
  -- Insert welcome transaction (déclenche le trigger de mise à jour du solde)
  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (
    new.id,
    100,
    'deposit',
    '🎁 Bonus de bienvenue'
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exécution du trigger à chaque nouvel utilisateur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Trigger de transaction (Mise à jour automatique du solde du wallet)
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + NEW.amount
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exécution du trigger à chaque insert dans transactions
DROP TRIGGER IF EXISTS on_transaction_inserted ON public.transactions;
CREATE TRIGGER on_transaction_inserted
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE PROCEDURE public.update_wallet_balance();
