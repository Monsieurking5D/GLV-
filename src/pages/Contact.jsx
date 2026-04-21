import { useNavigate } from 'react-router-dom';

export default function Contact() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', paddingTop: '120px', paddingBottom: '60px', paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', background: 'var(--bg-card)', padding: 'var(--space-8)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
        <h1 className="text-gold mb-6">Nous Contacter</h1>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          Notre support client est disponible 24/7 pour vous aider concernant vos parties, vos transactions ou tout problème technique.
        </p>

        <p style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-lg)' }}>
          📧 <strong>support@goldenludo.com</strong>
        </p>

        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          Retour
        </button>
      </div>
    </div>
  );
}
