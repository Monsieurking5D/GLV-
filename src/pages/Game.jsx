// src/pages/Game.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase';
import LudoBoard from '../components/LudoBoard.jsx';
import Dice from '../components/Dice.jsx';
import {
  createInitialGameState,
  rollDice,
  processDiceRoll,
  moveToken,
  autoSelectIfOnePiece,
  GAME_STATE,
} from '../game/ludoEngine.js';
import { getAIMove, getAIThinkingDelay } from '../game/aiPlayer.js';
import { COLOR_HEX } from '../game/boardConfig.js';
import './Game.css';

import Navbar from '../components/Navbar.jsx';

const HUMAN_PLAYER = { id: 'human', name: 'Vous', color: 'red', isAI: false };

function makeAIPlayer(color, name, difficulty) {
  return { id: `ai_${color}`, name, color, isAI: true, difficulty };
}

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, updateProfile, addTransaction } = useAuth();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 800);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 800);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { 
    mode = '1v1', 
    bet = 0, 
    difficulty = 'medium', 
    isPrivate = false, 
    inviteCode = null,
    players: initialPlayers = [],
    gameId: existingGameId = null,
    participantIds: initialParticipantIds = [],
    isSolo = false
  } = location.state || {};

  const queryParams = new URLSearchParams(location.search);
  const urlGameId = queryParams.get('id');

  const copyInviteCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build players list
  const buildPlayers = useCallback(() => {
    if (!user) return [];
    const human = { id: user.id, name: profile?.username || 'Vous', color: 'red', isAI: false };
    if (mode === 'solo') {
      return [human, makeAIPlayer('green', 'Mario', difficulty)];
    }
    if (mode === '1v1') {
      return [human, makeAIPlayer('green', 'IA', difficulty)];
    }
    if (mode === '1v1v1') {
      return [human, makeAIPlayer('green', 'IA 1', difficulty), makeAIPlayer('blue', 'IA 2', difficulty)];
    }
    if (mode === '1v1v1v1') {
      return [human, makeAIPlayer('green', 'IA 1', difficulty), makeAIPlayer('blue', 'IA 2', difficulty), makeAIPlayer('yellow', 'IA 3', difficulty)];
    }
    return [human, makeAIPlayer('green', 'IA', difficulty)];
  }, [mode, difficulty, user?.id, profile?.username]);

  const [players, setPlayers] = useState(() => {
    if (initialPlayers.length > 0) return initialPlayers;
    return buildPlayers();
  });

  useEffect(() => {
    if (user && players.length === 0 && !urlGameId) {
      const p = buildPlayers();
      setPlayers(p);
      setGameState(createInitialGameState(p, bet, isSolo));
    }
  }, [user, players.length, buildPlayers, bet, isSolo, urlGameId]);
  
  const [gameState, setGameState] = useState(() =>
    createInitialGameState(players, bet, isSolo)
  );
  
  const [diceRolling, setDiceRolling] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('log'); // 'log'
  const [lastDiceValue, setLastDiceValue] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const logRef = useRef(null);
  const aiTimeoutRef = useRef(null);
  const winnerTimeoutRef = useRef(null);
  const gameIdRef = useRef(existingGameId);
  const lastSyncRef = useRef(0); // Anti-boucle de sync
  const [hasPaid, setHasPaid] = useState(false); // Suivre si la mise a été débitée

  const currentPlayer = gameState?.players?.[gameState?.currentPlayerIndex];
  // Un tour est humain si le joueur n'est pas une IA ET que son ID correspond à l'utilisateur actuel
  const isHumanTurn = !currentPlayer?.isAI && currentPlayer?.id === user?.id;
  // Seul le créateur de la partie gère les IA pour éviter les conflits
  const canProcessAI = !existingGameId; 
  
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Persistence: Sauvegarder la partie initialement ou la restaurer
  useEffect(() => {
    const initGame = async () => {
      if (!user) return;

      // 1. Tenter de restaurer via l'URL si le state est perdu (ex: refresh)
      if (urlGameId && !existingGameId) {
        try {
          const { data, error } = await supabase
            .from('games')
            .select('*')
            .eq('id', urlGameId)
            .single();
          
          if (data && data.status === 'active') {
            gameIdRef.current = data.id;
            setGameState(data.state);
            // On ne return pas, on laisse le flux continuer si besoin
            return;
          }
        } catch (err) {
          console.error("Erreur restauration game:", err);
        }
      }

      // 2. Si on a déjà un gameId (venant du Lobby), on ne fait rien de plus
      if (existingGameId) {
        // S'assurer que l'URL contient l'ID pour les prochains refresh
        if (!urlGameId) {
          window.history.replaceState(null, '', `/game?id=${existingGameId}`);
        }
        return;
      }

      // 3. Sinon, on crée une nouvelle partie en base
      try {
        const currentPlayers = players.length > 0 ? players : buildPlayers();
        const currentState = (gameState.players && gameState.players.length > 0) ? gameState : createInitialGameState(currentPlayers, bet, isSolo);

        const { data, error } = await supabase
          .from('games')
          .insert([{
            user_id: user.id,
            players: currentPlayers,
            mode,
            bet_amount: bet,
            difficulty,
            status: 'active',
            state: currentState,
            is_private: isPrivate,
            invite_code: inviteCode,
            participant_ids: initialParticipantIds.length > 0 ? initialParticipantIds : [user.id]
          }])
          .select()
          .single();
        
        if (data) {
          gameIdRef.current = data.id;
          // Mettre à jour l'URL pour permettre le refresh
          window.history.replaceState(null, '', `/game?id=${data.id}`);
        }
        if (error) console.error("Erreur init game:", error);
      } catch (err) {
        console.error("Crash init game:", err);
      }
    };
    initGame();
  }, [user?.id]);

  // Real-time: Synchronisation de l'état (pour le multi)
  useEffect(() => {
    if (!gameIdRef.current || !user?.id) return;

    const gameChannel = supabase
      .channel(`game_sync_${gameIdRef.current}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameIdRef.current}`
      }, (payload) => {
        // Ignorer si c'est nous qui avons fait la modif
        if (payload.new && payload.new.state && payload.new.last_updated_by !== user.id) {
          setGameState(payload.new.state);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [user?.id]);

  // Persistence: Mettre à jour la partie à chaque changement d'état
  useEffect(() => {
    const persistGame = async () => {
      if (!gameIdRef.current) return;
      
      const isMyTurn = currentPlayer?.id === user?.id;
      const shouldPersist = isMyTurn || (currentPlayer?.isAI && canProcessAI);
      
      if (!shouldPersist) return;

      try {
        await supabase
          .from('games')
          .update({
            state: gameState,
            status: gameState.winner ? 'finished' : 'active',
            winner: gameState.winner,
            last_updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', gameIdRef.current);
      } catch (err) {
        console.error("Erreur persist game:", err);
      }
    };
    persistGame();

    // Mémoriser le dernier dé pour l'affichage
    if (gameState.diceValue) {
      setLastDiceValue(gameState.diceValue);
    }
  }, [gameState, user?.id, currentPlayer?.id, canProcessAI]);

  // Heartbeat: Maintenir la partie active dans le Lobby pendant l'attente
  useEffect(() => {
    if (!gameIdRef.current || gameState.state !== 'WAITING' || existingGameId) return;

    const interval = setInterval(async () => {
      await supabase
        .from('games')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', gameIdRef.current);
    }, 60000); // Toutes les minutes

    return () => clearInterval(interval);
  }, [gameState.state, existingGameId]);

  // Gestion du prélèvement de la mise au début REEL de la partie
  useEffect(() => {
    const handleBetDeduction = async () => {
      if (gameState.state === 'PLAYING' && bet > 0 && !hasPaid && !isSolo) {
        try {
          // Vérification finale du solde avant débit
          if ((profile?.walletBalance || 0) < bet) {
            showToast("💰 Solde insuffisant pour démarrer la partie !");
            setTimeout(() => navigate('/lobby'), 3000);
            return;
          }

          await addTransaction({
            type: 'bet',
            amount: -bet,
            description: `🎲 Mise prélevée : Lancement partie ${mode}`
          });
          setHasPaid(true);
          console.log("💰 Mise débitée avec succès au lancement.");
        } catch (err) {
          console.error("Erreur prélèvement mise au lancement:", err);
          showToast("❌ Erreur de prélèvement. Retour au lobby.");
          navigate('/lobby');
        }
      }
    };
    handleBetDeduction();
  }, [gameState.state, bet, hasPaid, isSolo, profile?.walletBalance, addTransaction, mode, navigate]);

  // Real-time: Écouter les changements d'état du jeu
  useEffect(() => {
    if (!gameIdRef.current) return;

    // Détection de déconnexion/fermeture d'onglet
    const handleUnload = () => {
      // On tente une mise à jour rapide avant la fermeture
      if (gameIdRef.current && gameState.state === 'WAITING') {
        const blob = new Blob([JSON.stringify({ 
          status: 'finished', 
          state: { ...gameState, winner: 'abandoned' } 
        })], { type: 'application/json' });
        // Utilisation de sendBeacon pour garantir l'envoi même si l'onglet ferme
        // Note: l'URL doit être celle de l'API Supabase, c'est complexe sans client.
        // On va se contenter d'un update classique en useEffect cleanup.
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    const channel = supabase
      .channel(`game_realtime:${gameIdRef.current}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'games',
        filter: `id=eq.${gameIdRef.current}` 
      }, (payload) => {
        // On ne synchronise que si l'état est différent (pour éviter les boucles)
        // Et surtout si ce n'est pas nous qui venons de jouer
        const isMyTurn = currentPlayer?.id === user?.id;
        const isAITurn = currentPlayer?.isAI;
        
        if (payload.new.state && JSON.stringify(payload.new.state) !== JSON.stringify(gameState)) {
            // Si c'est le tour de l'autre ou de l'IA (pour les non-owners), on sync
            if (!isMyTurn && !(isAITurn && canProcessAI)) {
              setGameState(payload.new.state);
            }
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      
      // Si on quitte alors qu'on est seul en salle d'attente, on ferme la partie
      if (gameState.state === 'WAITING' && !existingGameId) {
        supabase.from('games').update({ status: 'finished' }).eq('id', gameIdRef.current);
      }
      
      supabase.removeChannel(channel);
    };
  }, [gameIdRef.current, gameState, user?.id, currentPlayer?.id, canProcessAI, existingGameId]);

  // Chat: Charger les messages initiaux et écouter en temps réel
  useEffect(() => {
    if (!gameIdRef.current) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('game_messages')
        .select('*')
        .eq('game_id', gameIdRef.current)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel(`game_chat:${gameIdRef.current}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'game_messages',
        filter: `game_id=eq.${gameIdRef.current}` 
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameIdRef.current]);

  // Auto-scroll chat & log
  const chatEndRef = useRef(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleGameEnd = useCallback(async (winnerColor) => {
    if (isEnding) return;
    setIsEnding(true);

    if (bet > 0) {
      try {
        const myPlayer = players.find(p => p.id === user?.id);
        if (winnerColor === myPlayer?.color) {
          // Nouveau système de commission : 10% plafonné à 3€
          const potTotal = bet * gameState.players.length;
          const commission = Math.min(potTotal * 0.10, 3.00);
          const winningsTotal = potTotal - commission;
          const netGains = winningsTotal - bet; // Gain net à ajouter au solde

          await addTransaction({
            type: 'win',
            amount: netGains,
            description: `🏆 Victoire ! (Commission: ${commission.toFixed(2)}€)`,
          });
          await updateProfile({
            gamesPlayed: (profile?.gamesPlayed || 0) + 1,
            gamesWon: (profile?.gamesWon || 0) + 1,
          });
        } else {
          // La mise a déjà été débitée au lancement dans Lobby.jsx — on enregistre juste l'événement
          await addTransaction({
            type: 'loss',
            amount: 0,
            description: `😔 Partie perdue — mise de ${bet}€ (${mode})`,
          });
          await updateProfile({
            gamesPlayed: (profile?.gamesPlayed || 0) + 1,
          });
        }
      } catch (err) {
        console.error("Erreur transaction fin de partie:", err);
        showToast("⚠️ Erreur lors de l'enregistrement de la fin de partie.");
      }
    } else {
      // Solo sans mise: Juste les stats
      await updateProfile({
        gamesPlayed: (profile?.gamesPlayed || 0) + 1,
        gamesWon: winnerColor === 'red' ? (profile?.gamesWon || 0) + 1 : (profile?.gamesWon || 0),
      });
    }

    // On affiche la modal APRÈS que les transactions soient OK
    winnerTimeoutRef.current = setTimeout(() => {
      setShowWinner(true);
      setIsEnding(false);
    }, 600);
  }, [bet, mode, gameState.players.length, addTransaction, updateProfile, profile, isEnding]);

  // Detect winner
  useEffect(() => {
    if (gameState.winner) {
      handleGameEnd(gameState.winner);
    }
    return () => clearTimeout(winnerTimeoutRef.current);
  }, [gameState.winner, handleGameEnd]);

  const handleRollDice = useCallback((isAI = false) => {
    if (diceRolling) return;
    if (!isAI && !isHumanTurn) return;
    if (gameState.diceRolled) return;

    setDiceRolling(true);
    const rollDelay = isAI ? 300 : 600;

    setTimeout(() => {
      const value = rollDice();
      setGameState(prev => {
        const newState = processDiceRoll(prev, value);
        
        // Si aucun pion ne peut bouger, on veut laisser le dé affiché un moment
        // avant de passer au joueur suivant.
        if (newState.currentPlayerIndex !== prev.currentPlayerIndex) {
          // On crée un état intermédiaire où le dé est affiché mais le tour n'a pas encore changé
          const intermediateState = {
            ...prev,
            diceValue: value,
            diceRolled: true,
            movablePieces: [],
            log: [...prev.log, { text: `🎲 ${prev.players[prev.currentPlayerIndex].color} lance ${value} (aucun mouvement possible)`, time: Date.now() }]
          };
          
          setTimeout(() => {
            setGameState(newState);
          }, 1500); // 1.5 seconde de visibilité
          
          setDiceRolling(false);
          return intermediateState;
        }

        // Sinon, comportement normal
        const auto = autoSelectIfOnePiece(newState);
        setDiceRolling(false);
        return auto || newState;
      });
    }, rollDelay);
  }, [diceRolling, isHumanTurn, gameState.diceRolled]);

  // AI turn
  useEffect(() => {
    if (!currentPlayer?.isAI || gameState.state !== GAME_STATE.PLAYING || gameState.winner) return;
    if (!canProcessAI) return;

    if (!gameState.diceRolled) {
      aiTimeoutRef.current = setTimeout(() => {
        handleRollDice(true);
      }, getAIThinkingDelay(currentPlayer.difficulty));
    } else if (gameState.movablePieces.length > 0) {
      aiTimeoutRef.current = setTimeout(() => {
        const tokenId = getAIMove(gameState, currentPlayer.difficulty);
        if (tokenId !== null) {
          setGameState(prev => moveToken(prev, tokenId));
        }
      }, getAIThinkingDelay(currentPlayer.difficulty) + 1000);
    }

    return () => clearTimeout(aiTimeoutRef.current);
  }, [gameState, currentPlayer, canProcessAI, handleRollDice]);

  const handleTokenClick = useCallback((token) => {
    if (!isHumanTurn || !gameState.diceRolled) return;
    
    const isMovable = gameState.movablePieces.some(p => p.color === token.color && p.id === token.id);
    if (!isMovable) {
      showToast("🚫 Ce pion ne peut pas bouger !");
      return;
    }
    
    setGameState(prev => moveToken(prev, token));
  }, [isHumanTurn, gameState.diceRolled, gameState.movablePieces]);

  const handleQuit = () => {
    clearTimeout(aiTimeoutRef.current);
    navigate('/lobby');
  };

  const handleCancelWaiting = async () => {
    if (isEnding) return;
    setIsEnding(true);
    try {
      if (gameIdRef.current) {
        await supabase.from('games').update({ status: 'finished' }).eq('id', gameIdRef.current);
      }
      navigate('/lobby');
    } catch (err) {
      console.error("Erreur annulation:", err);
      navigate('/lobby');
    } finally {
      setIsEnding(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !gameIdRef.current) return;

    const msg = newMessage.trim();
    setNewMessage('');

    try {
      await supabase.from('game_messages').insert([{
        game_id: gameIdRef.current,
        user_id: user.id,
        username: profile?.username || 'Joueur',
        content: msg
      }]);
    } catch (err) {
      console.error("Erreur envoi message:", err);
    }
  };

  const handleRestart = () => {
    clearTimeout(aiTimeoutRef.current);
    setGameState(createInitialGameState(buildPlayers(), bet));
    setShowWinner(false);
    setDiceRolling(false);
  };

  const myPlayer = (players || []).find(p => p.id === user?.id);
  const winnerIsHuman = gameState?.winner === myPlayer?.color;
  const numPlayers = gameState?.players?.length || 2;
  const potTotal = bet * numPlayers;
  const commission = Math.min(potTotal * 0.10, 3.00);
  const winnings = winnerIsHuman ? (potTotal - commission).toFixed(2) : 0;
  const displayLog = [...(gameState?.log || [])].slice(-20).reverse();

  // CRITIQUE: rendu conditionnel APRÈS tous les hooks (sinon Rules of Hooks violées)
  if (!user) {
    return (
      <div className="game-page" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
        <div className="loader-gold"></div>
        <p style={{ marginTop: 'var(--space-4)', color: 'var(--gold-primary)' }}>Authentification en cours...</p>
      </div>
    );
  }

  return (
    <div className="game-page">
      <Navbar />
      
      {/* Top Bar - Desktop only */}
      {!isMobile && (
        <div className="game-topbar">
          <div className="game-info-pills">
            <div className="game-pill">🎲 {mode}</div>
            <div className="game-pill gold">💰 {bet.toFixed(2)}€</div>
            {inviteCode && (
              <div className="game-pill invite-pill" onClick={copyInviteCode}>
                <span>Code: {inviteCode}</span>
                {copied && <span className="copy-hint">Copié!</span>}
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowQuitConfirm(true)}>
            🚪 Quitter
          </button>
        </div>
      )}

      {/* Mobile Top Header (Mockup) */}
      {isMobile && currentPlayer && (
        <div className="mobile-game-header animate-fade-in">
          <div className="mgh-turn">
            <div className="mgh-avatar" style={{ '--p-color': COLOR_HEX[currentPlayer?.color] || '#ccc' }}>
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentPlayer?.name || 'Player'}`} alt="Avatar" />
            </div>
            <div className="mgh-turn-info">
              <span className="mgh-turn-label">{isHumanTurn ? "C'EST VOTRE TOUR," : "TOUR DE"}</span>
              <span className="mgh-turn-name">{currentPlayer?.name || '...'}</span>
              <div className="mgh-status-dot" style={{ backgroundColor: COLOR_HEX[currentPlayer?.color] || '#ccc' }} />
            </div>
          </div>
          <div className="mgh-scores">
            {gameState?.players?.map(player => {
              const finished = gameState?.tokens?.[player.color]?.filter(t => t.state === 'FINISHED').length || 0;
              return (
                <div key={player.id} className="mgh-score-row">
                  <div className="mgh-score-dot" style={{ backgroundColor: COLOR_HEX[player.color] }} />
                  <span className="mgh-score-name">{player.name}</span>
                  <div className="mgh-score-bar">
                    <div className="mgh-score-fill" style={{ width: `${(finished / 4) * 100}%`, backgroundColor: COLOR_HEX[player.color] }} />
                  </div>
                  <span className="mgh-score-val">{finished}/4</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="game-layout">
        {/* Left panel — Desktop only */}
        {!isMobile && (
          <div className="game-left-panel">
            <div className="log-header">👥 Joueurs</div>
            <div className="players-list">
              {gameState?.players?.map((player, idx) => {
                const isEmpty = !player.id;
                const isActive = gameState?.currentPlayerIndex === idx;
                const finished = gameState?.tokens?.[player.color]?.filter(t => t.state === 'FINISHED').length || 0;
                
                return (
                  <div
                    key={player.id || `empty-${idx}`}
                    className={`player-card ${isActive ? 'active' : ''} ${isEmpty ? 'is-empty' : ''}`}
                    style={{ '--player-color': COLOR_HEX[player.color] }}
                  >
                    <div className="player-color-dot" />
                    <div className="player-info">
                      <div className="player-name">
                        {isEmpty ? 'En attente...' : player.name}
                        {player.isAI && <span className="ai-tag">IA</span>}
                      </div>
                      {!isEmpty && (
                        <div className="player-tokens-count">
                          {finished}/4 pions arrivés
                        </div>
                      )}
                    </div>
                    {isActive && !isEmpty && (
                      <div className="active-indicator">
                        {diceRolling && player.isAI ? '🎲' : '▶'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              className="turn-indicator"
              style={{ '--player-color': COLOR_HEX[currentPlayer?.color] }}
            >
              <div className="turn-dot" />
              <span>
                {isHumanTurn ? '🎯 Votre tour' : `🤖 ${currentPlayer?.name} joue...`}
              </span>
            </div>

            <div className="dice-section-modern">
              <div className="turn-badge-modern" style={{ borderColor: COLOR_HEX[currentPlayer?.color] }}>
                <div className="turn-badge-dot" style={{ backgroundColor: COLOR_HEX[currentPlayer?.color] }} />
                <div className="turn-badge-info">
                  <span className="turn-badge-label">Tour de</span>
                  <span className="turn-badge-name">{currentPlayer?.name}</span>
                </div>
              </div>

              <Dice
                value={gameState.diceValue || lastDiceValue}
                rolling={diceRolling}
                onRoll={() => handleRollDice(false)}
                disabled={gameState.diceRolled || !isHumanTurn || gameState.state === 'WAITING'}
                currentColor={COLOR_HEX[currentPlayer?.color]}
                playerName={currentPlayer?.name}
              />
            </div>

            {isHumanTurn && gameState.diceRolled && gameState.movablePieces.length > 0 && (
              <div className="select-token-hint">
                ☝️ Sélectionnez un pion lumineux
              </div>
            )}
          </div>
        )}

        {/* Center — Board */}
        <div className="game-center">
          <div className="board-container">
            <LudoBoard
              gameState={gameState}
              onTokenClick={handleTokenClick}
              movablePieces={isHumanTurn ? gameState.movablePieces : []}
            />
          </div>
        </div>

        {/* Right panel — Desktop only */}
        {!isMobile && (
          <div className="game-right-panel">
            <div className="right-tabs">
              <button 
                className={`tab-btn ${activeTab === 'log' ? 'active' : ''}`}
                onClick={() => setActiveTab('log')}
              >
                📋 Journal
              </button>
              <button 
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                💬 Chat
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'log' ? (
                <div className="game-log" ref={logRef}>
                  {displayLog.length === 0 ? (
                    <div className="log-empty">La partie commence...</div>
                  ) : (
                    displayLog.map((entry, i) => (
                      <div key={i} className="log-entry">
                        <span className="log-time">{new Date(entry.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="log-text">{entry.text}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="chat-container">
                  <div className="chat-messages">
                    {messages.length === 0 ? (
                      <div className="log-empty">Aucun message...</div>
                    ) : (
                      messages.map((msg, i) => (
                        <div key={msg.id || i} className={`chat-bubble ${msg.user_id === user?.id ? 'mine' : ''}`}>
                          <div className="chat-author">{msg.username}</div>
                          <div className="chat-content">{msg.content}</div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <form className="chat-input-form" onSubmit={handleSendMessage}>
                    <input
                      type="text"
                      className="input chat-input"
                      placeholder="Votre message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" className="chat-send-btn">
                      <span>🚀</span>
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="score-section">
              <div className="log-header">📊 Progression</div>
              {gameState?.players?.map(player => {
                const finished = gameState?.tokens?.[player.color]?.filter(t => t.state === 'FINISHED').length || 0;
                return (
                  <div key={player.id} className="score-row" style={{ '--player-color': COLOR_HEX[player.color] || '#ccc' }}>
                    <span className="score-name">{player.name}</span>
                    <div className="score-bar"><div className="score-fill" style={{ width: `${(finished / 4) * 100}%` }} /></div>
                    <span className="score-pions">{finished}/4</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Dice Navigation Bar (Simplified) */}
      {isMobile && (
        <div className="mobile-tab-bar" style={{ justifyContent: 'center' }}>
          {/* Centered Integrated Mini-Dice */}
          <div className={`mtb-dice-container ${isHumanTurn && !gameState.diceRolled ? 'can-roll' : ''}`}>
            <Dice
              value={gameState.diceValue || lastDiceValue}
              rolling={diceRolling}
              onRoll={() => handleRollDice(false)}
              disabled={gameState.diceRolled || !isHumanTurn || gameState.state === 'WAITING'}
              currentColor={COLOR_HEX[currentPlayer?.color]}
              playerName={currentPlayer?.name}
            />
            {isHumanTurn && !gameState.diceRolled && <div className="dice-ping" />}
          </div>
        </div>
      )}

      {/* Winner Modal */}
      {showWinner && gameState.winner && (
        <div className="modal-overlay">
          <div className="winner-modal animate-bounce-in" id="winner-modal">
            {winnerIsHuman ? (
              <>
                <div className="winner-emoji">🏆</div>
                <h2 className="text-gradient-gold">Félicitations !</h2>
                <p style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>Vous avez gagné la partie !</p>
                {bet > 0 && <div className="winner-prize"><span>💰 Gains</span><span className="prize-amount">+{winnings}€</span></div>}
                <div className="confetti-container">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="confetti-piece" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, backgroundColor: ['#F5C518', '#EF4444', '#3B82F6', '#22C55E'][i % 4] }} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="winner-emoji">😔</div>
                <h2>Partie terminée</h2>
                <p style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-lg)' }}>
                  <span style={{ color: COLOR_HEX[gameState.winner] }}>{gameState?.players?.find(p => p.color === gameState.winner)?.name}</span> a remporté la victoire !
                </p>
                {bet > 0 && <p style={{ color: '#FCA5A5', fontSize: 'var(--text-base)' }}>Mise perdue : {bet}€</p>}
              </>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-8)' }}>
              <button className="btn btn-ghost" onClick={() => navigate('/lobby')} id="back-to-lobby-btn">← Retour au lobby</button>
              <button className="btn btn-gold" onClick={handleRestart} id="play-again-btn">🎲 Rejouer</button>
            </div>
          </div>
        </div>
      )}

      {/* Waiting Overlay */}
      {gameState.state === 'WAITING' && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 2000 }}>
          <div className="winner-modal animate-bounce-in" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
            <div className="spinner" style={{ width: 60, height: 60, margin: '0 auto var(--space-6)' }} />
            <h2 className="text-gradient-gold">Salle d'attente</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>En attente de joueurs... La partie commencera dès que l'adversaire aura rejoint.</p>
            {bet > 0 && <div className="escrow-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #F59E0B', color: '#F59E0B', padding: '8px 16px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)', fontWeight: 600 }}><span style={{ fontSize: '1.2em' }}>💰</span> Mise de {bet.toFixed(2)}€ prélevée au lancement</div>}
            {inviteCode && <div className="join-code-display" style={{ background: 'var(--bg-glass)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}><p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Code d'invitation</p><p style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--gold-primary)' }}>{inviteCode}</p></div>}
            <button className="btn btn-ghost" onClick={handleCancelWaiting} style={{ marginTop: 'var(--space-8)' }}>Annuler et quitter</button>
          </div>
        </div>
      )}

      {/* Quit confirm */}
      {showQuitConfirm && (
        <div className="modal-overlay" onClick={() => setShowQuitConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} id="quit-modal">
            <h3 style={{ marginBottom: 'var(--space-3)' }}>⚠️ Quitter la partie ?</h3>
            <p style={{ marginBottom: 'var(--space-6)' }}>{bet > 0 ? `Vous perdrez votre mise de ${bet}€ si vous quittez maintenant.` : 'Votre partie en cours sera perdue.'}</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}><button className="btn btn-ghost w-full" onClick={() => setShowQuitConfirm(false)}>Continuer à jouer</button><button className="btn btn-danger w-full" onClick={handleQuit} id="confirm-quit-btn">Quitter</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
