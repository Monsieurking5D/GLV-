// src/pages/Lobby.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Lobby.css';

const BET_AMOUNTS = [2.50, 5, 10, 25, 50, 100, 250];

const GAME_MODES = [
  {
    id: '1v1',
    label: '1 vs 1',
    icon: '⚔️',
    desc: 'Duel en tête à tête. 2× votre mise.',
    players: 2,
    multiplier: '2×',
    available: true,
  },
  {
    id: '1v1v1',
    label: '1 vs 1 vs 1',
    icon: '🔺',
    desc: 'Triuel à 3 joueurs. 3× mise au gagnant.',
    players: 3,
    multiplier: '3×',
    available: false, // Grisé V2
  },
  {
    id: '1v1v1v1',
    label: '1 vs 1 vs 1 vs 1',
    icon: '◆',
    desc: 'Grand Slam à 4 joueurs. 4× mise !',
    players: 4,
    multiplier: '4×',
    available: false, // Grisé V2
  },
  {
    id: 'solo',
    label: 'Solo vs IA',
    icon: '🤖',
    desc: 'Entraînez-vous contre l\'intelligence artificielle. Sans mise.',
    players: 1,
    multiplier: '—',
    available: true,
    nobet: true,
  },
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Facile', color: '#22C55E', icon: '🟢' },
  { id: 'medium', label: 'Moyen', color: '#F59E0B', icon: '🟡' },
  { id: 'hard', label: 'Difficile', color: '#EF4444', icon: '🔴' },
];

export default function Lobby() {
  const { profile, addTransaction, loading, error } = useAuth();
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState('1v1');
  const [selectedBet, setSelectedBet] = useState(10);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState(50);
  const [depositLoading, setDepositLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [isCreatingPrivate, setIsCreatingPrivate] = useState(false);

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

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
          Chargement de votre compte...
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

  const currentMode = GAME_MODES.find(m => m.id === selectedMode);
  const balance = profile?.walletBalance || 0;
  const canBet = balance >= selectedBet;
  const isSoloMode = selectedMode === 'solo';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleStartGame = async () => {
    if (!currentMode?.available) return;

    if (!isSoloMode && !canBet) {
      setShowDepositModal(true);
      return;
    }

    let code = null;
    if (isPrivate) {
      code = generateInviteCode();
    }

    // Lancer la partie
    navigate('/game', {
      state: {
        mode: selectedMode,
        bet: isSoloMode ? 0 : selectedBet,
        players: currentMode.players,
        difficulty: selectedDifficulty,
        isPrivate,
        inviteCode: code,
      }
    });
  };

  const handleJoinPrivate = () => {
    if (!joinCode || joinCode.length < 6) {
      showToast('⚠️ Veuillez entrer un code valide.', 'error');
      return;
    }
    
    // Logique de recherche de partie via Supabase (simulation pour l'instant)
    showToast(`🔍 Recherche de la partie ${joinCode}...`);
    // navigate('/game', { state: { joinCode } });
  };

  const handleDeposit = async () => {
    setDepositLoading(true);

    // Yield to main thread to show loading state immediately (Fix INP)
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      // TODO: Remplacer cette fausse attente par une intégration de paiement réelle
      await new Promise(r => setTimeout(r, 1200)); 

      await addTransaction({
        type: 'deposit',
        amount: depositAmount,
        description: `💳 Dépôt de ${depositAmount}€ (TEST)`,
      });

      setDepositLoading(false);
      setShowDepositModal(false);
      showToast(`✅ +${depositAmount}€ ajoutés à votre portefeuille !`);
    } catch (error) {
      setDepositLoading(false);
      showToast("❌ Erreur lors du dépôt.", "error");
    }
  };

  const transactions = profile?.transactions?.slice(0, 5) || [];
  const stats = {
    played: profile?.gamesPlayed || 0,
    won: profile?.gamesWon || 0,
    winRate: profile?.gamesPlayed
      ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100)
      : 0,
  };

  return (
    <div className="lobby">
      {/* Header */}
      <div className="lobby-header">
        <div className="lobby-header-inner">
          <div>
            <p className="lobby-greeting">
              Bonjour, <span>{profile?.username || 'Joueur'}</span> 👋
            </p>
            <h1 className="lobby-title">Tableau de bord</h1>
          </div>
          <div className="lobby-header-right">
            <div className="balance-card">
              <div className="balance-icon">💰</div>
              <div>
                <span className="balance-label">Solde</span>
                <span className="balance-amount">{balance.toFixed(2)}€</span>
              </div>
              <button
                className="btn btn-gold btn-sm"
                onClick={() => setShowDepositModal(true)}
                id="deposit-btn"
              >
                + Dépôt
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lobby-body">
        {/* Stats */}
        <div className="stats-row">
          {[
            { label: 'Parties jouées', value: stats.played, icon: '🎮' },
            { label: 'Victoires', value: stats.won, icon: '🏆' },
            { label: 'Taux de victoire', value: `${stats.winRate}%`, icon: '📈' },
            { label: 'Solde', value: `${balance.toFixed(0)}€`, icon: '💰', gold: true },
          ].map((s, i) => (
            <div className="stat-card" key={i}>
              <span className="stat-icon">{s.icon}</span>
              <span className={`stat-value ${s.gold ? 'gold' : ''}`}>{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="lobby-columns">
          {/* Left — Game config */}
          <div className="lobby-left">
            <div className="lobby-section-title">🎮 Choisir un mode de jeu</div>

            {/* Game modes */}
            <div className="modes-grid">
              {GAME_MODES.map(mode => (
                <div
                  key={mode.id}
                  className={`mode-card 
                    ${selectedMode === mode.id ? 'selected' : ''} 
                    ${!mode.available ? 'disabled' : ''}`}
                  onClick={() => mode.available && setSelectedMode(mode.id)}
                  id={`mode-${mode.id}`}
                >
                  <div className="mode-icon">{mode.icon}</div>
                  <div className="mode-info">
                    <div className="mode-name">{mode.label}</div>
                    <div className="mode-desc">{mode.desc}</div>
                  </div>
                  <div className="mode-right">
                    <div className={`mode-multiplier ${mode.nobet ? 'nobet' : ''}`}>
                      {mode.multiplier}
                    </div>
                    {!mode.available && (
                      <span className="badge badge-gray coming-soon-badge">
                        Bientôt
                      </span>
                    )}
                    {selectedMode === mode.id && mode.available && (
                      <div className="mode-check">✓</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bet amounts (si pas solo) */}
            {!isSoloMode && (
              <div className="bet-config">
                <div className="lobby-section-title">💰 Configuration de la mise</div>
                
                <div className="private-toggle-card" onClick={() => setIsPrivate(!isPrivate)}>
                   <div className="private-info">
                     <span className="private-label">Partie Privée</span>
                     <span className="private-desc">Générez un code pour inviter vos amis</span>
                   </div>
                   <div className={`toggle-switch ${isPrivate ? 'on' : ''}`}>
                     <div className="toggle-handle" />
                   </div>
                </div>

                <div className="bet-amounts">
                  {BET_AMOUNTS.map(amount => (
                    <button
                      key={amount}
                      className={`bet-amount-btn ${selectedBet === amount ? 'selected' : ''} ${balance < amount ? 'insufficient' : ''}`}
                      onClick={() => setSelectedBet(amount)}
                      id={`bet-${amount.toString().replace('.', '-')}`}
                    >
                      {amount.toFixed(2)}€
                      {balance < amount && <span className="insufficient-icon">⚠</span>}
                    </button>
                  ))}
                </div>

                 {selectedBet && (
                  <div className="bet-summary">
                    <div className="bet-summary-row">
                      <span>Votre mise</span>
                      <span className="bet-summary-value">{selectedBet.toFixed(2)}€</span>
                    </div>
                    <div className="bet-summary-row">
                      <span>Pot total (2 joueurs)</span>
                      <span className="bet-summary-value">{(selectedBet * 2).toFixed(2)}€</span>
                    </div>
                    <div className="bet-summary-row highlight">
                      <span>Gains potentiels</span>
                      <span className="bet-summary-value gold">
                        {((selectedBet * 2) - Math.min(selectedBet * 2 * 0.10, 3.00)).toFixed(2)}€
                      </span>
                    </div>
                    <div className="bet-summary-note">
                      Commission : 10% (Plafonnée à 3€ max)
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Difficulty (IA) */}
            {isSoloMode && (
              <div className="bet-config">
                <div className="lobby-section-title">🤖 Niveau de l'IA</div>
                <div className="difficulty-buttons">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d.id}
                      className={`difficulty-btn ${selectedDifficulty === d.id ? 'selected' : ''}`}
                      style={{ '--diff-color': d.color }}
                      onClick={() => setSelectedDifficulty(d.id)}
                      id={`diff-${d.id}`}
                    >
                      {d.icon} {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start button */}
            <button
              className={`btn btn-gold w-full start-btn ${(!currentMode?.available) ? 'disabled-mode' : ''}`}
              onClick={handleStartGame}
              disabled={!currentMode?.available}
              id="start-game-btn"
            >
              {isSoloMode ? (
                '🤖 Jouer contre l\'IA'
              ) : isPrivate ? (
                `🔒 Créer la partie privée — ${selectedBet.toFixed(2)}€`
              ) : canBet ? (
                `🎲 Lancer la partie — Mise ${selectedBet.toFixed(2)}€`
              ) : (
                `💰 Déposer pour jouer`
              )}
            </button>

            {!isSoloMode && !canBet && (
              <p className="insufficient-warning">
                ⚠️ Solde insuffisant. Déposez des fonds pour jouer avec cette mise.
              </p>
            )}

            {/* Join private */}
            {!isSoloMode && (
              <div className="join-private-section">
                <div className="divider-text">OU</div>
                <div className="join-private-card">
                  <input 
                    type="text" 
                    placeholder="Code d'invitation" 
                    className="input"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                  <button className="btn btn-ghost" onClick={handleJoinPrivate}>
                    Rejoindre
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right — Transactions */}
          <div className="lobby-right">
            <div className="lobby-section-title">📊 Activité récente</div>

            <div className="transactions-list">
              {transactions.length === 0 ? (
                <div className="no-transactions">
                  <span>🎲</span>
                  <p>Aucune transaction pour le moment.</p>
                </div>
              ) : (
                transactions.map(tx => (
                  <div className="transaction-item" key={tx.id}>
                    <div className="tx-info">
                      <span className="tx-desc">{tx.description}</span>
                      <span className="tx-date">
                        {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <span className={`tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}€
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Règles rapides */}
            <div className="quick-rules">
              <div className="lobby-section-title" style={{marginBottom: 12}}>
                📜 Règles rapides
              </div>
              <ul className="rules-list">
                <li>🎲 Lancez le dé pour jouer</li>
                <li>🔑 Un 6 pour sortir un pion</li>
                <li>💥 Capturez les pions ennemis</li>
                <li>⭐ Les étoiles sont des cases sûres</li>
                <li>🏁 4 pions au centre = Victoire !</li>
                <li>🔄 Un 6 donne un tour supplémentaire</li>
                <li>⛔ 3 fois 6 d'affilée = tour perdu</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} id="deposit-modal">
            <h3 style={{marginBottom: 'var(--space-2)'}}>💰 Dépôt de fonds</h3>
            <p style={{marginBottom: 'var(--space-6)'}}>
              Votre solde actuel&nbsp;: <strong style={{color: 'var(--gold-primary)'}}>{balance.toFixed(2)}€</strong>
            </p>

            <div style={{marginBottom: 'var(--space-4)'}}>
              <div className="lobby-section-title" style={{marginBottom: 12}}>Montant à déposer</div>
              <div className="bet-amounts">
                {[20, 50, 100, 200, 500].map(a => (
                  <button
                    key={a}
                    className={`bet-amount-btn ${depositAmount === a ? 'selected' : ''}`}
                    onClick={() => setDepositAmount(a)}
                    id={`deposit-amount-${a}`}
                  >
                    {a}€
                  </button>
                ))}
              </div>
            </div>

            <div className="deposit-sim-note">
              🔒 Simulation de paiement — aucun vrai argent débité
            </div>

            <div style={{display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)'}}>
              <button
                className="btn btn-ghost w-full"
                onClick={() => setShowDepositModal(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-gold w-full"
                onClick={handleDeposit}
                disabled={depositLoading}
                id="confirm-deposit-btn"
              >
                {depositLoading ? (
                  <><div className="spinner" style={{width:18,height:18,borderWidth:2}} /> En cours...</>
                ) : (
                  <>💳 Déposer {depositAmount}€</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast">
          <div className="toast-item">
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
