import { useNavigate } from 'react-router-dom';

export default function Stats() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', paddingTop: '120px', paddingBottom: '60px', paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: 'var(--bg-card)', padding: 'var(--space-8)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
        <h1 className="text-gold mb-6">Statistiques</h1>
        
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 'var(--space-6)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Parties jouées : <strong style={{ color: 'var(--text-primary)' }}>0</strong></p>
          <p style={{ color: 'var(--text-secondary)' }}>Taux de victoire : <strong style={{ color: 'var(--text-primary)' }}>0%</strong></p>
          <p style={{ color: 'var(--text-secondary)' }}>Meilleur gain : <strong className="text-gold">0.00€</strong></p>
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
