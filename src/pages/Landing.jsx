// src/pages/Landing.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import MiniBoardSVG from '../components/MiniBoardSVG.jsx';
import './Landing.css';

const FEATURES = [
  {
    icon: '💰',
    title: 'Mises Réelles',
    desc: 'Misez de 5€ à 100€ par partie. Gagnez jusqu\'à 4× votre mise dans les parties à 4 joueurs.',
  },
  {
    icon: '🎮',
    title: 'Jeu Classique',
    desc: 'Toutes les règles traditionnelles du Ludo — captures, cases sûres, couloir final — fidèlement respectées.',
  },
  {
    icon: '🤖',
    title: 'IA Avancée',
    desc: 'Jouez contre une IA intelligente avec 3 niveaux de difficulté. Parfait pour s\'entraîner.',
  },
  {
    icon: '🔒',
    title: 'Sécurisé',
    desc: 'Authentification sécurisée, portefeuille chiffré et transactions transparentes.',
  },
  {
    icon: '🌐',
    title: 'Multijoueur (Bientôt)',
    desc: 'Le multijoueur en ligne arrive prochainement. L\'architecture est déjà prête.',
  },
  {
    icon: '🏆',
    title: 'Classements',
    desc: 'Grimpez dans le classement global et devenez le roi du GoldenLudo.',
  },
];

const STEPS = [
  { num: '1', title: "S'inscrire", desc: "Créez votre compte en 30 secondes et recevez 100€ de bonus." },
  { num: '2', title: "Choisir une mise", desc: "Sélectionnez votre mise et le mode de jeu." },
  { num: '3', title: "Jouer", desc: "Lancez les dés, déplacez vos pions, capturez vos adversaires." },
  { num: '4', title: "Gagner", desc: "Le gagnant remporte tout le pot. Les gains s'ajoutent à votre portefeuille." },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing">
      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
          <div className="hero-grid" />
        </div>

        <div className="hero-inner">
          <div className="hero-content animate-fade-in-up">
            <div className="hero-badge">
              <div className="pulse-dot" />
              🎲 Plateforme de Jeu Premium
            </div>

            <h1 className="hero-title">
              <span>Le Ludo</span>
              <span className="text-gradient-gold">façon Casino.</span>
              <span>Jouez. Misez.</span>
              <span>Gagnez.</span>
            </h1>

            <p className="hero-subtitle">
              La première plateforme de Ludo avec mises réelles. 
              Affrontez l'IA ou vos amis et remportez jusqu'à 
              <strong style={{color: 'var(--gold-primary)'}}> 4× votre mise.</strong>
            </p>

            <div className="hero-actions">
              {isAuthenticated ? (
                <button
                  className="btn btn-gold btn-xl"
                  onClick={() => navigate('/lobby')}
                  id="hero-play-btn"
                >
                  🎮 Jouer Maintenant
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-gold btn-xl"
                    onClick={() => navigate('/auth?mode=register')}
                    id="hero-register-btn"
                  >
                    🎲 Démarrer Gratuitement
                  </button>
                  <button
                    className="btn btn-outline btn-xl"
                    onClick={() => navigate('/auth?mode=login')}
                    id="hero-login-btn"
                  >
                    Se Connecter
                  </button>
                </>
              )}
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">10K+</span>
                <span className="hero-stat-label">Joueurs actifs</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">250K€</span>
                <span className="hero-stat-label">Distribués</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">4.9⭐</span>
                <span className="hero-stat-label">Note moyenne</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="mini-board-container">
              <div className="mini-board-glow" />
              <div className="mini-board">
                <MiniBoardSVG />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="features" id="features">
        <div className="section-inner">
          <div className="section-header">
            <p className="section-label">Pourquoi GoldenLudo ?</p>
            <h2>Tout ce dont vous avez besoin<br />
              <span className="text-gradient-gold">pour jouer et gagner</span>
            </h2>
          </div>

          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                {f.title.includes('Bientôt') && (
                  <span className="badge badge-gray" style={{marginTop: 'var(--space-3)'}}>
                    Bientôt disponible
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-inner">
          <div className="section-header">
            <p className="section-label">Comment ça marche</p>
            <h2>Simple. Rapide.<br />
              <span className="text-gradient-gold">Addictif.</span>
            </h2>
          </div>

          <div className="steps-grid">
            {STEPS.map((step, i) => (
              <div className="step-card" key={i}>
                <div className="step-number">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BET AMOUNTS ===== */}
      <section className="bet-section" id="bets">
        <div className="section-inner">
          <div className="section-header">
            <p className="section-label">Mises disponibles</p>
            <h2>Choisissez votre <span className="text-gradient-gold">niveau de risque</span></h2>
          </div>
          <div className="bet-grid">
            {[5, 10, 25, 50, 100].map(amount => (
              <div className="bet-pill" key={amount}>{amount}€</div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta-section">
        <div className="cta-bg" />
        <div className="cta-card">
          <div className="hero-badge" style={{margin: '0 auto var(--space-6)'}}>
            🎁 Offre de lancement
          </div>
          <h2>Recevez <span className="text-gradient-gold">100€ offerts</span><br />à l'inscription</h2>
          <p>Créez votre compte maintenant et commencez à jouer immédiatement avec votre bonus de bienvenue.</p>
          <button
            className="btn btn-gold btn-xl"
            onClick={() => navigate('/auth?mode=register')}
            id="cta-register-btn"
          >
            🎲 Réclamer mon bonus
          </button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            🎲 Golden<span>Ludo</span>
          </div>
          <div className="footer-links">
            <span className="footer-link">Conditions d'utilisation</span>
            <span className="footer-link">Jeu responsable</span>
            <span className="footer-link">Contact</span>
          </div>
          <span className="footer-copy">© 2026 GoldenLudo. Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  );
}
