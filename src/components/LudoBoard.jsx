import React, { memo, useState, useEffect, useRef } from 'react';
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
  if (col === 7 && row >= 1 && row <= 6) return COLOR_HEX.green;
  if (col === 7 && row >= 8 && row <= 13) return COLOR_HEX.red;
  if (row === 7 && col >= 1 && col <= 6) return COLOR_HEX.blue;
  if (row === 7 && col >= 8 && col <= 13) return COLOR_HEX.yellow;

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

function isPathCell(col, row) {
  const inVerticalArm = (col >= 6 && col <= 8) && (row < 6 || row > 8);
  const inHorizontalArm = (row >= 6 && row <= 8) && (col < 6 || col > 8);
  return inVerticalArm || inHorizontalArm;
}

// --- Sous-Composant Token pour l'animation ---------------------------------

const Token = memo(({ token, bx, by, tokens, movable, onTokenClick, getStackOffset }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevPos = useRef({ bx, by });
  const mainColor = COLOR_HEX[token.color];
  const pinR = CELL * 0.38;

  const { dx, dy } = getStackOffset(token, tokens);
  const x = bx + dx;
  const y = by + dy;

  // Déclencher l'animation de saut si la position change
  useEffect(() => {
    if (prevPos.current.bx !== bx || prevPos.current.by !== by) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 450);
      prevPos.current = { bx, by };
      return () => clearTimeout(timer);
    }
  }, [bx, by]);

  return (
    <g
      className={`lb-token ${movable ? 'lb-token--movable' : ''} ${isAnimating ? 'lb-token--moving' : ''}`}
      onClick={() => movable && onTokenClick && onTokenClick(token.id)}
      style={{ 
        cursor: movable ? 'pointer' : 'default',
        transform: `translate(${x}px, ${y}px)` 
      }}
    >
      {movable && (
        <circle
          cx={0}
          cy={0}
          r={pinR + 8}
          className="lb-token-ring"
          fill="none"
          stroke={mainColor}
          strokeWidth="3"
          strokeDasharray="4 2"
        />
      )}

      <path
        d={`
          M 0 ${pinR * 0.65}
          L ${-pinR * 0.85} ${-pinR * 0.15}
          A ${pinR} ${pinR} 0 1 1 ${pinR * 0.85} ${-pinR * 0.15}
          Z
        `}
        fill="#FFFFFF"
        filter="url(#lb-pin-shadow)"
        stroke="rgba(0,0,0,0.08)"
        strokeWidth="0.5"
      />
      
      <circle cx={0} cy={-pinR * 0.25} r={pinR * 0.58} fill={mainColor} />
      <circle cx={-pinR * 0.25} cy={-pinR * 0.45} r={pinR * 0.18} fill="#FFFFFF" opacity="0.35" />
    </g>
  );
});

// --- Composant Principal --------------------------------------------------

const LudoBoard = memo(({ gameState, onTokenClick, movablePieces = [] }) => {
  if (!gameState) return null;

  const { tokens } = gameState;
  const quadrants = quadrantsFromConfig();

  const isMovable = (token) => {
    return movablePieces.some(p => p.color === token.color && p.id === token.id);
  };

  function getTokenXY(token) {
    if (token.state === TOKEN_STATE.HOME) {
      const slots = HOME_ZONE_TOKENS[token.color];
      const [c, r] = slots[token.id % slots.length];
      return cellXY(c, r);
    }
    if (token.state === TOKEN_STATE.FINISHED) {
      return cellXY(7, 7);
    }
    if (token.state === TOKEN_STATE.MOVING || token.state === TOKEN_STATE.ON_PATH) {
      const [c, r] = MAIN_PATH_COORDS[token.position] || [7, 7];
      return cellXY(c, r);
    }
    if (token.state === TOKEN_STATE.HOME_STRETCH) {
      const [c, r] = HOME_STRETCH_COORDS[token.color][token.position] || [7, 7];
      return cellXY(c, r);
    }
    return cellXY(7, 7);
  }

  function getStackOffset(token, allTokens) {
    const samePos = Object.values(allTokens).flat().filter(t => 
      t.state === token.state && 
      (t.state !== TOKEN_STATE.ON_PATH || t.position === token.position) &&
      (t.state !== TOKEN_STATE.HOME_STRETCH || (t.position === token.position && t.color === token.color)) &&
      t.state !== TOKEN_STATE.HOME &&
      t.state !== TOKEN_STATE.FINISHED
    );

    if (samePos.length <= 1) return { dx: 0, dy: 0 };
    const idx = samePos.findIndex(t => t.id === token.id && t.color === token.color);
    const angle = (idx / samePos.length) * Math.PI * 2;
    const r = CELL * 0.22;
    return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r };
  }

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="ludo-board-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="lb-pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="1" dy="2" result="offsetblur" />
          <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect width={S} height={S} fill="#FFFFFF" />

      {quadrants.map(({ color, x, y }) => (
        <g key={`q-${color}`}>
          <rect x={x * CELL} y={y * CELL} width={6 * CELL} height={6 * CELL} fill={COLOR_HEX[color]} rx="4" />
          <rect x={(x + 0.8) * CELL} y={(y + 0.8) * CELL} width={4.4 * CELL} height={4.4 * CELL} fill="#FFFFFF" rx="4" />
          {HOME_ZONE_TOKENS[color].map(([c, r], i) => {
            const { x: cx, y: cy } = cellXY(c, r);
            return <circle key={`base-${color}-${i}`} cx={cx} cy={cy} r={CELL * 0.42} fill={COLOR_HEX[color]} opacity="0.22" />;
          })}
        </g>
      ))}

      {Array.from({ length: N }).map((_, row) =>
        Array.from({ length: N }).map((_, col) => {
          if (!isPathCell(col, row)) return null;
          return <rect key={`p-${col}-${row}`} x={col * CELL} y={row * CELL} width={CELL} height={CELL} fill={pathCellFill(col, row)} stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />;
        })
      )}

      {[...SAFE_CELLS].map((idx) => {
        const [c, r] = MAIN_PATH_COORDS[idx] || [];
        if (c == null || Object.values(START_POSITIONS).includes(idx)) return null;
        const { x, y } = cellXY(c, r);
        return <path key={`star-${idx}`} d={starPath(x, y, CELL * 0.35)} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" strokeLinejoin="round" />;
      })}

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
            <path d={`M -${CELL*0.2} 0 L ${CELL*0.2} -${CELL*0.15} L ${CELL*0.2} ${CELL*0.15} Z`} fill={COLOR_HEX[color]} opacity="0.4" />
          </g>
        );
      })}

      {(() => {
        const cx = 7.5 * CELL;
        const cy = 7.5 * CELL;
        const offset = 0.5;
        const tri = (color, points) => <polygon points={points} fill={COLOR_HEX[color]} stroke={COLOR_HEX[color]} strokeWidth="0.5" />;
        return (
          <g>
            {tri('green',  `${6*CELL},${6*CELL} ${9*CELL},${6*CELL} ${cx},${cy + offset}`)}
            {tri('yellow', `${9*CELL},${6*CELL} ${9*CELL},${9*CELL} ${cx - offset},${cy}`)}
            {tri('red',    `${9*CELL},${9*CELL} ${6*CELL},${9*CELL} ${cx},${cy - offset}`)}
            {tri('blue',   `${6*CELL},${9*CELL} ${6*CELL},${6*CELL} ${cx + offset},${cy}`)}
          </g>
        );
      })()}

      {tokens && Object.values(tokens).map((arr) => {
        // Ne rendre les pions que si le joueur correspondant existe (id non null)
        const player = gameState.players.find(p => p.color === arr[0].color);
        if (!player || !player.id) return null;

        return arr.map((token) => {
          const { x: bx, y: by } = getTokenXY(token);
          return (
            <Token 
              key={`tok-${token.color}-${token.id}`}
              token={token}
              bx={bx}
              by={by}
              tokens={tokens}
              movable={isMovable(token)}
              onTokenClick={onTokenClick}
              getStackOffset={getStackOffset}
            />
          );
        });
      })}
      <rect x="1.5" y="1.5" width={S - 3} height={S - 3} fill="none" stroke="#F5C518" strokeWidth="3" rx="6" />
    </svg>
  );
});

export default LudoBoard;
