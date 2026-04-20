// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Mock users pour développement sans Supabase
const MOCK_USERS_KEY = 'goldenludo_users';
const MOCK_SESSION_KEY = 'goldenludo_session';

function getMockUsers() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
  } catch { return []; }
}

function saveMockUsers(users) {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_SESSION_KEY) || 'null');
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Charger la session depuis le localStorage
    const session = getSession();
    if (session) {
      setUser(session.user);
      setProfile(session.profile);
    }
    setLoading(false);
  }, []);

  const signUp = async (email, password, username) => {
    const users = getMockUsers();
    const existing = users.find(u => u.email === email);
    if (existing) throw new Error('Cet email est déjà utilisé.');

    const usernameExists = users.find(u => u.username === username);
    if (usernameExists) throw new Error('Ce nom d\'utilisateur est déjà pris.');

    const newUser = {
      id: `user_${Date.now()}`,
      email,
      password, // En production: toujours hasher !
      username,
      createdAt: new Date().toISOString(),
    };

    const newProfile = {
      id: newUser.id,
      username,
      email,
      avatar: username.charAt(0).toUpperCase(),
      walletBalance: 100, // 100€ de bonus de bienvenue
      gamesPlayed: 0,
      gamesWon: 0,
      totalWin: 0,
      transactions: [
        {
          id: `tx_${Date.now()}`,
          type: 'deposit',
          amount: 100,
          description: '🎁 Bonus de bienvenue',
          date: new Date().toISOString(),
        }
      ],
    };

    users.push({ ...newUser, profile: newProfile });
    saveMockUsers(users);

    const session = { user: newUser, profile: newProfile };
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
    setUser(newUser);
    setProfile(newProfile);

    return { user: newUser, profile: newProfile };
  };

  const signIn = async (email, password) => {
    const users = getMockUsers();
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) throw new Error('Email ou mot de passe incorrect.');

    const session = { user: found, profile: found.profile };
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
    setUser(found);
    setProfile(found.profile);

    return session;
  };

  const signOut = () => {
    localStorage.removeItem(MOCK_SESSION_KEY);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = (updates) => {
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);

    // Mettre à jour dans le storage
    const users = getMockUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx].profile = newProfile;
      saveMockUsers(users);
      const session = getSession();
      if (session) {
        localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify({ ...session, profile: newProfile }));
      }
    }
  };

  const addTransaction = (transaction) => {
    const newTransaction = {
      id: `tx_${Date.now()}`,
      date: new Date().toISOString(),
      ...transaction,
    };
    const newTransactions = [newTransaction, ...(profile?.transactions || [])];
    updateProfile({
      transactions: newTransactions,
      walletBalance: (profile?.walletBalance || 0) + transaction.amount,
    });
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
