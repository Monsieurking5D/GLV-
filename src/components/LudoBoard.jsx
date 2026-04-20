// src/components/LudoBoard.jsx
// Plateau de jeu Ludo interactif — SVG 15x15

import { MAIN_PATH_COORDS, HOME_STRETCH_COORDS, HOME_ZONE_TOKENS, COLOR_HEX, COLOR_LIGHT_HEX, SAFE_CELLS, START_POSITIONS } from '../game/boardConfig.js';
import { TOKEN_STATE } from '../game/ludoEngine.js';

const S = 600; // SVG size
const CELL = S / 15;
const R_TOKEN = CELL * 0.34;

// Position SVG d'une cellule [col, row]
function cellXY(col, row) {
  return {
    x: col * CELL + CELL / 2,
    y: row * CELL + CELL / 2,
  };
}

export default function LudoBoard({ gameState, onTokenClick, movablePieces = [] }) {
  if (!gameState) return null;

  const { tokens, players } = gameState;

  // Calculer la position SVG d'un token
  function getTokenXY(token) {
    if (token.state === TOKEN_STATE.HOME) {
      const homeCoords = HOME_ZONE_TOKENS[token.color];
      if (!homeCoords) return { x: 0, y: 0 };
      const [col, row] = homeCoords[token.id % homeCoords.length] || homeCoords[0];
      return cellXY(col, row);
    }
    if (token.state === TOKEN_STATE.FINISHED) {
      // Centre du plateau
      const offsets = [[0,-0.15],[0.15,0],[-0.15,0],[0,0.15]];
      const [dx, dy] = offsets[token.id] || [0, 0];
      return { x: S / 2 + dx * CELL, y: S / 2 + dy * CELL };
    }
    if (token.homeStretchPos >= 0) {
      const coords = HOME_STRETCH_COORDS[token.color];
      if (!coords || !coords[token.homeStretchPos]) return { x: 0, y: 0 };
      const [col, row] = coords[token.homeStretchPos];
      return cellXY(col, row);
    }
    // Sur le plateau principal
    const coords = MAIN_PATH_COORDS[token.position];
    if (!coords) return { x: 0, y: 0 };
    const [col, row] = coords;
    return cellXY(col, row);
  }

  const isMovable = (token) =>
    movablePieces.includes(token.id) &&
    players[gameState.currentPlayerIndex]?.color === token.color;

  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      width="100%"
      height="100%"
      style={{ display: 'block', maxWidth: S, maxHeight: S }}
      className="ludo-board-svg"
    >
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#111130" />
          <stop offset="100%" stopColor="#0C0C22" />
        </radialGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.5)" />
        </filter>
        <filter id="glow-gold">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width={S} height={S} fill="url(#bgGrad)" rx={8} />

      {/* Grid cells */}
      {Array.from({ length: 15 }).map((_, row) =>
        Array.from({ length: 15 }).map((_, col) => {
          const x = col * CELL;
          const y = row * CELL;

          // Home zones
          const isTopLeft = col < 6 && row < 6;     // Green
          const isTopRight = col >= 9 && row < 6;    // Yellow
          const isBotLeft = col < 6 && row >= 9;     // Blue
          const isBotRight = col >= 9 && row >= 9;   // Red
          const isCenter = col >= 6 && col < 9 && row >= 6 && row < 9;

          let cellFill = '#111130';
          let cellOpacity = 1;

          if (isTopLeft) { cellFill = '#22C55E'; cellOpacity = 0.15; }
          else if (isTopRight) { cellFill = '#F59E0B'; cellOpacity = 0.15; }
          else if (isBotLeft) { cellFill = '#3B82F6'; cellOpacity = 0.15; }
          else if (isBotRight) { cellFill = '#EF4444'; cellOpacity = 0.15; }
          else if (isCenter) { cellFill = '#0A0A1A'; cellOpacity = 1; }

          // Column corridors
          if (col === 7 && !isCenter) { cellFill = '#22C55E'; cellOpacity = 0.20; }
          if (col === 7 && row < 6 && !isCenter) { cellFill = '#22C55E'; cellOpacity = 0.25; }
          if (col === 7 && row > 8 && !isCenter) { cellFill = '#EF4444'; cellOpacity = 0.25; }

          // Row corridors
          if (row === 7 && !isCenter) { cellFill = '#3B82F6'; cellOpacity = 0.20; }
          if (row === 7 && col < 6) { cellFill = '#3B82F6'; cellOpacity = 0.25; }
          if (row === 7 && col > 8) { cellFill = '#F59E0B'; cellOpacity = 0.25; }

          return (
            <rect
              key={`${col}-${row}`}
              x={x} y={y}
              width={CELL} height={CELL}
              fill={cellFill}
              fillOpacity={cellOpacity}
              stroke="#F5C51812"
              strokeWidth={0.5}
            />
          );
        })
      )}

      {/* Safe cells — stars */}
      {MAIN_PATH_COORDS.map(([col, row], idx) => {
        if (!SAFE_CELLS.has(idx)) return null;
        const { x, y } = cellXY(col, row);
        return (
          <text
            key={`star-${idx}`}
            x={x} y={y + 5}
            textAnchor="middle"
            fontSize={CELL * 0.5}
            fill="#F5C518"
            opacity={0.7}
          >
            ★
          </text>
        );
      })}

      {/* Start positions */}
      {Object.entries(START_POSITIONS).map(([color, pos]) => {
        const [col, row] = MAIN_PATH_COORDS[pos] || [0, 0];
        const { x, y } = cellXY(col, row);
        return (
          <circle
            key={`start-${color}`}
            cx={x} cy={y}
            r={CELL * 0.38}
            fill={COLOR_HEX[color]}
            fillOpacity={0.25}
            stroke={COLOR_HEX[color]}
            strokeWidth={1.5}
            strokeOpacity={0.6}
          />
        );
      })}

      {/* Home zones — inner circles */}
      {[
        { color: 'green', cx: 3, cy: 3 },
        { color: 'yellow', cx: 12, cy: 3 },
        { color: 'blue', cx: 3, cy: 12 },
        { color: 'red', cx: 12, cy: 12 },
      ].map(({ color, cx, cy }) => (
        <g key={`zone-${color}`}>
          <rect
            x={cx === 3 ? 0 : 9} y={cy === 3 ? 0 : 9}
            width={6 * CELL} height={6 * CELL}
            fill={COLOR_HEX[color]}
            fillOpacity={0.12}
            stroke={COLOR_HEX[color]}
            strokeOpacity={0.3}
            strokeWidth={1}
          />
          <rect
            x={(cx === 3 ? 0.6 : 9.6) * CELL}
            y={(cy === 3 ? 0.6 : 9.6) * CELL}
            width={4.8 * CELL} height={4.8 * CELL}
            rx={CELL * 0.4}
            fill={COLOR_HEX[color]}
            fillOpacity={0.22}
            stroke={COLOR_HEX[color]}
            strokeOpacity={0.35}
            strokeWidth={1}
          />
        </g>
      ))}

      {/* Center — winner triangles */}
      <polygon
        points={`${7*CELL},${7*CELL} ${8*CELL},${7*CELL} ${7.5*CELL},${6.2*CELL}`}
        fill="#22C55E" opacity={0.75}
      />
      <polygon
        points={`${8*CELL},${7*CELL} ${8*CELL},${8*CELL} ${8.8*CELL},${7.5*CELL}`}
        fill="#F59E0B" opacity={0.75}
      />
      <polygon
        points={`${7*CELL},${8*CELL} ${8*CELL},${8*CELL} ${7.5*CELL},${8.8*CELL}`}
        fill="#EF4444" opacity={0.75}
      />
      <polygon
        points={`${7*CELL},${7*CELL} ${7*CELL},${8*CELL} ${6.2*CELL},${7.5*CELL}`}
        fill="#3B82F6" opacity={0.75}
      />
      <rect
        x={7*CELL+2} y={7*CELL+2}
        width={CELL-4} height={CELL-4}
        fill="#F5C518"
        rx={3}
      />
      <text
        x={S/2} y={S/2 + 6}
        textAnchor="middle"
        fontSize={CELL * 0.65}
        fill="#0A0A1A"
        fontWeight="bold"
      >★</text>

      {/* Tokens */}
      {players && Object.values(tokens).map(playerTokens =>
        playerTokens.map(token => {
          const { x, y } = getTokenXY(token);
          const movable = isMovable(token);
          const color = COLOR_HEX[token.color];
          const lightColor = COLOR_LIGHT_HEX[token.color];

          return (
            <g
              key={`token-${token.color}-${token.id}`}
              className={`token ${movable ? 'token-movable' : ''}`}
              onClick={() => movable && onTokenClick && onTokenClick(token.id)}
              style={{ cursor: movable ? 'pointer' : 'default' }}
            >
              {/* Glow ring for movable tokens */}
              {movable && (
                <circle
                  cx={x} cy={y}
                  r={R_TOKEN + 5}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeOpacity={0.6}
                  className="token-ring"
                />
              )}

              {/* Token shadow */}
              <circle cx={x+1} cy={y+2} r={R_TOKEN} fill="black" fillOpacity={0.4} />

              {/* Token body */}
              <circle
                cx={x} cy={y}
                r={R_TOKEN}
                fill={color}
                stroke={lightColor}
                strokeWidth={2}
                filter={movable ? 'url(#glow-gold)' : 'url(#shadow)'}
              />

              {/* Token shine */}
              <circle
                cx={x - R_TOKEN * 0.25}
                cy={y - R_TOKEN * 0.28}
                r={R_TOKEN * 0.28}
                fill="white"
                fillOpacity={0.45}
              />

              {/* Token number */}
              <text
                x={x} y={y + 4}
                textAnchor="middle"
                fontSize={R_TOKEN * 0.85}
                fontWeight="700"
                fill="white"
                fillOpacity={0.9}
                fontFamily="Outfit, sans-serif"
              >
                {token.id + 1}
              </text>
            </g>
          );
        })
      )}

      {/* Border */}
      <rect
        x={1} y={1}
        width={S-2} height={S-2}
        fill="none"
        stroke="#F5C518"
        strokeWidth={2}
        strokeOpacity={0.25}
        rx={8}
      />
    </svg>
  );
}
