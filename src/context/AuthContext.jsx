import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch with retry — le trigger SQL peut être en retard de quelques ms
  const fetchProfile = async (userId, attempt = 1) => {
    const MAX_ATTEMPTS = 5;
    const DELAY_MS = [0, 300, 700, 1500, 3000]; // backoff progressif

    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        // PGRST116 = "No rows found" → le trigger n'a pas encore créé la ligne
        const isNotFound = profileError.code === 'PGRST116';
        if (isNotFound && attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, DELAY_MS[attempt]));
          return fetchProfile(userId, attempt + 1);
        }
        throw profileError;
      }

      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      setProfile({
        ...userProfile,
        walletBalance: userProfile.wallet_balance,
        gamesPlayed: userProfile.games_played,
        gamesWon: userProfile.games_won,
        transactions: transactions || []
      });
    } catch (error) {
      console.error("Erreur lors du chargement du profil:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initialisation
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Écouter les changements (connexion, déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
        setUser(session?.user || null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          username: username, // Passé aux meta-données, lu par notre Trigger SQL
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
      }
    }
  };

  const addTransaction = async (transaction) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ 
        user_id: user.id, 
        amount: transaction.amount, 
        type: transaction.type, 
        description: transaction.description 
      }])
      .select()
      .single();

    if (error) {
      console.error("Erreur ajout transaction:", error);
      throw error;
    }

    // Rafraîchir les données
    await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile,
      addTransaction,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
