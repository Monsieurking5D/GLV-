import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div style={{ minHeight: '100vh', paddingTop: '120px', paddingBottom: '60px', paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: 'var(--bg-card)', padding: 'var(--space-8)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
        <h1 className="text-gold mb-6">Mon Profil</h1>
        
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 'var(--space-6)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Nom d'utilisateur : <strong style={{ color: 'var(--text-primary)' }}>{profile?.username || 'Joueur anonyme'}</strong></p>
          <p style={{ color: 'var(--text-secondary)' }}>Email : <strong style={{ color: 'var(--text-primary)' }}>{profile?.email || 'N/A'}</strong></p>
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
