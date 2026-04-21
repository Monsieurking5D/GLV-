// src/pages/Auth.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import './Auth.css';

// Mots de passe triviaux interdits
const WEAK_PASSWORDS = ['123456', '123456789', 'password', 'password1', 'azerty', 'qwerty', '000000', 'abc123'];

// Force du mot de passe : 0=vide, 1=faible, 2=moyen, 3=fort
function getPasswordStrength(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  if (score <= 1) return 1;
  if (score <= 3) return 2;
  return 3;
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('mode') || 'login');
  const [formData, setFormData] = useState({ email: '', password: '', username: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const isSubmitting = useRef(false); // guard anti double-clic
  const { signIn, signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/lobby');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setMode(searchParams.get('mode') || 'login');
    setError('');
    setShowReset(false);
    setResetSent(false);
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
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError'))
      return 'Impossible de joindre le serveur. Vérifiez votre connexion internet.';
    return msg || 'Une erreur est survenue. Réessayez.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Guard anti double-clic : bloqué jusqu'au prochain rendu
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setError('');
    setLoading(true);

    const email = formData.email.trim().toLowerCase();
    const username = formData.username.trim();
    const { password, confirmPassword } = formData;

    try {
      if (mode === 'register') {
        if (!username || username.length < 3)
          throw new Error("Le nom d'utilisateur doit faire au moins 3 caractères.");
        if (username.length > 30)
          throw new Error("Le nom d'utilisateur ne peut pas dépasser 30 caractères.");
        if (!/^[a-zA-Z0-9_\-]+$/.test(username))
          throw new Error("Le nom d'utilisateur ne peut contenir que des lettres, chiffres, _ et -");
        if (password.length < 8)
          throw new Error('Le mot de passe doit faire au moins 8 caractères.');
        if (WEAK_PASSWORDS.includes(password.toLowerCase()))
          throw new Error('Ce mot de passe est trop courant. Choisissez-en un plus robuste.');
        if (password !== confirmPassword)
          throw new Error('Les mots de passe ne correspondent pas.');

        const { session } = await signUp(email, password, username);
        if (!session) {
          setRegisteredEmail(email);
          setEmailSent(true);
          return;
        }
        // La navigation est gérée par le useEffect isAuthenticated
      } else {
        await signIn(email, password);
        // La navigation est gérée par le useEffect isAuthenticated
      }
    } catch (err) {
      setError(translateError(err.message));
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth?mode=login`,
    });
    setLoading(false);
    if (error) {
      setError(translateError(error.message));
    } else {
      setResetSent(true);
    }
  };

  const switchMode = () => {
    const newMode = mode === 'login' ? 'register' : 'login';
    navigate(`/auth?mode=${newMode}`);
    setFormData({ email: '', password: '', username: '', confirmPassword: '' });
    setError('');
  };

  const pwdStrength = getPasswordStrength(formData.password);
  const strengthLabel = ['', 'Faible', 'Moyen', 'Fort'];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#10B981'];

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
            <p style={{ marginBottom: 'var(--space-4)' }}>
              Un lien de confirmation a été envoyé à{' '}
              <strong style={{ color: 'var(--gold-primary)' }}>{registeredEmail}</strong>.
            </p>
            <p style={{ marginBottom: 'var(--space-6)' }}>
              Cliquez sur le lien dans l'email pour activer votre compte et recevoir vos <strong>100€ de bonus</strong> 🎁
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              💡 Pensez à vérifier vos spams si vous ne recevez rien dans quelques minutes.
            </p>
            <button className="btn btn-ghost w-full" onClick={() => navigate('/auth?mode=login')}>
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Écran "Mot de passe oublié" ───────────────────────────────────────────
  if (showReset) {
    return (
      <div className="auth-page">
        <div className="auth-bg">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
        </div>
        <div className="auth-container">
          <button
            className="auth-logo"
            onClick={() => navigate('/')}
            aria-label="Retour à l'accueil"
          >
            <span className="auth-logo-icon">🎲</span>
            <span className="auth-logo-text">Golden<span>Ludo</span></span>
          </button>
          <div className="auth-card animate-fade-in-up" style={{ textAlign: 'center' }}>
            {resetSent ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>✅</div>
                <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)' }}>Email envoyé !</h1>
                <p style={{ marginBottom: 'var(--space-6)' }}>
                  Si un compte existe pour <strong style={{ color: 'var(--gold-primary)' }}>{resetEmail}</strong>, vous recevrez un lien de réinitialisation.
                </p>
                <button className="btn btn-ghost w-full" onClick={() => navigate('/auth?mode=login')}>
                  Retour à la connexion
                </button>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)' }}>
                  Mot de passe oublié ?
                </h1>
                <p style={{ marginBottom: 'var(--space-6)' }}>
                  Entrez votre adresse email et nous vous enverrons un lien de réinitialisation.
                </p>
                {error && <div className="auth-error" role="alert">⚠️ {error}</div>}
                <form onSubmit={handlePasswordReset} style={{ textAlign: 'left' }}>
                  <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
                    <label htmlFor="reset-email">Adresse email</label>
                    <input
                      id="reset-email"
                      type="email"
                      className="input"
                      placeholder="vous@exemple.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-gold w-full"
                    style={{ height: 52, fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}
                    disabled={loading}
                  >
                    {loading ? 'Envoi...' : '📧 Envoyer le lien'}
                  </button>
                  <button type="button" className="btn btn-ghost w-full" onClick={() => setShowReset(false)}>
                    Annuler
                  </button>
                </form>
              </>
            )}
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
        {/* Logo — sémantique button pour accessibilité clavier */}
        <button
          className="auth-logo"
          onClick={() => navigate('/')}
          aria-label="Retour à l'accueil GoldenLudo"
        >
          <span className="auth-logo-icon">🎲</span>
          <span className="auth-logo-text">Golden<span>Ludo</span></span>
        </button>

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
          <form className="auth-form" onSubmit={handleSubmit} id="auth-form" aria-describedby={error ? 'auth-error-msg' : undefined}>
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
                  maxLength={30}
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
                  placeholder={mode === 'register' ? 'Minimum 8 caractères' : '••••••••'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={mode === 'register' ? 8 : 6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {/* Indicateur de force du mot de passe */}
              {mode === 'register' && formData.password && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= pwdStrength ? strengthColor[pwdStrength] : 'var(--border-subtle)',
                        transition: 'background 0.3s'
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: strengthColor[pwdStrength] }}>
                    Force : {strengthLabel[pwdStrength]}
                  </span>
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div className="input-group">
                <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
                <div className="password-wrapper">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="input"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Masquer' : 'Afficher la confirmation'}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            )}

            {/* Error — lié au formulaire via aria-describedby */}
            {error && (
              <div className="auth-error" id="auth-error-msg" role="alert" aria-live="assertive">
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

          {/* Mot de passe oublié (login only) */}
          {mode === 'login' && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
              <button
                className="auth-link"
                onClick={() => { setShowReset(true); setResetEmail(formData.email); setError(''); }}
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

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
        </div>

        <p className="auth-disclaimer">
          En vous inscrivant, vous acceptez nos{' '}
          <button className="auth-link-inline" onClick={() => navigate('/legal')}>Conditions d'utilisation</button>{' '}
          et notre politique de{' '}
          <button className="auth-link-inline" onClick={() => navigate('/legal')}>Jeu responsable</button>.
        </p>
      </div>
    </div>
  );
}
