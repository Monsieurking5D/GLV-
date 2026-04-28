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

  const transactions = profile?.transactions || [];

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
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>Nom d'utilisateur : <strong style={{ color: 'var(--text-primary)' }}>{profile?.username || 'Joueur anonyme'}</strong></p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>Email : <strong style={{ color: 'var(--text-primary)' }}>{user?.email || profile?.email || 'N/A'}</strong></p>
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>Solde total : <strong className="text-gold">{(profile?.walletBalance || 0).toFixed(2)}€</strong></p>
            {profile?.bonusBalance > 0 && (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>
                  Dont bonus bloqué : <span style={{ color: '#F87171' }}>{profile.bonusBalance.toFixed(2)}€</span>
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                  Mise restante nécessaire : <strong style={{ color: 'var(--text-primary)' }}>{profile.wageringRequirement.toFixed(2)}€</strong>
                </p>
                <div style={{ width: '100%', height: 6, background: 'var(--bg-deep)', borderRadius: 3, overflow: 'hidden', marginBottom: 'var(--space-1)' }}>
                  <div style={{ 
                    width: `${Math.min(100, Math.max(5, 100 - (profile.wageringRequirement / (profile.bonusBalance * 2) * 100)))}%`, 
                    height: '100%', 
                    background: 'var(--gold-primary)',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Progression du déblocage</p>
              </>
            )}
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)' }}>
              Solde retirable : <strong style={{ color: 'var(--green-light)' }}>{(profile?.withdrawableBalance || 0).toFixed(2)}€</strong>
            </p>
          </div>
        </div>
        
        {/* SYSTÈME DE PARRAINAGE ET AGENT */}
        <div style={{ background: 'rgba(245,197,24,0.05)', padding: 'var(--space-6)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)', border: '1px solid rgba(245,197,24,0.1)' }}>
          <h2 className="text-gold" style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 10 }}>
            🤝 Programme Partenaire 
            <span style={{ fontSize: 'var(--text-xs)', background: 'var(--gold-primary)', color: 'var(--bg-deep)', padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase' }}>
              {profile?.agent_level || 'Player'}
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
            Gagnez de l'argent sur chaque partie jouée par vos amis.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gains totaux</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--gold-primary)' }}>{(profile?.referral_earnings || 0).toFixed(2)}€</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Partage (RevShare)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {profile?.agent_level === 'gold' ? '25%' : profile?.agent_level === 'silver' ? '15%' : '10%'}
              </div>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>VOTRE CODE DE PARRAINAGE</label>
            <div style={{ 
              display: 'flex', gap: 8, background: 'var(--bg-deep)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-glass)',
              fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--gold-primary)', fontWeight: 'bold'
            }}>
              {profile?.username}
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(profile?.username);
                  alert('Code copié !');
                }}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
              >
                Copier
              </button>
            </div>
          </div>
        </div>

        {/* SECTION RETRAIT AVEC FRAIS DYNAMIQUES */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 'var(--space-6)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)', border: '1px solid var(--border-subtle)' }}>
          <h2 className="text-gold" style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>💸 Retrait des gains</h2>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Frais de retrait : <strong style={{ color: 'var(--text-primary)' }}>1er retrait du mois gratuit</strong>, puis 1€ + 2%.
            </p>
          </div>
          <button 
            className="btn btn-gold w-full" 
            onClick={() => alert("Le module de paiement Stripe/PayPal est en cours d'intégration. Vos gains sont en sécurité.")}
            disabled={profile?.withdrawableBalance < 10}
          >
            {profile?.withdrawableBalance < 10 ? 'Minimum 10€ pour retirer' : 'Effectuer un retrait'}
          </button>
        </div>

        {/* Historique des Transactions */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="text-gold" style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>📊 Historique des transactions</h2>
          {transactions.length === 0 ? (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
              Aucune transaction pour le moment.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {transactions.map(tx => (
                <div key={tx.id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 'var(--space-3) var(--space-4)', background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)'
                }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: '600' }}>{tx.description}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(tx.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ 
                    fontFamily: 'Outfit, sans-serif', fontWeight: '800',
                    color: tx.amount > 0 ? 'var(--green-light)' : '#EF4444'
                  }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}€
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-outline" onClick={() => navigate('/lobby')}>
          Retour au Lobby
        </button>
      </div>
    </div>
  );
}
