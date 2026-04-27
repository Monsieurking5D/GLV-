-- Migration pour ajouter les colonnes manquantes à la table 'games'
-- À exécuter dans l'éditeur SQL de Supabase

ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS invite_code TEXT,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES auth.users(id);

-- Index pour accélérer la recherche par code d'invitation
CREATE INDEX IF NOT EXISTS idx_games_invite_code ON public.games(invite_code) WHERE status = 'active';

-- Mise à jour des politiques RLS pour inclure le code d'invitation si nécessaire
DROP POLICY IF EXISTS "Lecture des parties par propriétaire ou via code" ON public.games;
CREATE POLICY "Lecture des parties par propriétaire ou via code"
  ON public.games FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = ANY(participant_ids) OR (status = 'active' AND invite_code IS NOT NULL));
