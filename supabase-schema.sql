-- Script de configuration finale pour GoldenLudo (Supabase)
-- Ce fichier contient toutes les tables, politiques RLS et triggers optimisés.

-- 1. Création de la table des profils
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  wallet_balance NUMERIC DEFAULT 0,
  bonus_balance NUMERIC DEFAULT 0,
  wagering_requirement NUMERIC DEFAULT 0,
  referred_by UUID REFERENCES public.profiles(id),
  agent_level TEXT DEFAULT 'player', -- 'player', 'silver', 'gold'
  referral_earnings NUMERIC DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Création de la table transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- 'deposit', 'win', 'bet', 'withdraw', 'loss', 'referral_bonus'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_transaction_type CHECK (type IN ('deposit', 'win', 'bet', 'withdraw', 'loss', 'referral_bonus'))
);

-- Index pour un Leaderboard ultra-rapide
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_balance ON public.profiles(wallet_balance DESC);

-- 3. Sécurisation : Activer RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS
DROP POLICY IF EXISTS "Leaderboard public" ON public.profiles;
CREATE POLICY "Leaderboard public" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Les utilisateurs peuvents modifier leur propre profil" ON public.profiles;
CREATE POLICY "Les utilisateurs peuvents modifier leur propre profil" ON public.profiles FOR UPDATE USING ( auth.uid() = id );

DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs transactions" ON public.transactions;
CREATE POLICY "Les utilisateurs peuvent voir leurs transactions" ON public.transactions FOR SELECT USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Les utilisateurs peuvent inserer des transactions" ON public.transactions;
CREATE POLICY "Les utilisateurs peuvent inserer des transactions" ON public.transactions FOR INSERT WITH CHECK ( auth.uid() = user_id );

-- 5. Trigger d'inscription (Gestion robuste des pseudos, parrainage et bonus)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  referrer_id UUID;
  referrer_username TEXT;
BEGIN
  -- 1. Récupérer le code de parrainage (pseudo du parrain) depuis les métadonnées
  referrer_username := new.raw_user_meta_data->>'referral_code';
  
  IF referrer_username IS NOT NULL THEN
    SELECT id INTO referrer_id FROM public.profiles WHERE username = referrer_username;
  END IF;

  -- 2. Création du profil (Bonus de bienvenue réduit à 1€ cash pour limiter les abus)
  INSERT INTO public.profiles (id, username, email, wallet_balance, referred_by, bonus_balance, wagering_requirement)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'Joueur_' || left(new.id::text, 5)),
    new.email,
    0,
    referrer_id,
    0,
    0
  );
  
  -- 3. Créditer le bonus de bienvenue (1€ cash immédiat)
  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (new.id, 1, 'deposit', '🎁 Bonus de bienvenue');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Trigger de transaction (Mise à jour automatique du solde du wallet et bonus)
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS trigger AS $$
BEGIN
  -- 1. Mise à jour du solde total
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + NEW.amount
  WHERE id = NEW.user_id;

  -- 2. Gestion du Bonus et Wagering (10x le montant du bonus)
  IF NEW.description LIKE '%Bonus%' AND NEW.amount > 0 THEN
    UPDATE public.profiles
    SET 
      bonus_balance = bonus_balance + NEW.amount,
      wagering_requirement = wagering_requirement + (NEW.amount * 10)
    WHERE id = NEW.user_id;
  END IF;

  -- 3. Réduction du wagering lors d'un pari (bet)
  IF NEW.type = 'bet' THEN
    UPDATE public.profiles
    SET wagering_requirement = GREATEST(0, wagering_requirement - ABS(NEW.amount))
    WHERE id = NEW.user_id;
  END IF;

  -- 4. Libération du bonus si le wagering est atteint
  UPDATE public.profiles
  SET bonus_balance = 0
  WHERE id = NEW.user_id AND wagering_requirement <= 0;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_transaction_inserted ON public.transactions;
CREATE TRIGGER on_transaction_inserted
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE PROCEDURE public.update_wallet_balance();

-- 7. Fonctions utilitaires pour le parrainage et les agents
CREATE OR REPLACE FUNCTION public.increment_referral_earnings(user_id UUID, amount NUMERIC)
RETURNS void AS $$
DECLARE
  ref_count INTEGER;
BEGIN
  -- 1. Incrémenter les gains de parrainage
  UPDATE public.profiles
  SET referral_earnings = referral_earnings + amount
  WHERE id = user_id;

  -- 2. Vérification et upgrade automatique du niveau d'agent
  SELECT COUNT(*) INTO ref_count FROM public.profiles WHERE referred_by = user_id;

  IF ref_count >= 50 THEN
    UPDATE public.profiles SET agent_level = 'gold' WHERE id = user_id AND agent_level <> 'gold';
  ELSIF ref_count >= 10 THEN
    UPDATE public.profiles SET agent_level = 'silver' WHERE id = user_id AND agent_level NOT IN ('silver', 'gold');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Table des parties
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  players JSONB NOT NULL,
  state JSONB NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  winner TEXT,
  bet_amount NUMERIC DEFAULT 0,
  mode TEXT,
  max_players INTEGER DEFAULT 2,
  participant_ids UUID[] DEFAULT '{}',
  invite_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_game_status CHECK (status IN ('active', 'finished'))
);

CREATE INDEX IF NOT EXISTS idx_games_user_id_status ON public.games(user_id, status);

-- 9. Table du Chat
CREATE TABLE IF NOT EXISTS public.game_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_messages ENABLE ROW LEVEL SECURITY;

-- Politiques Games
DROP POLICY IF EXISTS "Lecture des parties par propriétaire ou via code" ON public.games;
CREATE POLICY "Lecture des parties par propriétaire ou via code" ON public.games FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = ANY(participant_ids) OR (status = 'active' AND invite_code IS NOT NULL));

DROP POLICY IF EXISTS "Les utilisateurs peuvent inserer leurs parties" ON public.games;
CREATE POLICY "Les utilisateurs peuvent inserer leurs parties" ON public.games FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les participants peuvent mettre a jour leurs parties" ON public.games;
CREATE POLICY "Les participants peuvent mettre a jour leurs parties" ON public.games FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = ANY(participant_ids));

-- Politiques Messages
DROP POLICY IF EXISTS "Lecture des messages pour tous" ON public.game_messages;
CREATE POLICY "Lecture des messages pour tous" ON public.game_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insertion des messages par l'auteur" ON public.game_messages;
CREATE POLICY "Insertion des messages par l'auteur" ON public.game_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
