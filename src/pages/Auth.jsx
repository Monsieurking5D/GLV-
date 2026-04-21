// src/pages/Auth.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import './Auth.css';

// ── CONSTANTES & UTILS ───────────────────────────────────────────────────────
const WEAK_PASSWORDS = ['123456', '123456789', 'password', 'password1', 'azerty', 'qwerty', '000000', 'abc123'];

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

const translateError = (msg = '') => {
  if (msg.includes('User already registered')) return 'Un compte existe déjà avec cet email.';
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (msg.includes('Email rate limit exceeded')) return 'Trop de tentatives. Patientez quelques minutes.';
  if (msg.includes('Password should be at least')) return 'Le mot de passe doit faire au moins 6 caractères.';
  if (msg.includes('Email not confirmed')) return 'Veuillez confirmer votre email avant de vous connecter.';
  if (msg.includes('Failed to fetch')) return 'Erreur réseau. Vérifiez votre connexion.';
  return msg || 'Une erreur est survenue.';
};

// ── SOUS-COMPOSANTS MÉMOÏSÉS ────────────────────────────────────────────────

/** Fond statique pour éviter les re-renders inutiles sur les orbes animées */
const AuthBackground = React.memo(() => (
  <div className="auth-bg">
    <div className="auth-orb auth-orb-1" />
    <div className="auth-orb auth-orb-2" />
    <div className="auth-grid" />
  </div>
));

/** Écran de succès après inscription */
const VerificationScreen = React.memo(({ email, onBack }) => (
  <div className="auth-card animate-fade-in-up" style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>📧</div>
    <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)' }}>Vérifiez vos emails !</h1>
    <p style={{ marginBottom: 'var(--space-4)' }}>
      Un lien de confirmation a été envoyé à <strong style={{ color: 'var(--gold-primary)' }}>{email}</strong>.
    </p>
    <p style={{ marginBottom: 'var(--space-6)' }}>
      Cliquez sur le lien pour activer votre compte et recevoir vos <strong>100€ de bonus</strong> 🎁
    </p>
    <button className="btn btn-ghost w-full" onClick={onBack}>Retour à la connexion</button>
  </div>
));

/** Écran de réinitialisation de mot de passe */
const ResetPasswordScreen = React.memo(({ 
  email, 
  onEmailChange, 
  onReset, 
  onCancel, 
  loading, 
  resetSent, 
  error 
}) => (
  <div className="auth-card animate-fade-in-up" style={{ textAlign: 'center' }}>
    {resetSent ? (
      <>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>✅</div>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)' }}>Email envoyé !</h1>
        <p style={{ marginBottom: 'var(--space-6)' }}>Veuillez consulter votre boîte mail pour réinitialiser votre mot de passe.</p>
        <button className="btn btn-ghost w-full" onClick={onCancel}>Retour à la connexion</button>
      </>
    ) : (
      <>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)' }}>Mot de passe oublié ?</h1>
        <p style={{ marginBottom: 'var(--space-6)' }}>Entrez votre email pour recevoir un lien de récupération.</p>
        {error && <div className="auth-error" role="alert">⚠️ {error}</div>}
        <form onSubmit={onReset} style={{ textAlign: 'left' }}>
          <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label htmlFor="reset-email">Adresse email</label>
            <input 
              id="reset-email" type="email" className="input" placeholder="vous@exemple.com"
              value={email} onChange={onEmailChange} required autoFocus
            />
          </div>
          <button type="submit" className="btn btn-gold w-full" style={{ height: 52 }} disabled={loading}>
            {loading ? 'Envoi...' : '📧 Envoyer le lien'}
          </button>
          <button type="button" className="btn btn-ghost w-full" onClick={onCancel} style={{ marginTop: 8 }}>Annuler</button>
        </form>
      </>
    )}
  </div>
));

/** Formulaire de connexion */
const LoginForm = React.memo(({ email, password, onFieldChange, showPassword, onTogglePassword, loading }) => (
  <>
    <div className="input-group">
      <label htmlFor="email">Adresse email</label>
      <input 
        id="email" name="email" type="email" className="input" placeholder="vous@exemple.com"
        value={email} onChange={onFieldChange} required autoComplete="email"
      />
    </div>
    <div className="input-group">
      <label htmlFor="password">Mot de passe</label>
      <div className="password-wrapper">
        <input 
          id="password" name="password" type={showPassword ? 'text' : 'password'} className="input" placeholder="••••••••"
          value={password} onChange={onFieldChange} required autoComplete="current-password"
        />
        <button 
          type="button" className="password-toggle" onClick={() => onTogglePassword('pwd')} tabIndex={-1}
          aria-label={showPassword ? 'Masquer' : 'Afficher'}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  </>
));

/** Formulaire d'inscription */
const RegisterForm = React.memo(({ 
  formData, onFieldChange, showPassword, showConfirmPassword, onTogglePassword, loading 
}) => {
  const strength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);
  const strengthLabel = ['', 'Faible', 'Moyen', 'Fort'];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#10B981'];

  return (
    <>
      <div className="input-group">
        <label htmlFor="username">Nom d'utilisateur</label>
        <input 
          id="username" name="username" type="text" className="input" placeholder="MonPseudo123"
          value={formData.username} onChange={onFieldChange} required minLength={3} maxLength={30}
        />
      </div>
      <div className="input-group">
        <label htmlFor="email">Adresse email</label>
        <input 
          id="email" name="email" type="email" className="input" placeholder="vous@exemple.com"
          value={formData.email} onChange={onFieldChange} required
        />
      </div>
      <div className="input-group">
        <label htmlFor="password">Mot de passe</label>
        <div className="password-wrapper">
          <input 
            id="password" name="password" type={showPassword ? 'text' : 'password'} className="input" placeholder="Min. 8 caractères"
            value={formData.password} onChange={onFieldChange} required minLength={8}
          />
          <button 
            type="button" className="password-toggle" onClick={() => onTogglePassword('pwd')} tabIndex={-1}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {formData.password && (
          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ 
                  flex: 1, height: 3, borderRadius: 2, 
                  background: i <= strength ? strengthColor[strength] : 'var(--border-subtle)',
                  transition: 'background 0.3s' 
                }} />
              ))}
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: strengthColor[strength] }}>Force : {strengthLabel[strength]}</span>
          </div>
        )}
      </div>
      <div className="input-group">
        <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
        <div className="password-wrapper">
          <input 
            id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} className="input" placeholder="••••••••"
            value={formData.confirmPassword} onChange={onFieldChange} required
          />
          <button 
            type="button" className="password-toggle" onClick={() => onTogglePassword('confirm')} tabIndex={-1}
          >
            {showConfirmPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
    </>
  );
});

// ── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('mode') || 'login');
  const [formData, setFormData] = useState({ email: '', password: '', username: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const isSubmitting = useRef(false);
  const { signIn, signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/lobby');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setMode(searchParams.get('mode') || 'login');
    setError('');
  }, [searchParams]);

  // Handler optimisé pour les champs
  const handleFieldChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  }, [error]);

  const toggleVisibility = useCallback((type) => {
    if (type === 'pwd') setShowPassword(v => !v);
    else setShowConfirmPassword(v => !v);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setError('');
    setLoading(true);

    try {
      const email = formData.email.trim().toLowerCase();
      if (mode === 'register') {
        const username = formData.username.trim();
        if (username.length < 3) throw new Error("Pseudo trop court.");
        if (formData.password !== formData.confirmPassword) throw new Error('Les mots de passe ne correspondent pas.');
        if (WEAK_PASSWORDS.includes(formData.password.toLowerCase())) throw new Error('Mot de passe trop simple.');

        const { session } = await signUp(email, formData.password, username);
        if (!session) { setEmailSent(true); return; }
      } else {
        await signIn(email, formData.password);
      }
    } catch (err) {
      setError(translateError(err.message));
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth?mode=login`,
    });
    setLoading(false);
    if (error) setError(translateError(error.message));
    else setResetSent(true);
  };

  // ── RENDU ──────────────────────────────────────────────────────────────────

  return (
    <div className="auth-page">
      <AuthBackground />

      <div className="auth-container">
        <button className="auth-logo" onClick={() => navigate('/')} aria-label="Retour à l'accueil">
          <span className="auth-logo-icon">🎲</span>
          <span className="auth-logo-text">Golden<span>Ludo</span></span>
        </button>

        {emailSent ? (
          <VerificationScreen email={formData.email} onBack={() => navigate('/auth?mode=login')} />
        ) : showReset ? (
          <ResetPasswordScreen 
            email={resetEmail} onEmailChange={(e) => setResetEmail(e.target.value)}
            onReset={handleResetRequest} onCancel={() => setShowReset(false)}
            loading={loading} resetSent={resetSent} error={error}
          />
        ) : (
          <div className="auth-card animate-fade-in-up">
            <div className="auth-card-header">
              <h1>{mode === 'login' ? 'Bon retour !' : 'Rejoindre l\'aventure'}</h1>
              <p>{mode === 'login' ? 'Connectez-vous pour jouer.' : '100€ de bonus à l\'inscription 🎁'}</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === 'login' ? (
                <LoginForm 
                  email={formData.email} password={formData.password}
                  onFieldChange={handleFieldChange} showPassword={showPassword}
                  onTogglePassword={toggleVisibility} loading={loading}
                />
              ) : (
                <RegisterForm 
                  formData={formData} onFieldChange={handleFieldChange}
                  showPassword={showPassword} showConfirmPassword={showConfirmPassword}
                  onTogglePassword={toggleVisibility} loading={loading}
                />
              )}

              {error && <div className="auth-error" role="alert">⚠️ {error}</div>}

              <button type="submit" className="btn btn-gold w-full" style={{ height: 52 }} disabled={loading}>
                {loading ? 'Chargement...' : mode === 'login' ? '🔑 Se Connecter' : '🎲 Créer mon compte'}
              </button>
            </form>

            {mode === 'login' && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button className="auth-link" onClick={() => setShowReset(true)}>Mot de passe oublié ?</button>
              </div>
            )}

            <div className="auth-switch">
              {mode === 'login' ? (
                <>Pas de compte ? <button className="auth-link" onClick={() => navigate('/auth?mode=register')}>S'inscrire</button></>
              ) : (
                <>Déjà un compte ? <button className="auth-link" onClick={() => navigate('/auth?mode=login')}>Se connecter</button></>
              )}
            </div>
          </div>
        )}

        <p className="auth-disclaimer">
          En continuant, vous acceptez nos <button className="auth-link-inline" onClick={() => navigate('/legal')}>Conditions</button> et notre politique de <button className="auth-link-inline" onClick={() => navigate('/legal')}>Jeu responsable</button>.
        </p>
      </div>
    </div>
  );
}
