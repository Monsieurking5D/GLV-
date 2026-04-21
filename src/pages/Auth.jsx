// src/pages/Auth.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Auth.css';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('mode') || 'login');
  const [formData, setFormData] = useState({ email: '', password: '', username: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const { signIn, signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/lobby');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setMode(searchParams.get('mode') || 'login');
    setError('');
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  // Table de traduction des messages d'erreur Supabase
  const translateError = (msg = '') => {
    if (msg.includes('User already registered') || msg.includes('already registered'))
      return 'Un compte existe déjà avec cette adresse email. Connectez-vous !';
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
      return 'Email ou mot de passe incorrect.';
    if (msg.includes('Email rate limit exceeded') || msg.includes('rate limit'))
      return 'Trop de tentatives. Veuillez patienter quelques minutes.';
    if (msg.includes('Password should be at least'))
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    if (msg.includes('Unable to validate email address'))
      return 'Adresse email invalide.';
    if (msg.includes('Email not confirmed'))
      return 'Vous devez confirmer votre email avant de vous connecter. Vérifiez votre boîte mail.';
    if (msg.includes('Failed to fetch') || msg.includes('fetch'))
      return 'Impossible de joindre le serveur. Vérifiez votre connexion internet.';
    return msg || 'Une erreur est survenue. Réessayez.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Nettoyage des inputs avant traitement
    const email = formData.email.trim().toLowerCase();
    const username = formData.username.trim();
    const { password, confirmPassword } = formData;

    try {
      if (mode === 'register') {
        // Validation username robuste sur la valeur nettoyée
        if (!username || username.length < 3) {
          throw new Error('Le nom d\'utilisateur doit faire au moins 3 caractères.');
        }
        if (username.length > 30) {
          throw new Error('Le nom d\'utilisateur ne peut pas dépasser 30 caractères.');
        }
        if (!/^[a-zA-Z0-9_\-]+$/.test(username)) {
          throw new Error('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, _ et -');
        }
        if (password.length < 6) {
          throw new Error('Le mot de passe doit faire au moins 6 caractères.');
        }
        if (password !== confirmPassword) {
          throw new Error('Les mots de passe ne correspondent pas.');
        }
        const { session } = await signUp(email, password, username);
        if (!session) {
          setRegisteredEmail(email);
          setEmailSent(true);
          return;
        }
        // session !== null → connecté directement (confirm email désactivé)
        // La navigation est gérée par le useEffect isAuthenticated ci-dessus
      } else {
        await signIn(email, password);
        // La navigation vers /lobby est gérée par le useEffect isAuthenticated
      }
    } catch (err) {
      setError(translateError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    const newMode = mode === 'login' ? 'register' : 'login';
    navigate(`/auth?mode=${newMode}`);
    setFormData({ email: '', password: '', username: '', confirmPassword: '' });
    setError('');
  };

  // ── Écran "Vérifiez vos emails" ──────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="auth-page">
        <div className="auth-bg">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
        </div>
        <div className="auth-container">
          <div className="auth-card animate-fade-in-up" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>📧</div>
            <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)' }}>
              Vérifiez vos emails !
            </h1>
            <p style={{ marginBottom: 'var(--space-6)' }}>
              Un lien de confirmation a été envoyé à{' '}
              <strong style={{ color: 'var(--gold-primary)' }}>{registeredEmail}</strong>.
              <br /><br />
              Cliquez sur le lien dans l'email pour activer votre compte et recevoir vos <strong>100€ de bonus</strong> 🎁
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              Pensez à vérifier vos spams si vous ne recevez rien dans quelques minutes.
            </p>
            <button
              className="btn btn-ghost w-full"
              onClick={() => navigate('/auth?mode=login')}
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Background */}
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-grid" />
      </div>

      <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo" onClick={() => navigate('/')}>
          <span className="auth-logo-icon">🎲</span>
          <span className="auth-logo-text">Golden<span>Ludo</span></span>
        </div>

        {/* Card */}
        <div className="auth-card animate-fade-in-up">
          {/* Header */}
          <div className="auth-card-header">
            <h1>{mode === 'login' ? 'Bon retour !' : 'Rejoindre l\'aventure'}</h1>
            <p>
              {mode === 'login'
                ? 'Connectez-vous pour retrouver vos parties et votre solde.'
                : 'Créez votre compte et recevez 100€ de bonus de bienvenue 🎁'
              }
            </p>
          </div>

          {/* Bonus banner (register only) */}
          {mode === 'register' && (
            <div className="bonus-banner">
              <span>🎁</span>
              <div>
                <strong>Bonus de bienvenue</strong>
                <span>100€ offerts à l'inscription</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit} id="auth-form">
            {mode === 'register' && (
              <div className="input-group">
                <label htmlFor="username">Nom d'utilisateur</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="input"
                  placeholder="MonPseudo123"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  minLength={3}
                  autoComplete="username"
                />
              </div>
            )}

            <div className="input-group">
              <label htmlFor="email">Adresse email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                placeholder="vous@exemple.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Mot de passe</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder={mode === 'register' ? 'Minimum 6 caractères' : '••••••••'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="input-group">
                <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="auth-error">
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-gold w-full"
              style={{ height: 52, fontSize: 'var(--text-lg)' }}
              disabled={loading}
              id="auth-submit-btn"
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  Chargement...
                </>
              ) : (
                mode === 'login' ? '🔑 Se Connecter' : '🎲 Créer mon compte'
              )}
            </button>
          </form>

          {/* Mode switch */}
          <div className="auth-switch">
            {mode === 'login' ? (
              <>
                Pas encore de compte ?{' '}
                <button className="auth-link" onClick={switchMode} id="switch-to-register">
                  S'inscrire gratuitement
                </button>
              </>
            ) : (
              <>
                Déjà un compte ?{' '}
                <button className="auth-link" onClick={switchMode} id="switch-to-login">
                  Se connecter
                </button>
              </>
            )}
          </div>

          {/* Demo credentials */}
          {mode === 'login' && (
            <div className="demo-hint">
              <p>💡 Compte démo disponible après inscription</p>
            </div>
          )}
        </div>

        <p className="auth-disclaimer">
          En vous inscrivant, vous acceptez nos{' '}
          <span className="auth-link-inline">Conditions d'utilisation</span>{' '}
          et notre politique de{' '}
          <span className="auth-link-inline">Jeu responsable</span>.
        </p>
      </div>
    </div>
  );
}
