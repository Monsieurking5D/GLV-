import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, loading, error } = useAuth();

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
          Chargement de votre profil...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
        <div className="auth-card" style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>⚠️</div>
          <h2 style={{ marginBottom: 'var(--space-2)' }}>Erreur de chargement</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>{error}</p>
          <button className="btn btn-gold w-full" onClick={() => window.location.reload()}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingTop: '120px', paddingBottom: '60px', paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: 'var(--bg-card)', padding: 'var(--space-8)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <div style={{ 
            width: 64, height: 64, borderRadius: '50%', 
            background: 'var(--gold-primary)', color: 'var(--bg-deep)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: '800', fontFamily: 'Outfit, sans-serif'
          }}>
            {profile?.avatar || profile?.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <h1 className="text-gold" style={{ margin: 0 }}>Mon Profil</h1>
        </div>
        
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 'var(--space-6)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Nom d'utilisateur : <strong style={{ color: 'var(--text-primary)' }}>{profile?.username || 'Joueur anonyme'}</strong></p>
          <p style={{ color: 'var(--text-secondary)' }}>Email : <strong style={{ color: 'var(--text-primary)' }}>{user?.email || profile?.email || 'N/A'}</strong></p>
          <p style={{ color: 'var(--text-secondary)' }}>Solde actuel : <strong className="text-gold">{(profile?.walletBalance || 0).toFixed(2)}€</strong></p>
        </div>

        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
          L'historique des parties, les méthodes de dépôt/retrait et les options de compte complètes arrivent dans la prochaine mise à jour.
        </p>

        <button className="btn btn-outline" onClick={() => navigate(-1)}>
          Retour
        </button>
      </div>
    </div>
  );
}
