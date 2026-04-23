import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Stats() {
  const navigate = useNavigate();
  const { profile, loading, error } = useAuth();

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
          Chargement de vos statistiques...
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

  const gamesPlayed = profile?.gamesPlayed || 0;
  const gamesWon = profile?.gamesWon || 0;
  const winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : 0;
  
  // Le meilleur gain est souvent la transaction la plus élevée de type 'win'
  const bestWin = profile?.transactions
    ?.filter(tx => tx.type === 'win' || tx.type === 'game_win')
    ?.reduce((max, tx) => Math.max(max, tx.amount), 0) || 0;

  return (
    <div style={{ minHeight: '100vh', paddingTop: '120px', paddingBottom: '60px', paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: 'var(--bg-card)', padding: 'var(--space-8)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
        <h1 className="text-gold mb-6">Statistiques</h1>
        
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 'var(--space-6)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Parties jouées : <strong style={{ color: 'var(--text-primary)' }}>{gamesPlayed}</strong></p>
          <p style={{ color: 'var(--text-secondary)' }}>Taux de victoire : <strong style={{ color: 'var(--text-primary)' }}>{winRate}%</strong></p>
          <p style={{ color: 'var(--text-secondary)' }}>Meilleur gain : <strong className="text-gold">{bestWin.toFixed(2)}€</strong></p>
        </div>

        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
          Le suivi avancé des statistiques globales et du ratio Élo (Rating) sera débloqué lors du déploiement multijoueur.
        </p>

        <button className="btn btn-outline" onClick={() => navigate(-1)}>
          Retour
        </button>
      </div>
    </div>
  );
}
