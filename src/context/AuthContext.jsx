import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fonction pour récupérer le profil et historique des transactions depuis Supabase
  const fetchProfile = async (userId) => {
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;

      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      // Adapter les noms de colonnes SQL (snake_case) vers le camelCase utilisé dans le front-end
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
      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username, // Passé aux meta-données, lu par notre Trigger SQL
        }
      }
    });
    if (error) throw error;
    return { user: data.user, profile: null };
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
