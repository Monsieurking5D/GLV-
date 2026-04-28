import { useState, useEffect, useCallback, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase';
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
    label: 'La Triade',
    icon: '🔺',
    desc: 'Triuel à 3 joueurs. 3× votre mise au gagnant.',
    players: 3,
    multiplier: '3×',
    available: true,
  },
  {
    id: '1v1v1v1',
    label: 'L\'Arène',
    icon: '◆',
    desc: 'Bataille à 4 joueurs. 4× votre mise !',
    players: 4,
    multiplier: '4×',
    available: true,
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
  const [isPending, startTransition] = useTransition();
  const [selectedMode, setSelectedMode] = useState('1v1');
  const [selectedBet, setSelectedBet] = useState(10);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState(50);
  const [depositLoading, setDepositLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [isCreatingPrivate, setIsCreatingPrivate] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [publicGames, setPublicGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);

  const fetchPublicGames = useCallback(async () => {
    setLoadingGames(true);
    try {
      // On récupère les parties actives créées dans les 10 dernières minutes
      // (Plus fiable que 2 minutes si le heartbeat a des délais)
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('is_private', false)
        .eq('status', 'active')
        .neq('mode', 'solo')
        .gt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      if (data) setPublicGames(data);
    } catch (err) {
      console.error("Error fetching games:", err);
    } finally {
      setLoadingGames(false);
    }
  }, []);

  // Charger les parties publiques et s'abonner aux changements
  useEffect(() => {
    fetchPublicGames();

    const channel = supabase
      .channel('lobby_public_games')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'games'
      }, () => {
        fetchPublicGames();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPublicGames]);

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
    if (!currentMode?.available || isStarting) return;

    if (!isSoloMode && !canBet) {
      setShowDepositModal(true);
      return;
    }

    setIsStarting(true);

    try {
      // Suppression du prélèvement immédiat - sera fait au lancement réel de la partie (PLAYING)

      let code = null;
      if (isPrivate) {
        code = generateInviteCode();
      }

      const initialPlayers = [
        { id: profile.id, name: profile.username, color: 'red', isAI: false }
      ];

      // En multi, on ne met PAS d'IA, on laisse les slots vides (Waiting)
      // En solo, on met Mario
      const totalSlots = isSoloMode ? 2 : currentMode.players;
      
      const colors = ['red', 'green', 'blue', 'yellow'];
      for (let i = 1; i < totalSlots; i++) {
        const color = colors[i];
        initialPlayers.push({ 
          id: isSoloMode ? `ai_${color}` : null, // null signifie slot vide en multi
          name: isSoloMode ? 'Mario' : 'En attente...', 
          color: color, 
          isAI: isSoloMode, 
          difficulty: selectedDifficulty 
        });
      }

      // Lancer la partie
      navigate('/game', {
        state: {
          mode: selectedMode,
          bet: isSoloMode ? 0 : selectedBet,
          players: initialPlayers.map(p => ({ ...p, bet_paid: !isSoloMode && p.id === profile.id })),
          difficulty: selectedDifficulty,
          isPrivate,
          inviteCode: code,
          participantIds: [profile.id],
          maxPlayers: currentMode.players,
          isSolo: isSoloMode,
          betTransactionId: !isSoloMode ? true : false // Flag to indicate bet was paid
        }
      });
    } catch (err) {
      console.error("Erreur lancement partie:", err);
      showToast("❌ Erreur lors du débit de la mise. Veuillez réessayer.", "error");
    } finally {
      setIsStarting(false);
    }
  };

  const handleJoinGame = async (gameToJoin) => {
    if (isStarting) return;
    setIsStarting(true);
    
    try {
      // 1. Récupérer la version la plus fraîche de la partie
      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameToJoin.id)
        .single();

      if (fetchError || !game) throw new Error("Partie introuvable");

      if (game.participant_ids && game.participant_ids.includes(profile.id)) {
        // Déjà dedans, on redirige juste
        navigate('/game', { state: { gameId: game.id, mode: game.mode, bet: game.bet_amount } });
        return;
      }

      if (game.participant_ids && game.participant_ids.length >= (game.max_players || 2)) {
        showToast('❌ Cette partie est déjà complète.', 'error');
        return;
      }

      // 2. Vérifier le solde si mise
      if (game.bet_amount > (profile.wallet_balance || 0)) {
        showToast('💰 Solde insuffisant pour cette partie !', 'error');
        setShowDepositModal(true);
        return;
      }

      const newParticipantIds = [...(game.participant_ids || []), profile.id];
      const updatedPlayers = [...(game.players || [])];
      
      // Trouver la première place disponible (soit null, soit une IA)
      let emptySlotIndex = updatedPlayers.findIndex(p => !p.id || p.id.startsWith('ai_') || p.id === 'ai');
      
      if (emptySlotIndex !== -1) {
        updatedPlayers[emptySlotIndex] = {
          id: profile.id,
          name: profile.username,
          color: updatedPlayers[emptySlotIndex].color,
          isAI: false
        };
      } else {
        // Fallback si pas de slot IA trouvé mais place libre dans participant_ids
        updatedPlayers.push({
          id: profile.id,
          name: profile.username,
          color: ['red', 'green', 'blue', 'yellow'][newParticipantIds.length - 1],
          isAI: false
        });
      }

      // 3. Mettre à jour l'état du jeu
      const isFull = newParticipantIds.length >= (game.max_players || 2);
      const newState = { ...game.state };
      if (isFull) {
        newState.state = 'PLAYING';
        newState.players = updatedPlayers;
      }

      const { error: updateError } = await supabase
        .from('games')
        .update({ 
          participant_ids: newParticipantIds,
          players: updatedPlayers,
          state: newState,
          last_updated_by: profile.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', game.id);

      if (updateError) throw updateError;

      showToast('✅ Partie rejointe !');
      
      navigate('/game', { 
        state: { 
          mode: game.mode,
          bet: game.bet_amount,
          players: updatedPlayers,
          difficulty: game.difficulty,
          isPrivate: game.is_private,
          inviteCode: game.invite_code,
          gameId: game.id,
          participantIds: newParticipantIds,
          isSolo: false
        } 
      });
    } catch (err) {
      console.error("Erreur join game:", err);
      showToast(err.message || '❌ Impossible de rejoindre la partie.', 'error');
    } finally {
      setIsStarting(false);
    }
  };


  const handleJoinPrivate = async () => {
    if (!joinCode || joinCode.length < 6) {
      showToast('⚠️ Veuillez entrer un code valide.', 'error');
      return;
    }
    
    setIsStarting(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('invite_code', joinCode)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        showToast('❌ Partie introuvable ou déjà terminée.', 'error');
        return;
      }

      await handleJoinGame(data);
    } catch (err) {
      console.error("Erreur join private:", err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleDeposit = async () => {
    setDepositLoading(true);

    // Yield to main thread to show loading state immediately (Fix INP)
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      // Intégration future Stripe :
      // const session = await createStripeSession(depositAmount);
      // window.location.href = session.url;
      
      await new Promise(r => setTimeout(r, 1500)); 

      await addTransaction({
        type: 'deposit',
        amount: depositAmount,
        description: `💳 Dépôt sécurisé par Carte`,
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
            <button 
              className="btn btn-ghost header-deposit-btn" 
              onClick={() => setShowDepositModal(true)}
            >
              💰 Dépôt
            </button>
            
            <button
              className={`btn btn-gold header-start-btn ${isStarting ? 'disabled-mode' : ''}`}
              onClick={() => setShowConfigModal(true)}
              disabled={isStarting}
              id="header-start-btn"
            >
              {isStarting ? (
                <div className="spinner" style={{width:16,height:16,borderWidth:2}} />
              ) : (
                <>🎲 Créer une partie</>
              )}
            </button>

            {profile?.bonusBalance > 0 && (
              <div className="balance-card header-bonus-card" style={{ border: '1px solid var(--gold-primary)', background: 'rgba(245,197,24,0.05)' }}>
                <div className="bonus-badge-mini" style={{ position: 'static' }}>
                  🎁 {profile.bonusBalance.toFixed(0)}€ bonus
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Dashboard Grid: Stats + Recent + Rules */}
        <div className="dashboard-grid">
          {/* Stats Column */}
          <div className="dashboard-card stats-column">
            <div className="stats-grid-compact">
              {[
                { label: 'Jouées', value: stats.played, icon: '🎮' },
                { label: 'Victoires', value: stats.won, icon: '🏆', gold: true },
                { label: 'Win Rate', value: `${stats.winRate}%`, icon: '📈' },
                { label: 'Solde', value: `${balance.toFixed(2)}€`, icon: '💰', gold: true, deposit: true },
              ].map((s, i) => (
                <div 
                  key={i} 
                  className={`stat-card-mini ${s.deposit ? 'deposit-mini' : ''}`}
                  onClick={s.deposit ? () => setShowDepositModal(true) : undefined}
                >
                  <span className="stat-icon-mini">{s.icon}</span>
                  <div className="stat-info-mini">
                    <span className={`stat-value-mini ${s.gold ? 'gold' : ''}`}>{s.value}</span>
                    <span className="stat-label-mini">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Column (Compact) */}
          <div className="dashboard-card activity-column">
            <div className="card-header-compact">
              <span className="card-title-mini">📊 Activité</span>
              <button className="btn-link-mini" onClick={() => navigate('/profile')}>Voir plus</button>
            </div>
            <div className="transactions-list-mini">
              {transactions.length === 0 ? (
                <div className="empty-mini">Aucune activité</div>
              ) : (
                transactions.slice(0, 2).map(tx => (
                  <div className="transaction-item-mini" key={tx.id}>
                    <div className="tx-info-mini">
                      <span className="tx-desc-mini">{tx.description}</span>
                      <span className="tx-date-mini">{new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                    <span className={`tx-amount-mini ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(0)}€
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rules Dropdown Column */}
          <div className="dashboard-card rules-column">
            <details className="rules-details">
              <summary className="rules-summary">
                <span className="card-title-mini">📜 Règles</span>
                <span className="summary-icon">▼</span>
              </summary>
              <div className="rules-content-mini">
                <ul className="rules-list-mini">
                  <li>🎲 Lancez le dé pour jouer</li>
                  <li>🔑 Un 6 pour sortir un pion</li>
                  <li>💥 Capturez les ennemis</li>
                  <li>⭐ Zones de sécurité</li>
                  <li>🏁 4 pions au centre = Victoire</li>
                  <li>🔄 6 = Tour bonus</li>
                </ul>
              </div>
            </details>
          </div>
        </div>

        <div className="lobby-columns">
          {/* Left — Public Games */}
          <div className="lobby-left">
            <div className="lobby-section-title" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              🌍 Parties publiques
              <button 
               className={`btn-refresh ${loadingGames ? 'rotating' : ''}`} 
               onClick={fetchPublicGames}
               title="Actualiser les parties"
               disabled={loadingGames}
              >
                🔄
              </button>
            </div>
            
            <div className="public-games-list">
              {loadingGames ? (
                <div className="games-empty">
                  <div className="spinner" />
                  <p>Recherche...</p>
                </div>
              ) : publicGames.length === 0 ? (
                <div className="games-empty">
                  <span>🎲</span>
                  <p>Aucune partie publique.</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowConfigModal(true)} style={{marginTop: 16}}>
                    Créer une partie
                  </button>
                </div>
              ) : (
                <div className="games-grid">
                  {publicGames.map(game => {
                    const participantsCount = game.participant_ids?.length || 1;
                    const isFull = participantsCount >= (game.max_players || 2);
                    return (
                      <div key={game.id} className={`game-card-public ${isFull ? 'full' : ''}`}>
                        <div className="game-card-left">
                          <div className="game-card-mode">
                            <span className="mode-tag">{game.mode === '1v1' ? 'DUEL' : game.mode.toUpperCase()}</span>
                            <span className="difficulty-tag" style={{ color: game.difficulty === 'hard' ? '#EF4444' : game.difficulty === 'medium' ? '#F59E0B' : '#22C55E' }}>
                              ● {game.difficulty === 'hard' ? 'DIFFICILE' : game.difficulty === 'medium' ? 'MOYEN' : 'FACILE'}
                            </span>
                          </div>
                          <div className="game-card-bet">{game.bet_amount.toFixed(2)}€</div>
                        </div>
                        <div className="game-card-right">
                          <div className="game-card-players">
                            👤 {participantsCount}/{game.max_players || 2}
                          </div>
                          <button 
                            className="btn btn-gold btn-sm" 
                            disabled={isFull || isStarting}
                            onClick={() => handleJoinGame(game)}
                          >
                            {isFull ? 'Pleine' : 'Rejoindre'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="join-private-section">
              <div className="divider-text">OU REJOINDRE PAR CODE PRIVÉ</div>
              <div className="join-private-card">
                <input 
                  type="text" 
                  placeholder="Code d'invitation" 
                  className="input"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
                <button className="btn btn-gold" onClick={handleJoinPrivate} disabled={isStarting}>
                  Rejoindre
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Config Game Modal */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content config-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙️ CONFIGURATION DE LA PARTIE</h3>
              <button className="btn-close" onClick={() => setShowConfigModal(false)}>×</button>
            </div>

            <div className="config-section">
              <div className="config-label">Nombre de joueurs</div>
              <div className="modes-grid-popup">
                {GAME_MODES.map(mode => (
                  <div
                    key={mode.id}
                    className={`mode-card-popup ${selectedMode === mode.id ? 'selected' : ''} ${!mode.available ? 'disabled' : ''}`}
                    onClick={() => mode.available && setSelectedMode(mode.id)}
                  >
                    <div className="mode-icon">{mode.icon}</div>
                    <div className="mode-name">{mode.label}</div>
                    <div className="mode-multiplier">{mode.multiplier}</div>
                  </div>
                ))}
              </div>
            </div>

            {!isSoloMode ? (
              <>
                <div className="config-section">
                  <div className="config-label">Mise de la partie</div>
                  <div className="bet-amounts-popup">
                    {BET_AMOUNTS.map(amount => (
                      <button
                        key={amount}
                        className={`bet-amount-btn ${selectedBet === amount ? 'selected' : ''} ${balance < amount ? 'insufficient' : ''}`}
                        onClick={() => setSelectedBet(amount)}
                      >
                        {amount.toFixed(amount % 1 === 0 ? 0 : 2)}€
                      </button>
                    ))}
                  </div>
                  
                  {selectedBet && (
                    <div className="bet-summary-popup">
                      <div className="summary-row">
                        <span>Pot total</span>
                        <span>{(selectedBet * currentMode.players).toFixed(2)}€</span>
                      </div>
                      <div className="summary-row highlight">
                        <span>Gain espéré (net)</span>
                        <span className="gold">
                          {((selectedBet * currentMode.players) - Math.min(selectedBet * currentMode.players * 0.10, 3.00)).toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="config-section">
                  <div className="private-toggle-card popup" onClick={() => setIsPrivate(!isPrivate)}>
                    <div className="private-info">
                      <span className="private-label">Partie Privée ?</span>
                      <span className="private-desc">Seuls ceux avec le code pourront rejoindre</span>
                    </div>
                    <div className={`toggle-switch ${isPrivate ? 'on' : ''}`}>
                      <div className="toggle-handle" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="config-section">
                <div className="config-label">Difficulté de l'IA</div>
                <div className="difficulty-buttons">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d.id}
                      className={`difficulty-btn ${selectedDifficulty === d.id ? 'selected' : ''}`}
                      style={{ '--diff-color': d.color }}
                      onClick={() => setSelectedDifficulty(d.id)}
                    >
                      {d.icon} {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-footer">
              {!isSoloMode && !canBet && (
                <p className="insufficient-warning">⚠️ Solde insuffisant</p>
              )}
              <button
                className="btn btn-gold w-full start-btn"
                onClick={handleStartGame}
                disabled={isStarting || (!isSoloMode && !canBet)}
              >
                {isStarting ? (
                  <div className="spinner" style={{width:20,height:20}} />
                ) : (
                  <>🚀 Lancer la partie</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
              🔒 Paiement sécurisé et crypté
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
