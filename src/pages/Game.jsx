// src/pages/Game.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
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

const HUMAN_PLAYER = { id: 'human', name: 'Vous', color: 'red', isAI: false };

function makeAIPlayer(color, name, difficulty) {
  return { id: `ai_${color}`, name, color, isAI: true, difficulty };
}

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, updateProfile, addTransaction } = useAuth();

  const { mode = '1v1', bet = 0, difficulty = 'medium' } = location.state || {};

  // Build players list
  const buildPlayers = () => {
    const human = { ...HUMAN_PLAYER };
    if (mode === 'solo' || mode === '1v1') {
      return [human, makeAIPlayer('blue', 'IA', difficulty)];
    }
    if (mode === '1v1v1') {
      return [human, makeAIPlayer('blue', 'IA 1', difficulty), makeAIPlayer('green', 'IA 2', difficulty)];
    }
    if (mode === '1v1v1v1') {
      return [human, makeAIPlayer('blue', 'IA 1', difficulty), makeAIPlayer('green', 'IA 2', difficulty), makeAIPlayer('yellow', 'IA 3', difficulty)];
    }
    return [human, makeAIPlayer('blue', 'IA', difficulty)];
  };

  const [players] = useState(buildPlayers);
  const [gameState, setGameState] = useState(() =>
    createInitialGameState(buildPlayers(), bet)
  );
  const [diceRolling, setDiceRolling] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [log, setLog] = useState([]);
  const logRef = useRef(null);
  const aiTimeoutRef = useRef(null);
  const winnerTimeoutRef = useRef(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = !currentPlayer?.isAI;

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameState.log]);

  // Detect winner
  useEffect(() => {
    if (gameState.winner) {
      winnerTimeoutRef.current = setTimeout(() => setShowWinner(true), 600);
      handleGameEnd(gameState.winner);
    }
    return () => clearTimeout(winnerTimeoutRef.current);
  }, [gameState.winner, handleGameEnd]);

  // AI turn
  useEffect(() => {
    if (!currentPlayer?.isAI || gameState.state !== GAME_STATE.PLAYING || gameState.winner) return;

    if (!gameState.diceRolled) {
      // AI rolls dice
      aiTimeoutRef.current = setTimeout(() => {
        handleRollDice(true);
      }, getAIThinkingDelay(currentPlayer.difficulty));
    } else if (gameState.movablePieces.length > 0) {
      // AI picks token
      aiTimeoutRef.current = setTimeout(() => {
        const tokenId = getAIMove(gameState, currentPlayer.difficulty);
        if (tokenId !== null) {
          setGameState(prev => moveToken(prev, tokenId));
        }
      }, getAIThinkingDelay(currentPlayer.difficulty));
    }

    return () => clearTimeout(aiTimeoutRef.current);
  }, [gameState.currentPlayerIndex, gameState.diceRolled, currentPlayer?.isAI]);

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
        // Auto-select if only one piece can move
        const auto = autoSelectIfOnePiece(newState);
        return auto || newState;
      });
      setDiceRolling(false);
    }, rollDelay);
  }, [diceRolling, isHumanTurn, gameState.diceRolled]);

  const handleTokenClick = useCallback((tokenId) => {
    if (!isHumanTurn || !gameState.diceRolled) return;
    if (!gameState.movablePieces.includes(tokenId)) return;
    setGameState(prev => moveToken(prev, tokenId));
  }, [isHumanTurn, gameState.diceRolled, gameState.movablePieces]);

  const handleGameEnd = useCallback((winnerColor) => {
    if (bet > 0 && winnerColor === 'red') {
      const winnings = bet * gameState.players.length * 0.95;
      addTransaction({
        type: 'win',
        amount: winnings,
        description: `🏆 Victoire ! Gains de partie ${mode}`,
      });
      updateProfile({
        gamesPlayed: (profile?.gamesPlayed || 0) + 1,
        gamesWon: (profile?.gamesWon || 0) + 1,
      });
    } else {
      updateProfile({
        gamesPlayed: (profile?.gamesPlayed || 0) + 1,
      });
    }
  }, [bet, mode, gameState.players.length, addTransaction, updateProfile, profile]);

  const handleQuit = () => {
    clearTimeout(aiTimeoutRef.current);
    navigate('/lobby');
  };

  const handleRestart = () => {
    clearTimeout(aiTimeoutRef.current);
    setGameState(createInitialGameState(buildPlayers(), bet));
    setShowWinner(false);
    setDiceRolling(false);
  };

  const winnerIsHuman = gameState.winner === 'red';
  const winnings = winnerIsHuman ? (bet * gameState.players.length * 0.95).toFixed(2) : 0;

  return (
    <div className="game-page">
      {/* Top bar */}
      <div className="game-topbar">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowQuitConfirm(true)}
          id="quit-btn"
        >
          ← Quitter
        </button>

        <div className="game-info-pills">
          <div className="game-pill">
            <span>🎮</span>
            <span>{mode === 'solo' ? 'Solo IA' : mode.toUpperCase()}</span>
          </div>
          {bet > 0 && (
            <div className="game-pill gold">
              <span>💰</span>
              <span>Pot: {(bet * gameState.players.length).toFixed(0)}€</span>
            </div>
          )}
          <div className="game-pill">
            <span>🔄</span>
            <span>Tour #{gameState.turn}</span>
          </div>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={handleRestart}
          id="restart-btn"
        >
          ↺ Recommencer
        </button>
      </div>

      <div className="game-layout">
        {/* Left panel — Players */}
        <div className="game-left-panel">
          <div className="players-list">
            {gameState.players.map((player, idx) => {
              const isActive = idx === gameState.currentPlayerIndex;
              const finishedCount = gameState.tokens[player.color]?.filter(t => t.state === 'FINISHED').length || 0;
              return (
                <div
                  key={player.id}
                  className={`player-card ${isActive ? 'active' : ''}`}
                  style={{ '--player-color': COLOR_HEX[player.color] }}
                  id={`player-${player.color}`}
                >
                  <div className="player-color-dot" />
                  <div className="player-info">
                    <span className="player-name">
                      {player.name}
                      {player.isAI && <span className="ai-tag">IA</span>}
                    </span>
                    <div className="player-tokens-count">
                      {'🏠'.repeat(4 - finishedCount)}{'🏁'.repeat(finishedCount)}
                    </div>
                  </div>
                  {isActive && (
                    <div className="active-indicator">
                      {diceRolling && player.isAI ? '🎲' : '▶'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Current player indicator */}
          <div
            className="turn-indicator"
            style={{ '--player-color': COLOR_HEX[currentPlayer?.color] }}
          >
            <div className="turn-dot" />
            <span>
              {isHumanTurn ? '🎯 Votre tour' : `🤖 ${currentPlayer?.name} joue...`}
            </span>
          </div>

          {/* Dice */}
          {isHumanTurn && (
            <div className="dice-section">
              <Dice
                value={gameState.diceValue}
                rolling={diceRolling}
                onRoll={() => handleRollDice(false)}
                disabled={gameState.diceRolled || !isHumanTurn}
                currentColor={COLOR_HEX[currentPlayer?.color]}
              />
            </div>
          )}

          {isHumanTurn && gameState.diceRolled && gameState.movablePieces.length > 0 && (
            <div className="select-token-hint">
              ☝️ Sélectionnez un pion lumineux
            </div>
          )}

          {!isHumanTurn && (
            <div className="ai-thinking">
              <div className="ai-thinking-dots">
                <span /><span /><span />
              </div>
              <span>{currentPlayer?.name} réfléchit...</span>
            </div>
          )}
        </div>

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

        {/* Right panel — Log */}
        <div className="game-right-panel">
          <div className="log-header">📋 Journal de partie</div>
          <div className="game-log" ref={logRef}>
            {gameState.log.length === 0 ? (
              <div className="log-empty">La partie commence...</div>
            ) : (
              [...gameState.log].reverse().map((entry, i) => (
                <div key={i} className="log-entry">
                  <span className="log-time">
                    {new Date(entry.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="log-text">{entry.text}</span>
                </div>
              ))
            )}
          </div>

          {/* Score */}
          <div className="score-section">
            <div className="log-header">📊 Progression</div>
            {gameState.players.map(player => {
              const finished = gameState.tokens[player.color]?.filter(t => t.state === 'FINISHED').length || 0;
              return (
                <div
                  key={player.id}
                  className="score-row"
                  style={{ '--player-color': COLOR_HEX[player.color] }}
                >
                  <span className="score-name">{player.name}</span>
                  <div className="score-bar">
                    <div
                      className="score-fill"
                      style={{ width: `${(finished / 4) * 100}%` }}
                    />
                  </div>
                  <span className="score-pions">{finished}/4</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Winner Modal */}
      {showWinner && gameState.winner && (
        <div className="modal-overlay">
          <div className="winner-modal animate-bounce-in" id="winner-modal">
            {winnerIsHuman ? (
              <>
                <div className="winner-emoji">🏆</div>
                <h2 className="text-gradient-gold">Félicitations !</h2>
                <p style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>
                  Vous avez gagné la partie !
                </p>
                {bet > 0 && (
                  <div className="winner-prize">
                    <span>💰 Gains</span>
                    <span className="prize-amount">+{winnings}€</span>
                  </div>
                )}
                <div className="confetti-container">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="confetti-piece"
                      style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`,
                        backgroundColor: ['#F5C518', '#EF4444', '#3B82F6', '#22C55E'][i % 4],
                      }}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="winner-emoji">😔</div>
                <h2>Partie terminée</h2>
                <p style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-lg)' }}>
                  <span style={{ color: COLOR_HEX[gameState.winner] }}>
                    {gameState.players.find(p => p.color === gameState.winner)?.name}
                  </span>
                  {' '}a remporté la victoire !
                </p>
                {bet > 0 && (
                  <p style={{ color: '#FCA5A5', fontSize: 'var(--text-base)' }}>
                    Mise perdue : {bet}€
                  </p>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-8)' }}>
              <button
                className="btn btn-ghost"
                onClick={() => navigate('/lobby')}
                id="back-to-lobby-btn"
              >
                ← Retour au lobby
              </button>
              <button
                className="btn btn-gold"
                onClick={handleRestart}
                id="play-again-btn"
              >
                🎲 Rejouer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quit confirm */}
      {showQuitConfirm && (
        <div className="modal-overlay" onClick={() => setShowQuitConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} id="quit-modal">
            <h3 style={{ marginBottom: 'var(--space-3)' }}>⚠️ Quitter la partie ?</h3>
            <p style={{ marginBottom: 'var(--space-6)' }}>
              {bet > 0
                ? `Vous perdrez votre mise de ${bet}€ si vous quittez maintenant.`
                : 'Votre partie en cours sera perdue.'
              }
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn btn-ghost w-full" onClick={() => setShowQuitConfirm(false)}>
                Continuer à jouer
              </button>
              <button className="btn btn-danger w-full" onClick={handleQuit} id="confirm-quit-btn">
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
