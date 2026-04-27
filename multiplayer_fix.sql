-- Correction des politiques RLS pour le Multi-joueur
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Permettre à tout le monde de voir les parties actives (Publiques et Privées)
DROP POLICY IF EXISTS "Lecture des parties par propriétaire ou via code" ON public.games;
CREATE POLICY "Lecture des parties actives pour tous"
ON public.games FOR SELECT
USING (status = 'active' OR auth.uid() = user_id OR auth.uid() = ANY(participant_ids));

-- 2. Permettre aux joueurs de rejoindre une partie (Mise à jour de participant_ids et players)
-- On autorise l'UPDATE si la partie est active et n'est pas pleine.
DROP POLICY IF EXISTS "Les participants peuvent mettre a jour leurs parties" ON public.games;
CREATE POLICY "Autoriser le join et la mise à jour par les participants"
ON public.games FOR UPDATE
USING (
  status = 'active' -- Permet de rejoindre une partie active
  OR auth.uid() = user_id 
  OR auth.uid() = ANY(participant_ids)
);

-- 3. S'assurer que les colonnes nécessaires existent (au cas où fix_games_table.sql n'a pas été exécuté)
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 2;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS participant_ids UUID[] DEFAULT '{}';

-- 4. Index pour optimiser la recherche
CREATE INDEX IF NOT EXISTS idx_games_status_is_private ON public.games(status, is_private);
