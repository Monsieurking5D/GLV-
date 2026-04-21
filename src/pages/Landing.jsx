// src/pages/Landing.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import MiniBoardSVG from '../components/MiniBoardSVG.jsx';
import './Landing.css';

// Hook pour déclencher les animations d'entrée au scroll
function useReveal() {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect(); // Ne jouer qu'une seule fois
      }
    }, { threshold: 0.1 });
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  
  return [ref, isVisible];
}
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
    title: 'Multijoueur',
    desc: 'Le multijoueur en ligne arrive prochainement. L\'architecture est déjà prête.',
    comingSoon: true
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
  
  const [featuresRef, featuresVisible] = useReveal();
  const [stepsRef, stepsVisible] = useReveal();
  const [ctaRef, ctaVisible] = useReveal();

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
              <strong className="text-gold"> 4× votre mise.</strong>
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

            <div className="flex items-center justify-center gap-4 mt-3">
              <span className="badge badge-gold">🎲 Certifié Équitable</span>
              <span className="badge badge-gray">🔒 100% Sécurisé</span>
              <span className="badge badge-gray">⚡ Multijoueur</span>
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
      <section 
        className={`features ${featuresVisible ? 'animate-fade-in-up' : 'opacity-0'}`} 
        id="features" 
        ref={featuresRef}
      >
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
                {f.comingSoon && (
                  <span className="badge badge-gray mt-3">
                    Bientôt disponible
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section 
        className={`how-it-works ${stepsVisible ? 'animate-fade-in-up' : 'opacity-0'}`} 
        id="how-it-works"
        ref={stepsRef}
      >
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
      <section 
        className={`cta-section ${ctaVisible ? 'animate-bounce-in' : 'opacity-0'}`}
        ref={ctaRef}
      >
        <div className="cta-bg" />
        <div className="cta-card">
          <div className="hero-badge mx-auto mb-6">
            {isAuthenticated ? '🎮 Prêt à jouer ?' : '🎁 Offre de lancement'}
          </div>
          <h2>
            {isAuthenticated ? (
              <>Plongez dans l'<span className="text-gradient-gold">Action</span><br />dès maintenant</>
            ) : (
              <>Recevez <span className="text-gradient-gold">100€ offerts</span><br />à l'inscription</>
            )}
          </h2>
          <p>
            {isAuthenticated 
              ? "Rejoignez le Lobby, choisissez votre mise et affrontez des joueurs du monde entier."
              : "Créez votre compte maintenant et commencez à jouer immédiatement avec votre bonus de bienvenue."
            }
          </p>
          <button
            className="btn btn-gold btn-xl"
            onClick={() => navigate(isAuthenticated ? '/lobby' : '/auth?mode=register')}
            id="cta-register-btn"
          >
            {isAuthenticated ? '🎮 Jouer Maintenant' : '🎲 Réclamer mon bonus'}
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
            <span className="footer-link" onClick={() => navigate('/legal')} role="button" tabIndex={0} onKeyDown={(e) => e.key==='Enter' && navigate('/legal')}>Conditions d'utilisation</span>
            <span className="footer-link" onClick={() => navigate('/legal')} role="button" tabIndex={0} onKeyDown={(e) => e.key==='Enter' && navigate('/legal')}>Jeu responsable</span>
            <span className="footer-link" onClick={() => navigate('/contact')} role="button" tabIndex={0} onKeyDown={(e) => e.key==='Enter' && navigate('/contact')}>Contact</span>
          </div>

          <div className="legal-warning text-center mt-3" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.4', maxWidth: '800px', width: '100%', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
            <p className="mb-2"><strong>🔞 Les jeux d'argent sont strictement interdits aux mineurs de moins de 18 ans.</strong></p>
            <p className="mb-2">⚠️ Jouer comporte des risques : endettement, isolement, dépendance. Pour être aidé, appelez le 09-74-75-13-13 (appel non surtaxé) ou rendez-vous sur <a href="https://www.joueurs-info-service.fr" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'underline'}}>joueurs-info-service.fr</a>.</p>
            <p>L'accès aux services peut être restreint selon votre juridiction de résidence.</p>
          </div>

          <span className="footer-copy mt-3">© 2026 GoldenLudo. Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  );
}
