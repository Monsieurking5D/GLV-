// src/pages/Landing.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import MiniBoardSVG from '../components/MiniBoardSVG.jsx';
import './Landing.css';

function useReveal() {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, isVisible];
}

const FEATURES = [
  { icon: '💰', title: 'Mises Réelles', desc: "Misez de 2.50€ à 250€ par partie. Gagnez jusqu'à 4× votre mise dans les parties à 4 joueurs." },
  { icon: '🎮', title: 'Jeu Classique', desc: "Toutes les règles traditionnelles du Ludo — captures, cases sûres, couloir final — fidèlement respectées." },
  { icon: '🤖', title: 'IA Avancée', desc: "Jouez contre une IA intelligente avec 3 niveaux de difficulté. Parfait pour s'entraîner." },
  { icon: '🔒', title: 'Sécurisé', desc: 'Authentification sécurisée, portefeuille chiffré et transactions transparentes.' },
  { icon: '🌐', title: 'Multijoueur', desc: "Le multijoueur en ligne arrive prochainement. L'architecture est déjà prête.", comingSoon: true },
  { icon: '🏆', title: 'Classements', desc: 'Grimpez dans le classement global et devenez le roi du GoldenLudo.' },
];

const STEPS = [
  { num: '1', title: "S'inscrire", desc: "Créez votre compte en 30 secondes et recevez 1€ de bonus de bienvenue." },
  { num: '2', title: "Choisir une mise", desc: "Sélectionnez votre mise et le mode de jeu." },
  { num: '3', title: "Jouer", desc: "Lancez les dés, déplacez vos pions, capturez vos adversaires." },
  { num: '4', title: "Gagner", desc: "Le gagnant remporte tout le pot. Les gains s'ajoutent à votre portefeuille." },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) navigate('/lobby');
  }, [isAuthenticated, navigate]);

  const [featuresRef, featuresVisible] = useReveal();
  const [stepsRef, stepsVisible] = useReveal();
  const [betsRef, betsVisible] = useReveal();
  const [ctaRef, ctaVisible] = useReveal();

  return (
    <div className="landing">
      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-grid-lines" />
          <div className="hero-radial-glow" />
        </div>

        <div className="hero-inner">
          {/* Left: Content */}
          <div className="hero-content animate-fade-in-up">
            <div className="hero-badge">
              <div className="pulse-dot" />
              🎲 Plateforme de Jeu Premium
            </div>

            <h1 className="hero-title">
              Le Ludo façon Casino.<br />
              <span className="text-gradient-gold">Jouez. Misez. Gagnez.</span>
            </h1>

            <p className="hero-subtitle">
              La première plateforme de Ludo avec mises réelles.
              Affrontez l'IA ou vos amis et remportez jusqu'à{' '}
              <strong className="text-gold">4× votre mise.</strong>
            </p>

            <div className="hero-actions">
              {isAuthenticated ? (
                <button className="btn-hero-gold" onClick={() => navigate('/lobby')} id="hero-play-btn">
                  <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3M7,7A1,1 0 0,0 6,8A1,1 0 0,0 7,9A1,1 0 0,0 8,8A1,1 0 0,0 7,7M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M17,15A1,1 0 0,0 16,16A1,1 0 0,0 17,17A1,1 0 0,0 18,16A1,1 0 0,0 17,15M17,7A1,1 0 0,0 16,8A1,1 0 0,0 17,9A1,1 0 0,0 18,8A1,1 0 0,0 17,7M7,15A1,1 0 0,0 6,16A1,1 0 0,0 7,17A1,1 0 0,0 8,16A1,1 0 0,0 7,15Z"/></svg>
                  Jouer Maintenant
                </button>
              ) : (
                <>
                  <button className="btn-hero-gold" onClick={() => navigate('/auth?mode=register')} id="hero-register-btn">
                    <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3M7,7A1,1 0 0,0 6,8A1,1 0 0,0 7,9A1,1 0 0,0 8,8A1,1 0 0,0 7,7M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M17,15A1,1 0 0,0 16,16A1,1 0 0,0 17,17A1,1 0 0,0 18,16A1,1 0 0,0 17,15M17,7A1,1 0 0,0 16,8A1,1 0 0,0 17,9A1,1 0 0,0 18,8A1,1 0 0,0 17,7M7,15A1,1 0 0,0 6,16A1,1 0 0,0 7,17A1,1 0 0,0 8,16A1,1 0 0,0 7,15Z"/></svg>
                    Démarrer Gratuitement
                  </button>
                  <button className="btn-hero-outline" onClick={() => navigate('/auth?mode=login')} id="hero-login-btn">
                    Se Connecter
                  </button>
                </>
              )}
            </div>

            {/* Trust Badges */}
            <div className="hero-trust-badges">
              <div className="trust-badge">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>
                Certifié Équitable
              </div>
              <div className="trust-badge">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z"/></svg>
                100% Sécurisé
              </div>
              <div className="trust-badge">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/></svg>
                Multijoueur
              </div>
            </div>
          </div>

          {/* Right: Board Visual */}
          <div className="hero-visual">
            <div className="hero-visual-glow" />
            <div className="mini-board-container">
              <div className="mini-board-glow" />
              <div className="mini-board">
                <MiniBoardSVG />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom gold line */}
        <div className="hero-bottom-line" />
      </section>

      {/* ===== FEATURES ===== */}
      <section className={`features ${featuresVisible ? 'animate-fade-in-up' : 'opacity-0'}`} id="features" ref={featuresRef}>
        <div className="section-inner">
          <div className="section-header">
            <p className="section-label">Pourquoi GoldenLudo ?</p>
            <h2>Tout ce dont vous avez besoin<br /><span className="text-gradient-gold">pour jouer et gagner</span></h2>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                {f.comingSoon && <span className="badge badge-gray mt-3">Bientôt disponible</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className={`how-it-works ${stepsVisible ? 'animate-fade-in-up' : 'opacity-0'}`} id="how-it-works" ref={stepsRef}>
        <div className="section-inner">
          <div className="section-header">
            <p className="section-label">Comment ça marche</p>
            <h2>Simple. Rapide.<br /><span className="text-gradient-gold">Addictif.</span></h2>
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
      <section className={`bet-section ${betsVisible ? 'animate-fade-in-up' : 'opacity-0'}`} id="bets" ref={betsRef}>
        <div className="section-inner">
          <div className="section-header">
            <p className="section-label">Mises disponibles</p>
            <h2>Choisissez votre <span className="text-gradient-gold">niveau de risque</span></h2>
          </div>
          <div className="bet-grid">
            {[2.5, 5, 10, 25, 50, 100, 250].map(amount => (
              <div className="bet-pill" key={amount}>{amount}€</div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className={`cta-section ${ctaVisible ? 'animate-fade-in-up' : 'opacity-0'}`} ref={ctaRef}>
        <div className="cta-bg" />
        <div className="cta-card">
          <div className="hero-badge mx-auto mb-6">
            {isAuthenticated ? '🎮 Prêt à jouer ?' : '🎁 Offre de lancement'}
          </div>
          <h2>
            {isAuthenticated ? (<>Plongez dans l'<span className="text-gradient-gold">Action</span><br />dès maintenant</>) : (<>Recevez <span className="text-gradient-gold">1€ offert</span><br />à l'inscription</>)}
          </h2>
          <p>
            {isAuthenticated
              ? "Rejoignez le Lobby, choisissez votre mise et affrontez des joueurs du monde entier."
              : "Créez votre compte maintenant et commencez à jouer immédiatement avec votre bonus de bienvenue."}
          </p>
          <button className="btn-hero-gold" onClick={() => navigate(isAuthenticated ? '/lobby' : '/auth?mode=register')} id="cta-register-btn">
            {isAuthenticated ? '🎮 Jouer Maintenant' : '🎲 Réclamer mon bonus'}
          </button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">🎲 Golden<span>Ludo</span></div>
          <div className="footer-links">
            <span className="footer-link" onClick={() => navigate('/legal')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/legal')}>Conditions d'utilisation</span>
            <span className="footer-link" onClick={() => navigate('/legal')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/legal')}>Jeu responsable</span>
            <span className="footer-link" onClick={() => navigate('/contact')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/contact')}>Contact</span>
          </div>
          <div className="legal-warning text-center mt-3">
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
