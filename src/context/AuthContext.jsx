import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch with retry — le trigger SQL peut être en retard de quelques ms
  const fetchProfile = async (userId, attempt = 1) => {
    if (attempt === 1) setLoading(true);
    const MAX_ATTEMPTS = 5;
    const DELAY_MS = [0, 300, 700, 1500, 3000];

    try {
      setError(null);
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        const isNotFound = profileError.code === 'PGRST116';
        if (isNotFound && attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, DELAY_MS[attempt]));
          return fetchProfile(userId, attempt + 1);
        }
        throw profileError;
      }

      // Performance: On limite aux 50 dernières transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txError) throw txError;
      
      const newProfile = {
        ...userProfile,
        walletBalance: userProfile.wallet_balance,
        bonusBalance: userProfile.bonus_balance || 0,
        wageringRequirement: userProfile.wagering_requirement || 0,
        withdrawableBalance: Math.max(0, (userProfile.wallet_balance || 0) - (userProfile.bonus_balance || 0)),
        gamesPlayed: userProfile.games_played,
        gamesWon: userProfile.games_won,
        transactions: transactions || []
      };
      
      setProfile(newProfile);
      return newProfile;
    } catch (err) {
      console.error("Erreur lors du chargement du profil:", err);
      setError(err.message || "Erreur lors du chargement du profil");
      throw err; // Crucial pour le rollback dans addTransaction
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initialisation
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const storedVersion = localStorage.getItem('app_version');

      // Détection de version pour le futur
      let currentVersion = 'dev';
      try {
        const response = await fetch('/version.json?t=' + Date.now());
        if (response.ok) {
          const data = await response.json();
          currentVersion = data.version;
        }
      } catch (e) {
        console.warn("Version check failed", e);
      }

      // CAS 1 : Session existante mais AUCUN système de version (Transition maintenant)
      // CAS 2 : Version différente détectée (Futurs pushs)
      const isNewSystem = session && !storedVersion;
      const isOutdated = storedVersion && storedVersion !== currentVersion && currentVersion !== 'dev';

      if (isNewSystem || isOutdated) {
        console.log(isNewSystem ? "🆕 Initialisation du système de version..." : "🚀 Mise à jour détectée...");
        localStorage.setItem('app_version', currentVersion);
        if (session) {
          await supabase.auth.signOut();
          window.location.href = '/auth?mode=login&reason=update';
          return;
        }
      }

      // On enregistre la version actuelle si elle manque
      if (!storedVersion) localStorage.setItem('app_version', currentVersion);

      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user.id).catch(() => {});
      } else {
        setLoading(false);
      }
    };

    init();

    // 2. Écouter les changements (connexion, déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT' || _event === 'PASSWORD_RECOVERY') {
        setUser(session?.user || null);
        if (session?.user) {
          fetchProfile(session.user.id).catch(() => {});
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getRedirectUrl = () => {
    // En production sur Vercel, on veut l'URL du site, sinon localhost
    const url = window.location.origin;
    return `${url}/auth?mode=login`;
  };

  const signUp = async (email, password, username, referralCode = '') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getRedirectUrl(),
        data: {
          username: username, // Passé aux meta-données, lu par notre Trigger SQL
          referral_code: referralCode // Ajout du code de parrainage
        }
      }
    });
    if (error) throw error;
    // data.session === null → email de confirmation envoyé par Supabase
    // data.session !== null → Confirm email désactivé, connecté directement
    return { user: data.user, session: data.session };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    
    // Sauvegarde de l'état précédent pour rollback
    const previousProfile = { ...profile };
    
    // Mise à jour optimiste (locale)
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);

    // Mappage des champs camelCase vers snake_case pour SQL
    const dbUpdates = {};
    if (updates.walletBalance !== undefined) dbUpdates.wallet_balance = updates.walletBalance;
    if (updates.gamesPlayed !== undefined) dbUpdates.games_played = updates.gamesPlayed;
    if (updates.gamesWon !== undefined) dbUpdates.games_won = updates.gamesWon;
    
    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', user.id);
      
      if (error) {
        console.error("Erreur lors de la mise à jour du profil:", error);
        setProfile(previousProfile); // Rollback si erreur réseau ou DB
        throw error;
      }
    }
  };

  const addTransaction = async (transaction) => {
    if (!user) return;
    
    // Sauvegarde pour rollback si besoin
    const previousProfile = profile ? { ...profile } : null;

    // Mise à jour optimiste du solde
    if (profile) {
      setProfile({
        ...profile,
        walletBalance: (profile.walletBalance || 0) + transaction.amount
      });
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{ 
          user_id: user.id, 
          amount: transaction.amount, 
          type: transaction.type, 
          description: transaction.description 
        }]);

      if (error) throw error;

      // Crucial: On force le rafraîchissement du profil
      // Si fetchProfile échoue après retries, on rollback car on ne peut pas garantir le solde
      await fetchProfile(user.id);
      
    } catch (err) {
      console.error("Erreur flux transaction:", err);
      if (previousProfile) setProfile(previousProfile); // Rollback
      throw err;
    }
  };

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    addTransaction,
    isAuthenticated: !!user,
  }), [user, profile, loading, error, signUp, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
