import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
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
  const [showRulesPopover, setShowRulesPopover] = useState(false);
  const rulesPopoverRef = useRef(null);

  // Close rules popover on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showRulesPopover && rulesPopoverRef.current && !rulesPopoverRef.current.contains(event.target)) {
        // Check if the click was NOT on the info button itself
        if (!event.target.closest('.btn-rules-info')) {
          setShowRulesPopover(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showRulesPopover]);

  const fetchPublicGames = useCallback(async () => {
    setLoadingGames(true);
    try {
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

  useEffect(() => {
    fetchPublicGames();
    const channel = supabase
      .channel('lobby_public_games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        fetchPublicGames();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPublicGames]);

  const generateInviteCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleStartGame = async () => {
    if (!GAME_MODES.find(m => m.id === selectedMode)?.available || isStarting) return;
    if (selectedMode !== 'solo' && (profile?.walletBalance || 0) < selectedBet) {
      setShowDepositModal(true);
      return;
    }
    setIsStarting(true);
    try {
      let code = isPrivate ? generateInviteCode() : null;
      const initialPlayers = [{ id: profile.id, name: profile.username, color: 'red', isAI: false }];
      const totalSlots = selectedMode === 'solo' ? 2 : GAME_MODES.find(m => m.id === selectedMode).players;
      const colors = ['red', 'green', 'blue', 'yellow'];
      for (let i = 1; i < totalSlots; i++) {
        const color = colors[i];
        initialPlayers.push({ 
          id: selectedMode === 'solo' ? `ai_${color}` : null,
          name: selectedMode === 'solo' ? 'Mario' : 'En attente...', 
          color: color, 
          isAI: selectedMode === 'solo', 
          difficulty: selectedDifficulty 
        });
      }
      // Store game params in sessionStorage and open in new tab
      const gameParams = {
        mode: selectedMode,
        bet: selectedMode === 'solo' ? 0 : selectedBet,
        players: initialPlayers.map(p => ({ ...p, bet_paid: selectedMode !== 'solo' && p.id === profile.id })),
        difficulty: selectedDifficulty,
        isPrivate,
        inviteCode: code,
        participantIds: [profile.id],
        maxPlayers: GAME_MODES.find(m => m.id === selectedMode).players,
        isSolo: selectedMode === 'solo',
        betTransactionId: selectedMode !== 'solo'
      };
      sessionStorage.setItem('pendingGameParams', JSON.stringify(gameParams));
      window.open('/game', '_blank');
    } catch (err) {
      console.error("Erreur lancement partie:", err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleJoinGame = async (gameToJoin) => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const { data: game } = await supabase.from('games').select('*').eq('id', gameToJoin.id).single();
      if (!game) throw new Error("Partie introuvable");
      if (game.participant_ids?.includes(profile.id)) {
        sessionStorage.setItem('pendingGameParams', JSON.stringify({ gameId: game.id, mode: game.mode, bet: game.bet_amount }));
        window.open('/game', '_blank');
        return;
      }
      if (game.participant_ids?.length >= (game.max_players || 2)) {
        setToast({ msg: '❌ Partie complète', type: 'error' });
        return;
      }
      if (game.bet_amount > (profile.walletBalance || 0)) {
        setShowDepositModal(true);
        return;
      }
      const newParticipantIds = [...(game.participant_ids || []), profile.id];
      const updatedPlayers = [...(game.players || [])];
      let emptySlotIndex = updatedPlayers.findIndex(p => !p.id || p.id.startsWith('ai_'));
      if (emptySlotIndex !== -1) {
        updatedPlayers[emptySlotIndex] = { id: profile.id, name: profile.username, color: updatedPlayers[emptySlotIndex].color, isAI: false };
      }
      const { error } = await supabase.from('games').update({ participant_ids: newParticipantIds, players: updatedPlayers }).eq('id', game.id);
      if (error) throw error;
      sessionStorage.setItem('pendingGameParams', JSON.stringify({ mode: game.mode, bet: game.bet_amount, players: updatedPlayers, gameId: game.id, participantIds: newParticipantIds }));
      window.open('/game', '_blank');
    } catch (err) {
      console.error(err);
    } finally { setIsStarting(false); }
  };

  const handleJoinPrivate = async () => {
    if (!joinCode) return;
    const { data } = await supabase.from('games').select('*').eq('invite_code', joinCode).eq('status', 'active').single();
    if (data) handleJoinGame(data);
    else setToast({ msg: '❌ Code invalide', type: 'error' });
  };

  const handleDeposit = async () => {
    setDepositLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      await addTransaction({ type: 'deposit', amount: depositAmount, description: `💳 Dépôt sécurisé` });
      setShowDepositModal(false);
      setToast({ msg: `✅ +${depositAmount}€ ajoutés !` });
    } catch (err) { console.error(err); } finally { setDepositLoading(false); }
  };

  const balance = profile?.walletBalance || 0;
  const transactions = profile?.transactions?.slice(0, 2) || [];
  const stats = {
    played: profile?.gamesPlayed || 0,
    won: profile?.gamesWon || 0,
    winRate: profile?.gamesPlayed ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) : 0,
  };

  return (
    <div className="lobby">
      <div className="lobby-header">
        <div className="lobby-header-inner">
          <div className="header-main-area">
            <div className="header-titles-group">
              <p className="lobby-greeting">Bonjour, <span>{profile?.username}</span> 👋</p>
              <h1 className="lobby-title">Tableau de bord</h1>
            </div>
            
            <div className="header-activity-box">
              <div className="activity-mini-header">
                <span>📊 Activité</span>
                <div className="header-actions-mini">
                  <button className="btn-voir-plus" onClick={() => navigate('/profile')}>Voir plus</button>
                  <button className="btn-rules-info" onClick={() => startTransition(() => setShowRulesPopover(!showRulesPopover))}>ⓘ</button>
                </div>
              </div>
              
              <div className="activity-mini-list">
                {transactions.length === 0 ? (
                  <div className="mini-empty">Aucune activité</div>
                ) : (
                  transactions.map(tx => (
                    <div key={tx.id} className="mini-tx-item">
                      <span className="mini-tx-desc">{tx.description.split(' ')[0]}...</span>
                      <span className={`mini-tx-amt ${tx.amount > 0 ? 'pos' : 'neg'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(0)}€
                      </span>
                    </div>
                  ))
                )}
              </div>

              {showRulesPopover && (
                <div className="rules-popover" ref={rulesPopoverRef}>
                  <h3>📜 Règles du jeu</h3>
                  <ul>
                    <li>🎲 Un 6 pour sortir un pion</li>
                    <li>💥 Capturez les pions ennemis</li>
                    <li>⭐ Zones de sécurité (étoiles)</li>
                    <li>🏁 4 pions au centre pour gagner</li>
                    <li>🔄 Un 6 offre un tour bonus</li>
                  </ul>
                  <button className="popover-close" onClick={() => setShowRulesPopover(false)}>×</button>
                </div>
              )}
            </div>
          </div>

          <div className="lobby-header-right">
            <button className="btn btn-ghost header-deposit-btn" onClick={() => startTransition(() => setShowDepositModal(true))}>💰 Dépôt</button>
            <button className="btn btn-gold header-start-btn" onClick={() => startTransition(() => setShowConfigModal(true))} disabled={isStarting}>
              {isStarting ? <div className="spinner-mini" /> : <>🎲 Créer une partie</>}
            </button>
          </div>
        </div>
      </div>

      <div className="lobby-body">
        {/* Reverted Large Stats Grid */}
        <div className="stats-row">
          {[
            { label: 'Parties Jouées', value: stats.played, icon: '🎮' },
            { label: 'Victoires', value: stats.won, icon: '🏆', gold: true },
            { label: 'Win Rate', value: `${stats.winRate}%`, icon: '📈' },
            { label: 'Portefeuille', value: `${balance.toFixed(2)}€`, icon: '💰', gold: true, deposit: true },
          ].map((s, i) => (
            <div key={i} className={`stat-card ${s.deposit ? 'deposit-card-btn' : ''}`} onClick={s.deposit ? () => startTransition(() => setShowDepositModal(true)) : undefined}>
              <span className="stat-icon">{s.icon}</span>
              <span className={`stat-value ${s.gold ? 'gold' : ''}`}>{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="lobby-columns">
          <div className="lobby-left">
            <div className="lobby-section-title">🌍 Parties publiques
              <button className={`btn-refresh ${loadingGames ? 'rotating' : ''}`} onClick={fetchPublicGames}>🔄</button>
            </div>
            
            <div className="public-games-list">
              {loadingGames ? <div className="games-empty"><div className="spinner" /><p>Recherche...</p></div> : 
               publicGames.length === 0 ? <div className="games-empty"><span>🎲</span><p>Aucune partie.</p></div> : (
                <div className="games-grid">
                  {publicGames.map(game => (
                    <div key={game.id} className="game-card-public">
                      <div className="game-card-left">
                        <div className="game-card-mode"><span className="mode-tag">{game.mode}</span></div>
                        <div className="game-card-bet">{game.bet_amount.toFixed(2)}€</div>
                      </div>
                      <div className="game-card-right">
                        <div className="game-card-players">👤 {game.participant_ids?.length || 1}/{game.max_players}</div>
                        <button className="btn btn-gold btn-sm" onClick={() => handleJoinGame(game)}>Rejoindre</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="join-private-section">
              <div className="divider-text">OU REJOINDRE PAR CODE PRIVÉ</div>
              <div className="join-private-card">
                <input type="text" placeholder="Code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} className="input" />
                <button className="btn btn-gold" onClick={handleJoinPrivate}>Rejoindre</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals & Toasts */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content config-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3><span>⚙️</span> CONFIGURATION</h3><button className="btn-close" onClick={() => setShowConfigModal(false)}>×</button></div>
            <div className="config-section">
              <div className="config-label">Mode</div>
              <div className="modes-grid-popup">
                {GAME_MODES.map(mode => (
                  <div key={mode.id} className={`mode-card-popup ${selectedMode === mode.id ? 'selected' : ''}`} onClick={() => setSelectedMode(mode.id)}>
                    <div className="mode-icon">{mode.icon}</div>
                    <div className="mode-name">{mode.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {selectedMode !== 'solo' ? (
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
                        {amount}€
                      </button>
                    ))}
                  </div>
                  
                  {/* Potential Gain Display */}
                  <div className="potential-gain-info">
                    <span className="gain-label">💰 Gain potentiel si vous gagnez :</span>
                    <span className="gain-value">
                      {(() => {
                        const playersCount = GAME_MODES.find(m => m.id === selectedMode)?.players || 1;
                        const potTotal = selectedBet * playersCount;
                        let commissionRate = 0.10;
                        let cap = 2.00;
                        if (selectedBet < 5) {
                          commissionRate = 0.15;
                          cap = 999;
                        } else if (selectedBet >= 20) {
                          commissionRate = 0.07;
                          cap = 3.00;
                        }
                        const commission = Math.min(potTotal * commissionRate, cap);
                        const winningsTotal = potTotal - commission;
                        return winningsTotal.toFixed(2);
                      })()}€
                    </span>
                  </div>
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
              {selectedMode !== 'solo' && balance < selectedBet && (
                <p className="insufficient-warning">⚠️ Solde insuffisant</p>
              )}
              <button
                className="btn btn-gold w-full"
                onClick={handleStartGame}
                disabled={isStarting || (selectedMode !== 'solo' && balance < selectedBet)}
              >
                {isStarting ? <div className="spinner-mini" /> : <>🚀 Lancer la partie</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>💰 Dépôt</h3>
            <div className="bet-amounts">
              {[20, 50, 100].map(a => <button key={a} className={`bet-amount-btn ${depositAmount === a ? 'selected' : ''}`} onClick={() => setDepositAmount(a)}>{a}€</button>)}
            </div>
            <button className="btn btn-gold w-full" onClick={handleDeposit}>{depositLoading ? '...' : 'Déposer'}</button>
          </div>
        </div>
      )}

      {toast && <div className="toast"><div className="toast-item"><span>{toast.msg}</span></div></div>}
    </div>
  );
}
