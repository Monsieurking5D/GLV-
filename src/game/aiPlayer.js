// src/game/aiPlayer.js
// IA adversaire pour GoldenLudo
// Stratégie: priorité capture > sortir pion maison > pion le plus avancé

import { TOKEN_STATE, calculateNewPosition } from './ludoEngine.js';
import { SAFE_CELLS, START_POSITIONS } from './boardConfig.js';

/**
 * Stratégie IA — choisit quel pion déplacer
 * Niveau de difficulté: 'easy', 'medium', 'hard'
 */
export function getAIMove(gameState, difficulty = 'medium') {
  const { players, currentPlayerIndex, diceValue, tokens } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const color = currentPlayer.color;
  const movable = gameState.movablePieces;

  if (movable.length === 0) return null;
  if (movable.length === 1) return movable[0];

  // Facile: choix aléatoire
  if (difficulty === 'easy') {
    return movable[Math.floor(Math.random() * movable.length)];
  }

  const playerTokens = tokens[color];
  const scoredMoves = movable.map(tokenId => {
    const token = playerTokens[tokenId];
    let score = 0;

    const newPos = calculateNewPosition(token, diceValue, color);
    if (!newPos) return { tokenId, score: -1 };

    // Si le token termine → score très élevé
    if (newPos.state === TOKEN_STATE.FINISHED) {
      score += 1000;
      return { tokenId, score };
    }

    // Sortir un pion de la maison (sur 6)
    if (token.state === TOKEN_STATE.HOME) {
      score += 50;
    }

    // Dans le couloir final → priorité
    if (newPos.homeStretchPos >= 0) {
      score += 200 + newPos.homeStretchPos * 20;
    }

    // Position avancée du pion sur le plateau
    if (newPos.position >= 0 && newPos.homeStretchPos < 0) {
      const startPos = START_POSITIONS[color];
      const relPos = (newPos.position - startPos + 52) % 52;
      score += relPos;
    }

    // Bonus capture potentielle
    if (newPos.homeStretchPos < 0 && newPos.position >= 0) {
      const cellPos = newPos.position;
      const isSafe = SAFE_CELLS.has(cellPos) || cellPos === START_POSITIONS[color];
      if (!isSafe) {
        players.forEach(p => {
          if (p.color === color) return;
          tokens[p.color].forEach(enemyToken => {
            if (
              enemyToken.state === TOKEN_STATE.ACTIVE &&
              enemyToken.homeStretchPos < 0 &&
              enemyToken.position === cellPos
            ) {
              score += 300; // Capture
            }
          });
        });
      }
    }

    // Malus si la nouvelle position est dangereuse (case non-sûre avec ennemi proche)
    if (difficulty === 'hard' && newPos.homeStretchPos < 0 && newPos.position >= 0) {
      const cellPos = newPos.position;
      const isSafe = SAFE_CELLS.has(cellPos) || cellPos === START_POSITIONS[color];
      if (!isSafe) {
        // Vérifier si un ennemi peut nous capturer au prochain tour
        players.forEach(p => {
          if (p.color === color) return;
          tokens[p.color].forEach(enemyToken => {
            if (enemyToken.state !== TOKEN_STATE.ACTIVE || enemyToken.homeStretchPos >= 0) return;
            const enemyRelPos = (enemyToken.position - START_POSITIONS[p.color] + 52) % 52;
            const ourRelPos = (cellPos - START_POSITIONS[p.color] + 52) % 52;
            const dist = (ourRelPos - enemyRelPos + 52) % 52;
            if (dist >= 1 && dist <= 6) {
              score -= 100;
            }
          });
        });
      }
    }

    return { tokenId, score };
  });

  // Trier par score décroissant
  scoredMoves.sort((a, b) => b.score - a.score);
  return scoredMoves[0].tokenId;
}

/**
 * Délai de réflexion de l'IA (simule la réflexion)
 */
export function getAIThinkingDelay(difficulty) {
  const delays = {
    easy: 600,
    medium: 900,
    hard: 1200,
  };
  return delays[difficulty] || 900;
}
