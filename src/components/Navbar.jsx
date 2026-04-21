// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Navbar.css';

export default function Navbar() {
  const { user, profile, signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fermer le menu mobile si on repasse sur un écran large
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [menuOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      setDropdownOpen(false);
    } catch (err) {
      console.error('Erreur lors de la déconnexion', err);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => navigate('/')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/')} aria-label="Accueil">
          <div className="logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="10" fill="url(#logoGrad)"/>
              <circle cx="12" cy="12" r="4" fill="#0A0A1A"/>
              <circle cx="28" cy="12" r="4" fill="#0A0A1A"/>
              <circle cx="12" cy="28" r="4" fill="#0A0A1A"/>
              <circle cx="28" cy="28" r="4" fill="#0A0A1A"/>
              <rect x="16" y="18" width="8" height="4" rx="2" fill="#0A0A1A"/>
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
                  <stop stopColor="#F5C518"/>
                  <stop offset="1" stopColor="#E8A800"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="logo-text">Golden<span>Ludo</span></span>
        </div>

        {/* Desktop Nav */}
        <div className="navbar-links">
          {isAuthenticated && (
            <>
              <button
                className={`nav-link ${isActive('/lobby') ? 'active' : ''}`}
                onClick={() => navigate('/lobby')}
              >
                🎮 Jouer
              </button>
              <button
                className={`nav-link ${isActive('/leaderboard') ? 'active' : ''}`}
                onClick={() => navigate('/leaderboard')}
              >
                🏆 Classement
              </button>
            </>
          )}
        </div>

        {/* Right side */}
        <div className="navbar-right">
          {isAuthenticated ? (
            <>
              {/* Wallet */}
              <div className="wallet-pill" onClick={() => navigate('/lobby')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/lobby')} aria-label="Mon portefeuille">
                <span className="wallet-icon">💰</span>
                <span className="wallet-amount">
                  {(profile?.walletBalance || 0).toFixed(2)}€
                </span>
              </div>

              {/* User dropdown */}
              <div className="user-dropdown">
                <button
                  className="user-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  id="user-menu-btn"
                >
                  <div className="user-avatar">
                    {profile?.avatar || profile?.username?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="user-name">
                    {profile?.username || 'Joueur'}
                  </span>
                  <span className={`chevron ${dropdownOpen ? 'open' : ''}`}>▼</span>
                </button>

                {dropdownOpen && (
                  <div className="dropdown-menu" id="user-dropdown-menu">
                    <div className="dropdown-header">
                      <strong>{profile?.username}</strong>
                      <span>{profile?.email || user?.email}</span>
                    </div>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item" onClick={() => { navigate('/profile'); setDropdownOpen(false); }}>
                      🎮 Mon Profil
                    </button>
                    <button className="dropdown-item" onClick={() => { navigate('/profile'); setDropdownOpen(false); }}>
                      📊 Statistiques
                    </button>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item danger" onClick={handleSignOut}>
                      🚪 Se Déconnecter
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth?mode=login')}>
                Connexion
              </button>
              <button className="btn btn-gold btn-sm" onClick={() => navigate('/auth?mode=register')}>
                S'inscrire
              </button>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            className={`hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            id="mobile-menu-btn"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {isAuthenticated ? (
            <>
              <button className="mobile-nav-link" onClick={() => { navigate('/lobby'); setMenuOpen(false); }}>
                🎮 Jouer
              </button>
              <button className="mobile-nav-link" onClick={() => { navigate('/leaderboard'); setMenuOpen(false); }}>
                🏆 Classement
              </button>
              <button className="mobile-nav-link danger" onClick={handleSignOut}>
                🚪 Déconnexion
              </button>
            </>
          ) : (
            <>
              <button className="mobile-nav-link" onClick={() => { navigate('/auth?mode=login'); setMenuOpen(false); }}>
                Connexion
              </button>
              <button className="mobile-nav-link" onClick={() => { navigate('/auth?mode=register'); setMenuOpen(false); }}>
                S'inscrire
              </button>
            </>
          )}
        </div>
      )}

      {/* Overlay to close dropdown */}
      {dropdownOpen && (
        <div className="nav-overlay" onClick={() => setDropdownOpen(false)} />
      )}
    </nav>
  );
}
