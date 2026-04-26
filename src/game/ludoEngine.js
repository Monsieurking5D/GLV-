// src/game/ludoEngine.js
// Moteur de jeu Ludo complet — traduit depuis la logique Unity C# de maverick-360/Ludo
// Règles: 2-4 joueurs, dé standard, captures, zones sûres, couloir final

import {
  COLORS,
  START_POSITIONS,
  HOME_ENTRY,
  SAFE_CELLS,
  HOME_STRETCH_START,
  HOME_STRETCH_LENGTH,
  FINAL_POSITION,
} from './boardConfig.js';

export const TOKEN_STATE = {
  HOME: 'HOME',       // En attente dans la maison
  ACTIVE: 'ACTIVE',  // Sur le plateau
  FINISHED: 'FINISHED', // Arrivé au centre
};

export const GAME_STATE = {
  WAITING: 'WAITING',
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED',
};

// =====================
// Init
// =====================

export function createInitialGameState(players, betAmount = 0, isSolo = false) {
  const tokens = {};
  const scores = {};

  players.forEach(player => {
    tokens[player.color] = [0, 1, 2, 3].map(i => ({
      id: i,
      color: player.color,
      state: TOKEN_STATE.HOME,
      position: -1, // -1 = en maison
      homeStretchPos: -1, // -1 = pas dans couloir final
    }));
    scores[player.color] = 0;
  });

  // Si c'est solo, on commence direct. Sinon on attend que les participants humains soient là.
  const initialState = isSolo ? GAME_STATE.PLAYING : GAME_STATE.WAITING;

  return {
    state: initialState,
    players,
    currentPlayerIndex: 0,
    tokens,
    scores,
    diceValue: null,
    diceRolled: false,
    consecutiveSixes: 0,
    movablePieces: [],
    winner: null,
    betAmount,
    pot: betAmount * players.length,
    log: [],
    turn: 1,
  };
}

// =====================
// Dice
// =====================

export function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// =====================
// Game Logic
// =====================

/**
 * Calcule les pions pouvant se déplacer après un lancer de dé
 * Règles Unity: 
 * - Si dé=6 → peut sortir un pion de la maison OU bouger un pion actif
 * - Sinon → seulement les pions actifs
 */
export function getMovablePieces(gameState) {
  const { players, currentPlayerIndex, diceValue, tokens } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const color = currentPlayer.color;
  const playerTokens = tokens[color];

  const movable = [];

  playerTokens.forEach(token => {
    if (token.state === TOKEN_STATE.FINISHED) return;

    if (token.state === TOKEN_STATE.HOME) {
      // Peut sortir uniquement sur un 6
      if (diceValue === 6) {
        movable.push({ color, id: token.id });
      }
    } else if (token.state === TOKEN_STATE.ACTIVE) {
      // Un pion actif peut toujours bouger si sa position finale ne dépasse pas le centre
      const canMove = (token.position + diceValue) <= FINAL_POSITION;
      if (canMove) {
        movable.push({ color, id: token.id });
      }
    }
  });

  return movable;
}

/**
 * Calcule la nouvelle position d'un pion
 * Retourne null si le mouvement est invalide (dépasserait la fin)
 */
export function calculateNewPosition(token, steps, color) {
  const totalPath = 52 + HOME_STRETCH_LENGTH; // 58 positions totales

  if (token.state === TOKEN_STATE.HOME) {
    if (steps === 6) {
      return { position: START_POSITIONS[color], homeStretchPos: -1, state: TOKEN_STATE.ACTIVE };
    }
    return null;
  }

  if (token.state === TOKEN_STATE.ACTIVE) {
    const startPos = START_POSITIONS[color];
    const homeEntry = HOME_ENTRY[color];

    // Position relative depuis le départ
    let relativePos = (token.position - startPos + 52) % 52;

    // Est-ce qu'on va entrer dans le couloir final?
    const homeEntryRelative = (homeEntry - startPos + 52) % 52;

    if (relativePos <= homeEntryRelative && relativePos + steps > homeEntryRelative) {
      // On entre dans le couloir final
      const stepsIntoStretch = steps - (homeEntryRelative - relativePos);

      if (stepsIntoStretch > HOME_STRETCH_LENGTH) return null; // Trop loin

      const newStretchPos = stepsIntoStretch - 1;
      const isFinished = stepsIntoStretch === HOME_STRETCH_LENGTH;

      return {
        position: token.position,
        homeStretchPos: newStretchPos,
        state: isFinished ? TOKEN_STATE.FINISHED : TOKEN_STATE.ACTIVE,
      };
    }

    // Déjà dans le couloir final
    if (token.homeStretchPos >= 0) {
      const newStretchPos = token.homeStretchPos + steps;
      if (newStretchPos > HOME_STRETCH_LENGTH - 1) return null; // Trop loin

      const isFinished = newStretchPos === HOME_STRETCH_LENGTH - 1;
      return {
        position: token.position,
        homeStretchPos: newStretchPos,
        state: isFinished ? TOKEN_STATE.FINISHED : TOKEN_STATE.ACTIVE,
      };
    }

    // Mouvement normal sur le plateau
    const newAbsPos = (token.position + steps) % 52;
    return {
      position: newAbsPos,
      homeStretchPos: -1,
      state: TOKEN_STATE.ACTIVE,
    };
  }

  return null;
}

/**
 * Applique le mouvement d'un pion
 * Retourne le nouvel état du jeu
 */
export function moveToken(gameState, tokenData) {
  const { players, currentPlayerIndex, diceValue, tokens } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const color = currentPlayer.color;

  const tokenId = (typeof tokenData === 'object' && tokenData !== null) ? tokenData.id : tokenData;
  const newTokens = JSON.parse(JSON.stringify(tokens));
  const token = newTokens[color][tokenId];
  const newState = calculateNewPosition(token, diceValue, color);

  if (!newState) return gameState;

  const oldState = token.state;
  Object.assign(token, newState);

  const log = [...gameState.log];
  let extraTurn = false;
  let captures = 0;

  // Vérifier capture: si pion actif atterrit sur une case non-sûre avec ennemi
  if (token.state === TOKEN_STATE.ACTIVE && token.homeStretchPos < 0) {
    const cellPos = token.position;
    const isSafe = SAFE_CELLS.has(cellPos) || cellPos === START_POSITIONS[color];

    if (!isSafe) {
      players.forEach(p => {
        if (p.color === color) return;
        newTokens[p.color].forEach(enemyToken => {
          if (
            enemyToken.state === TOKEN_STATE.ACTIVE &&
            enemyToken.homeStretchPos < 0 &&
            enemyToken.position === cellPos
          ) {
            enemyToken.state = TOKEN_STATE.HOME;
            enemyToken.position = -1;
            enemyToken.homeStretchPos = -1;
            captures++;
            log.push({ text: `💥 ${color} a capturé un pion ${p.color} !`, time: Date.now() });
          }
        });
      });
    }
  }

  // Mise à jour scores
  const scores = { ...gameState.scores };
  if (token.state === TOKEN_STATE.FINISHED) {
    scores[color] = (scores[color] || 0) + 1;
    log.push({ text: `🏁 ${color} a amené un pion à la maison ! (${scores[color]}/4)`, time: Date.now() });
  }

  // Extra tour: dé=6, capture, ou arrivée d'un pion
  if (diceValue === 6 || captures > 0 || token.state === TOKEN_STATE.FINISHED) {
    extraTurn = true;
    const reason = diceValue === 6 ? 'six' : (captures > 0 ? 'capture' : 'arrivée');
    log.push({ text: `🎲 ${color} rejoue ! (${reason})`, time: Date.now() });
  }

  // Vérifier victoire
  let winner = null;
  const finishedCount = newTokens[color].filter(t => t.state === TOKEN_STATE.FINISHED).length;
  if (finishedCount === 4) {
    winner = color;
    log.push({ text: `🏆 ${color.toUpperCase()} GAGNE LA PARTIE !`, time: Date.now() });
  }

  // Prochain joueur
  let nextPlayerIndex = currentPlayerIndex;
  let consecutiveSixes = gameState.consecutiveSixes;

  if (!winner) {
    if (extraTurn) {
      if (diceValue === 6) {
        consecutiveSixes += 1;
        // 3 fois 6 consécutifs → perd son tour (règle Unity)
        if (consecutiveSixes >= 3) {
          consecutiveSixes = 0;
          extraTurn = false;
          nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
          log.push({ text: `⛔ ${color} a 3 six consécutifs — perd son tour !`, time: Date.now() });
        }
      } else {
        consecutiveSixes = 0;
      }
    } else {
      consecutiveSixes = 0;
      nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    }
  }

  return {
    ...gameState,
    tokens: newTokens,
    scores,
    diceRolled: false,
    movablePieces: [],
    currentPlayerIndex: nextPlayerIndex,
    consecutiveSixes,
    winner,
    log,
    turn: extraTurn ? gameState.turn : gameState.turn + 1,
  };
}

/**
 * Après avoir lancé le dé, calculer les pions mouvables
 * Si aucun pion ne peut bouger → passer au joueur suivant
 */
export function processDiceRoll(gameState, diceValue) {
  const newState = {
    ...gameState,
    diceValue,
    diceRolled: true,
    log: [...gameState.log, { text: `🎲 ${gameState.players[gameState.currentPlayerIndex].color} lance ${diceValue}`, time: Date.now() }],
  };

  const movable = getMovablePieces(newState);
  newState.movablePieces = movable;

  // Aucun pion mouvable → passer au suivant
  if (movable.length === 0) {
    const nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    return {
      ...newState,
      diceRolled: false,
      diceValue: null,
      currentPlayerIndex: nextIndex,
      log: [...newState.log, { text: `${gameState.players[gameState.currentPlayerIndex].color} ne peut pas bouger.`, time: Date.now() }],
      consecutiveSixes: 0,
    };
  }

  // Si un seul pion mouvable → auto-select (optionnel, ici on laisse le joueur choisir)
  return newState;
}

/**
 * Auto-sélection si un seul pion peut bouger
 */
export function autoSelectIfOnePiece(gameState) {
  if (gameState.movablePieces.length === 1 && gameState.diceRolled) {
    return moveToken(gameState, gameState.movablePieces[0]);
  }
  return null;
}

/**
 * Vérifier si le jeu est terminé
 */
export function checkWinner(gameState) {
  return gameState.winner;
}
