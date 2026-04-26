// src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Lobby from './pages/Lobby.jsx';
import Game from './pages/Game.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Legal from './pages/Legal.jsx';
import Contact from './pages/Contact.jsx';
import Profile from './pages/Profile.jsx';
import Stats from './pages/Stats.jsx';
import VersionChecker from './components/VersionChecker.jsx';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        background: 'var(--bg-deep)',
      }}>
        <div className="spinner" style={{ width: 48, height: 48 }} />
        <p style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif' }}>
          Chargement...
        </p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/auth?mode=login" replace />;
}

function AppRoutes() {
  const { isAuthenticated, signOut } = useAuth();

  // Système de déconnexion automatique à la fermeture de l'onglet
  // Uniquement si l'utilisateur n'est PAS dans une partie en cours
  useEffect(() => {
    const handleBeforeUnload = () => {
      const isGamePage = window.location.pathname === '/game';
      if (isAuthenticated && !isGamePage) {
        // On tente une déconnexion rapide
        signOut();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAuthenticated, signOut]);

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/auth"
          element={isAuthenticated ? <Navigate to="/lobby" replace /> : <Auth />}
        />
        <Route
          path="/lobby"
          element={
            <PrivateRoute>
              <Lobby />
            </PrivateRoute>
          }
        />
        <Route
          path="/game"
          element={
            <PrivateRoute>
              <Game />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/stats"
          element={
            <PrivateRoute>
              <Stats />
            </PrivateRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <PrivateRoute>
              <Leaderboard />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <VersionChecker />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
