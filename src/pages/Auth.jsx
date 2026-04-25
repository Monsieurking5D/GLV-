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
      Cliquez sur le lien pour activer votre compte et recevoir vos <strong>5€ de bonus</strong> 🎁
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

/** Écran pour définir un nouveau mot de passe */
const UpdatePasswordScreen = React.memo(({ 
  password, 
  confirmPassword,
  onFieldChange, 
  onUpdate, 
  loading, 
  error,
  showPassword,
  onTogglePassword
}) => {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthLabel = ['', 'Faible', 'Moyen', 'Fort'];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#10B981'];

  return (
    <div className="auth-card animate-fade-in-up">
      <div className="auth-card-header">
        <h1>Nouveau mot de passe</h1>
        <p>Choisissez un mot de passe sécurisé pour votre compte.</p>
      </div>
      {error && <div className="auth-error" role="alert">⚠️ {error}</div>}
      <form onSubmit={onUpdate} className="auth-form">
        <div className="input-group">
          <label htmlFor="password">Nouveau mot de passe</label>
          <div className="password-wrapper">
            <input 
              id="password" name="password" type={showPassword ? 'text' : 'password'} className="input" 
              placeholder="Min. 8 caractères" value={password} onChange={onFieldChange} required minLength={8}
            />
            <button type="button" className="password-toggle" onClick={() => onTogglePassword('pwd')} tabIndex={-1}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {password && (
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
        <div className="input-group" style={{ marginBottom: 'var(--space-6)' }}>
          <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
          <input 
            id="confirmPassword" name="confirmPassword" type="password" className="input" 
            placeholder="••••••••" value={confirmPassword} onChange={onFieldChange} required
          />
        </div>
        <button type="submit" className="btn btn-gold w-full" style={{ height: 52 }} disabled={loading}>
          {loading ? 'Mise à jour...' : '💾 Enregistrer le mot de passe'}
        </button>
      </form>
    </div>
  );
});

/** Formulaire de connexion */
const LoginForm = React.memo(({ email, password, onEmailChange, onPasswordChange, showPassword, onTogglePassword, loading }) => (
  <>
    <div className="input-group">
      <label htmlFor="email">Adresse email</label>
      <input 
        id="email" name="email" type="email" className="input" placeholder="vous@exemple.com"
        value={email} onChange={(e) => onEmailChange(e.target.value)} required autoComplete="email"
      />
    </div>
    <div className="input-group">
      <label htmlFor="password">Mot de passe</label>
      <div className="password-wrapper">
        <input 
          id="password" name="password" type={showPassword ? 'text' : 'password'} className="input" placeholder="••••••••"
          value={password} onChange={(e) => onPasswordChange(e.target.value)} required autoComplete="current-password"
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
  username, email, password, confirmPassword, referralCode,
  onUsernameChange, onEmailChange, onPasswordChange, onConfirmPasswordChange, onReferralCodeChange,
  showPassword, showConfirmPassword, onTogglePassword, loading 
}) => {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthLabel = ['', 'Faible', 'Moyen', 'Fort'];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#10B981'];

  return (
    <>
      <div className="input-group">
        <label htmlFor="username">Nom d'utilisateur</label>
        <input 
          id="username" name="username" type="text" className="input" placeholder="MonPseudo123"
          value={username} onChange={(e) => onUsernameChange(e.target.value)} required minLength={3} maxLength={30}
        />
      </div>
      <div className="input-group">
        <label htmlFor="email">Adresse email</label>
        <input 
          id="email" name="email" type="email" className="input" placeholder="vous@exemple.com"
          value={email} onChange={(e) => onEmailChange(e.target.value)} required
        />
      </div>
      <div className="input-group">
        <label htmlFor="password">Mot de passe</label>
        <div className="password-wrapper">
          <input 
            id="password" name="password" type={showPassword ? 'text' : 'password'} className="input" placeholder="Min. 8 caractères"
            value={password} onChange={(e) => onPasswordChange(e.target.value)} required minLength={8}
          />
          <button 
            type="button" className="password-toggle" onClick={() => onTogglePassword('pwd')} tabIndex={-1}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {password && (
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
            value={confirmPassword} onChange={(e) => onConfirmPasswordChange(e.target.value)} required
          />
          <button 
            type="button" className="password-toggle" onClick={() => onTogglePassword('confirm')} tabIndex={-1}
          >
            {showConfirmPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
      <div className="input-group">
        <label htmlFor="referralCode">Code de parrainage (Optionnel)</label>
        <input 
          id="referralCode" name="referralCode" type="text" className="input" placeholder="Pseudo du parrain"
          value={referralCode} onChange={(e) => onReferralCodeChange(e.target.value)}
        />
      </div>
    </>
  );
});

// ── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('mode') || 'login');

  // Synchroniser le mode avec l'URL (pour que les boutons de la Navbar fonctionnent)
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode && urlMode !== mode) {
      setMode(urlMode);
    }
  }, [searchParams, mode]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const isSubmitting = useRef(false);
  const { signIn, signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Ne pas rediriger si on est en train de réinitialiser le mot de passe
    if (isAuthenticated && mode !== 'update-password') {
      navigate('/lobby');
    }
  }, [isAuthenticated, navigate, mode]);

  useEffect(() => {
    // Détecter si on revient d'une confirmation d'email (format hash ou query)
    const hash = window.location.hash;
    const type = searchParams.get('type');
    const isSignupConfirm = hash.includes('type=signup') || type === 'signup';
    const isRecovery = hash.includes('type=recovery') || type === 'recovery' || searchParams.get('mode') === 'recovery';

    if (hash.includes('access_token') || searchParams.get('token_hash')) {
      if (isSignupConfirm) {
        setSuccessMessage('Email confirmé avec succès ! Vous pouvez maintenant vous connecter.');
        // Nettoyer l'URL
        window.history.replaceState(null, '', window.location.pathname);
      } else if (isRecovery) {
        setMode('update-password');
      }
    }
  }, [searchParams]);

  // Handlers mémoïsés
  const handleEmailChange = useCallback((val) => { setEmail(val); if (error) setError(''); }, [error]);
  const handlePasswordChange = useCallback((val) => { setPassword(val); if (error) setError(''); }, [error]);
  const handleUsernameChange = useCallback((val) => { setUsername(val); if (error) setError(''); }, [error]);
  const handleConfirmPasswordChange = useCallback((val) => { setConfirmPassword(val); if (error) setError(''); }, [error]);
  const handleReferralCodeChange = useCallback((val) => { setReferralCode(val); if (error) setError(''); }, [error]);

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
      const cleanEmail = email.trim().toLowerCase();
      if (mode === 'register') {
        const cleanUsername = username.trim();
        if (cleanUsername.length < 3) throw new Error("Pseudo trop court.");
        if (password !== confirmPassword) throw new Error('Les mots de passe ne correspondent pas.');
        if (WEAK_PASSWORDS.includes(password.toLowerCase())) throw new Error('Mot de passe trop simple.');

        // Vérification du code de parrainage (pseudo du parrain)
        const cleanReferral = referralCode.trim();
        if (cleanReferral) {
          const { data: refData, error: refError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', cleanReferral)
            .single();
          
          if (refError || !refData) {
            throw new Error(`Le code de parrainage "${cleanReferral}" n'existe pas.`);
          }
          if (cleanReferral === cleanUsername) {
            throw new Error("Vous ne pouvez pas vous parrainer vous-même.");
          }
        }

        const { session } = await signUp(cleanEmail, password, cleanUsername, cleanReferral);
        if (!session) { setEmailSent(true); return; }
      } else {
        await signIn(cleanEmail, password);
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

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });
      if (error) throw error;
      
      setSuccessMessage('Mot de passe mis à jour ! Vous êtes maintenant connecté.');
      setMode('login');
      // Nettoyer le hash maintenant
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      
      setTimeout(() => {
        navigate('/lobby');
      }, 2000);
      
    } catch (err) {
      setError(translateError(err.message));
    } finally {
      setLoading(false);
    }
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
          <VerificationScreen email={email} onBack={() => navigate('/auth?mode=login')} />
        ) : mode === 'update-password' ? (
          <UpdatePasswordScreen 
            password={password} confirmPassword={confirmPassword}
            onFieldChange={(e) => {
              const { name, value } = e.target;
              if (name === 'password') setPassword(value);
              else setConfirmPassword(value);
            }} 
            onUpdate={handleUpdatePassword}
            loading={loading} error={error} showPassword={showPassword}
            onTogglePassword={toggleVisibility}
          />
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
              <p>{mode === 'login' ? 'Connectez-vous pour jouer.' : '5€ de bonus à l\'inscription 🎁'}</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === 'login' ? (
                <LoginForm 
                  email={email} password={password}
                  onEmailChange={handleEmailChange}
                  onPasswordChange={handlePasswordChange}
                  showPassword={showPassword}
                  onTogglePassword={toggleVisibility} loading={loading}
                />
              ) : (
                <RegisterForm 
                  username={username} email={email} password={password} confirmPassword={confirmPassword} referralCode={referralCode}
                  onUsernameChange={handleUsernameChange}
                  onEmailChange={handleEmailChange}
                  onPasswordChange={handlePasswordChange}
                  onConfirmPasswordChange={handleConfirmPasswordChange}
                  onReferralCodeChange={handleReferralCodeChange}
                  showPassword={showPassword} showConfirmPassword={showConfirmPassword}
                  onTogglePassword={toggleVisibility} loading={loading}
                />
              )}

              {successMessage && <div className="auth-success" role="alert" style={{ 
                background: 'rgba(16, 185, 129, 0.1)', 
                color: '#10B981', 
                padding: 'var(--space-3)', 
                borderRadius: 'var(--radius-md)', 
                marginBottom: 'var(--space-4)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                fontSize: 'var(--text-sm)',
                textAlign: 'center'
              }}>
                ✅ {successMessage}
              </div>}

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
