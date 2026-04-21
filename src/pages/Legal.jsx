import { useNavigate } from 'react-router-dom';

export default function Legal() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', paddingTop: '120px', paddingBottom: '60px', paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: 'var(--bg-card)', padding: 'var(--space-8)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
        <h1 className="text-gold mb-6">Conditions Légales et Jeu Responsable</h1>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          Bienvenue sur la page des conditions d'utilisation de GoldenLudo. La rédaction complète des termes contractuels, de la politique de confidentialité et des règles de retrait est actuellement en cours par notre service juridique.
        </p>

        <div style={{ background: 'rgba(245,197,24,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <h3 className="text-gold" style={{ marginBottom: 'var(--space-3)' }}>Avertissement sur les Risques</h3>
          <p style={{ color: 'var(--text-primary)' }}>
            Les jeux d'argent en ligne sont réservés aux personnes majeures (18+). Ils comportent des risques d'addiction, d'endettement et d'isolement. 
            Fixez-vous toujours des limites de dépôt et de temps de jeu.
          </p>
        </div>

        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          Retour
        </button>
      </div>
    </div>
  );
}
