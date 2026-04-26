// src/components/LudoBoard.jsx
// Plateau de jeu Ludo classique — SVG 15x15 (style coloré clair)
// API conservée: { gameState, onTokenClick, movablePieces }

import { memo } from 'react';
import {
  MAIN_PATH_COORDS,
  HOME_STRETCH_COORDS,
  HOME_ZONE_TOKENS,
  COLOR_HEX,
  SAFE_CELLS,
  START_POSITIONS,
} from '../game/boardConfig.js';
import { TOKEN_STATE } from '../game/ludoEngine.js';
import './LudoBoard.css';

const S = 600;          // taille interne du SVG (viewBox)
const N = 15;           // grille 15x15
const CELL = S / N;
const PIN_R = CELL * 0.34;

// --- Helpers --------------------------------------------------------------

function cellXY(col, row) {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

// Étoile à 5 branches centrée sur (cx, cy)
function starPath(cx, cy, rOuter, rInner = rOuter * 0.45) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
  }
  return `M${points.join(' L')} Z`;
}

// Couleur de la zone d'accueil pour chaque coin (correspond au layout du moteur)
const HOME_QUADRANTS = [
  { color: 'red',    x: 0, y: 9 },  // bas-gauche
  { color: 'green',  x: 9, y: 0 },  // haut-droite
  { color: 'blue',   x: 0, y: 0 },  // haut-gauche  (selon HOME_ZONE_TOKENS yellow→haut-gauche; on suit le moteur)
  { color: 'yellow', x: 9, y: 9 },  // bas-droite
];

// On lit HOME_ZONE_TOKENS pour mapper la couleur au coin réellement utilisé
function quadrantsFromConfig() {
  return Object.entries(HOME_ZONE_TOKENS).map(([color, tokens]) => {
    const [c, r] = tokens[0];
    const x = c < 6 ? 0 : 9;
    const y = r < 6 ? 0 : 9;
    return { color, x, y };
  });
}

// Couleur de fond d'une cellule du chemin (couloirs finaux + cases de départ)
function pathCellFill(col, row) {
  // Couloirs finaux (ligne col=7 verticale, row=7 horizontale)
  if (col === 7 && row >= 1 && row <= 6) return COLOR_HEX.green;
  if (col === 7 && row >= 8 && row <= 13) return COLOR_HEX.red;
  if (row === 7 && col >= 1 && col <= 6) return COLOR_HEX.blue;
  if (row === 7 && col >= 8 && col <= 13) return COLOR_HEX.yellow;

  // Cases de départ colorées (juste devant chaque maison)
  // RED start = MAIN_PATH_COORDS[0] = (6,13) ; GREEN = (8,1) ; BLUE = (1,6) ; YELLOW = (13,8)
  const startCol = (color) => {
    const [c, r] = MAIN_PATH_COORDS[START_POSITIONS[color]];
    return c === col && r === row;
  };
  if (startCol('red'))    return COLOR_HEX.red;
  if (startCol('green'))  return COLOR_HEX.green;
  if (startCol('blue'))   return COLOR_HEX.blue;
  if (startCol('yellow')) return COLOR_HEX.yellow;

  return '#FFFFFF';
}

// Une cellule appartient-elle au chemin (croix blanche) ?
function isPathCell(col, row) {
  const inVerticalArm = (col >= 6 && col <= 8) && (row < 6 || row > 8);
  const inHorizontalArm = (row >= 6 && row <= 8) && (col < 6 || col > 8);
  return inVerticalArm || inHorizontalArm;
}

// --- Composant ------------------------------------------------------------

const LudoBoard = memo(({ gameState, onTokenClick, movablePieces = [] }) => {
  if (!gameState) return null;

  const { tokens, players, currentPlayerIndex } = gameState;
  const currentColor = players?.[currentPlayerIndex]?.color;
  const quadrants = quadrantsFromConfig();

  function getTokenXY(token) {
    if (token.state === TOKEN_STATE.HOME) {
      const slots = HOME_ZONE_TOKENS[token.color];
      const [c, r] = slots[token.id % slots.length];
      return cellXY(c, r);
    }
    if (token.state === TOKEN_STATE.FINISHED) {
      // On place les pions dans leur triangle respectif au centre
      const offset = CELL * 0.6;
      const spread = [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]];
      const [sx, sy] = spread[token.id] || [0, 0];
      
      let bx = S / 2;
      let by = S / 2;

      if (token.color === 'red')    by += offset;
      if (token.color === 'green')  by -= offset;
      if (token.color === 'blue')   bx -= offset;
      if (token.color === 'yellow') bx += offset;

      return { x: bx + sx * CELL, y: by + sy * CELL };
    }
    if (token.homeStretchPos >= 0) {
      const coords = HOME_STRETCH_COORDS[token.color];
      const [c, r] = coords[token.homeStretchPos] || [7, 7];
      return cellXY(c, r);
    }
    const [c, r] = MAIN_PATH_COORDS[token.position] || [0, 0];
    return cellXY(c, r);
  }

  // Détecter empilement: si plusieurs pions sur même cellule, on les disperse
  function getStackOffset(token, allTokens) {
    if (token.state !== TOKEN_STATE.ACTIVE || token.homeStretchPos >= 0) return { dx: 0, dy: 0 };
    const sameCell = [];
    Object.values(allTokens).forEach((arr) => {
      arr.forEach((t) => {
        if (
          t.state === TOKEN_STATE.ACTIVE &&
          t.homeStretchPos < 0 &&
          t.position === token.position
        ) {
          sameCell.push(`${t.color}-${t.id}`);
        }
      });
    });
    if (sameCell.length <= 1) return { dx: 0, dy: 0 };
    const idx = sameCell.indexOf(`${token.color}-${token.id}`);
    const angle = (Math.PI * 2 * idx) / sameCell.length;
    const r = CELL * 0.18;
    return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r };
  }

  const isMovable = (token) =>
    token.color === currentColor && movablePieces.includes(token.id);

  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      width="100%"
      height="100%"
      className="ludo-board-svg"
      role="img"
      aria-label="Plateau de Ludo"
    >
      <defs>
        <filter id="lb-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.35)" />
        </filter>
        <filter id="lb-pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="rgba(0,0,0,0.45)" />
        </filter>
        {Object.entries(COLOR_HEX).map(([c, hex]) => (
          <radialGradient
            key={`grad-${c}`}
            id={`pin-grad-${c}`}
            cx="35%"
            cy="35%"
            r="65%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="35%" stopColor={hex} stopOpacity="1" />
            <stop offset="100%" stopColor={hex} stopOpacity="1" />
          </radialGradient>
        ))}
      </defs>

      {/* 1) Fond global */}
      <rect width={S} height={S} fill="#FFFFFF" />

      {/* 2) Quadrants colorés (zones d'accueil) */}
      {quadrants.map(({ color, x, y }) => (
        <g key={`q-${color}`}>
          <rect
            x={x * CELL}
            y={y * CELL}
            width={6 * CELL}
            height={6 * CELL}
            fill={COLOR_HEX[color]}
            rx="8"
          />
          {/* Carré blanc intérieur */}
          <rect
            x={(x + 0.8) * CELL}
            y={(y + 0.8) * CELL}
            width={4.4 * CELL}
            height={4.4 * CELL}
            fill="#FFFFFF"
            rx="4"
          />
          {/* Cercles de socle pour les pions dans la maison */}
          {HOME_ZONE_TOKENS[color].map(([c, r], i) => {
            const { x: cx, y: cy } = cellXY(c, r);
            return (
              <circle
                key={`base-${color}-${i}`}
                cx={cx}
                cy={cy}
                r={CELL * 0.4}
                fill={COLOR_HEX[color]}
                opacity="0.15"
              />
            );
          })}
        </g>
      ))}

      {/* 3) Grille du chemin (croix blanche + couloirs colorés) */}
      {Array.from({ length: N }).map((_, row) =>
        Array.from({ length: N }).map((_, col) => {
          if (!isPathCell(col, row)) return null;
          return (
            <rect
              key={`p-${col}-${row}`}
              x={col * CELL}
              y={row * CELL}
              width={CELL}
              height={CELL}
              fill={pathCellFill(col, row)}
              stroke="rgba(0,0,0,0.12)"
              strokeWidth="0.5"
            />
          );
        })
      )}

      {/* 4) Étoiles sur cases sûres */}
      {[...SAFE_CELLS].map((idx) => {
        const [c, r] = MAIN_PATH_COORDS[idx] || [];
        if (c == null) return null;
        
        // Ne pas afficher d'étoile sur les cases de départ colorées
        if (Object.values(START_POSITIONS).includes(idx)) return null;

        const { x, y } = cellXY(c, r);
        return (
          <path
            key={`star-${idx}`}
            d={starPath(x, y, CELL * 0.35)}
            fill="none"
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        );
      })}

      {/* 5) Flèches d'entrée sur les départs */}
      {Object.entries(START_POSITIONS).map(([color]) => {
        const arrows = {
          blue:   { x: 0,        y: 7.5 * CELL, rot: 0,   tx: CELL * 0.55, ty: 0 },
          green:  { x: 7.5*CELL, y: 0,          rot: 90,  tx: 0,           ty: CELL * 0.55 },
          yellow: { x: 15*CELL,  y: 7.5*CELL,   rot: 180, tx: -CELL*0.55,  ty: 0 },
          red:    { x: 7.5*CELL, y: 15*CELL,    rot: -90, tx: 0,           ty: -CELL*0.55 },
        };
        const a = arrows[color];
        if (!a) return null;
        return (
          <g key={`arr-${color}`} transform={`translate(${a.x + a.tx}, ${a.y + a.ty}) rotate(${a.rot})`}>
            <path
              d={`M -${CELL*0.2} 0 L ${CELL*0.2} -${CELL*0.15} L ${CELL*0.2} ${CELL*0.15} Z`}
              fill={COLOR_HEX[color]}
              opacity="0.6"
            />
          </g>
        );
      })}

      {/* 6) Centre — triangles */}
      {(() => {
        const cx = 7.5 * CELL;
        const cy = 7.5 * CELL;
        const tri = (color, points) => (
          <polygon points={points} fill={COLOR_HEX[color]} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        );
        return (
          <g>
            {tri('green',  `${6*CELL},${6*CELL} ${9*CELL},${6*CELL} ${cx},${cy}`)}
            {tri('yellow', `${9*CELL},${6*CELL} ${9*CELL},${9*CELL} ${cx},${cy}`)}
            {tri('red',    `${9*CELL},${9*CELL} ${6*CELL},${9*CELL} ${cx},${cy}`)}
            {tri('blue',   `${6*CELL},${9*CELL} ${6*CELL},${6*CELL} ${cx},${cy}`)}
          </g>
        );
      })()}

      {/* 7) Pions Style "Location Marker" */}
      {tokens && Object.values(tokens).map((arr) =>
        arr.map((token) => {
          const { x: bx, y: by } = getTokenXY(token);
          const { dx, dy } = getStackOffset(token, tokens);
          const x = bx + dx;
          const y = by + dy;
          const movable = isMovable(token);
          const mainColor = COLOR_HEX[token.color];

          return (
            <g
              key={`tok-${token.color}-${token.id}`}
              className={`lb-token ${movable ? 'lb-token--movable' : ''}`}
              onClick={() => movable && onTokenClick && onTokenClick(token.id)}
              style={{ cursor: movable ? 'pointer' : 'default' }}
            >
              {movable && (
                <circle
                  cx={x}
                  cy={y}
                  r={PIN_R + 8}
                  className="lb-token-ring"
                  fill="none"
                  stroke={mainColor}
                  strokeWidth="3"
                  strokeDasharray="4 2"
                />
              )}

              {/* Forme de goutte blanche (Map Pin) */}
              <path
                d={`
                  M ${x} ${y + PIN_R * 1.2}
                  L ${x - PIN_R * 0.8} ${y}
                  A ${PIN_R} ${PIN_R} 0 1 1 ${x + PIN_R * 0.8} ${y}
                  Z
                `}
                fill="#FFFFFF"
                filter="url(#lb-pin-shadow)"
                stroke="rgba(0,0,0,0.1)"
                strokeWidth="0.5"
              />
              
              {/* Cercle de couleur intérieur */}
              <circle 
                cx={x} 
                cy={y - PIN_R * 0.2} 
                r={PIN_R * 0.55} 
                fill={mainColor} 
              />

              {/* Reflet sur le cercle intérieur */}
              <circle 
                cx={x - PIN_R * 0.2} 
                cy={y - PIN_R * 0.4} 
                r={PIN_R * 0.2} 
                fill="#FFFFFF" 
                opacity="0.3" 
              />
            </g>
          );
        })
      )}

      {/* 8) Bordure extérieure dorée */}
      <rect
        x="1.5"
        y="1.5"
        width={S - 3}
        height={S - 3}
        fill="none"
        stroke="#F5C518"
        strokeWidth="3"
        rx="6"
      />
    </svg>
  );
});

export default LudoBoard;
