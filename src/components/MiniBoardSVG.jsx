// src/components/MiniBoardSVG.jsx
// Représentation visuelle SVG du plateau Ludo pour la landing page

export default function MiniBoardSVG() {
  const SIZE = 380;
  const CELL = SIZE / 15;

  const homeZones = [
    { x: 0, y: 0, w: 6, h: 6, color: '#22C55E', label: 'Vert' },       // top-left → green
    { x: 9, y: 0, w: 6, h: 6, color: '#F59E0B', label: 'Jaune' },     // top-right → yellow
    { x: 0, y: 9, w: 6, h: 6, color: '#3B82F6', label: 'Bleu' },      // bottom-left → blue
    { x: 9, y: 9, w: 6, h: 6, color: '#EF4444', label: 'Rouge' },     // bottom-right → red
  ];

  const safeStars = [
    [6, 2], [2, 6], [6, 12], [12, 6],
    [8, 2], [2, 8], [8, 12], [12, 8],
  ];

  const tokens = [
    // Red tokens
    { cx: 10.5, cy: 10.5, color: '#EF4444', stroke: '#B91C1C' },
    { cx: 12.5, cy: 10.5, color: '#EF4444', stroke: '#B91C1C' },
    { cx: 10.5, cy: 12.5, color: '#EF4444', stroke: '#B91C1C' },
    { cx: 12.5, cy: 12.5, color: '#EF4444', stroke: '#B91C1C' },
    // Blue tokens
    { cx: 1.5, cy: 10.5, color: '#3B82F6', stroke: '#1D4ED8' },
    { cx: 3.5, cy: 10.5, color: '#3B82F6', stroke: '#1D4ED8' },
    { cx: 1.5, cy: 12.5, color: '#3B82F6', stroke: '#1D4ED8' },
    { cx: 3.5, cy: 12.5, color: '#3B82F6', stroke: '#1D4ED8' },
    // Green tokens
    { cx: 1.5, cy: 1.5, color: '#22C55E', stroke: '#15803D' },
    { cx: 3.5, cy: 1.5, color: '#22C55E', stroke: '#15803D' },
    { cx: 1.5, cy: 3.5, color: '#22C55E', stroke: '#15803D' },
    { cx: 3.5, cy: 3.5, color: '#22C55E', stroke: '#15803D' },
    // Yellow tokens
    { cx: 10.5, cy: 1.5, color: '#F59E0B', stroke: '#B45309' },
    { cx: 12.5, cy: 1.5, color: '#F59E0B', stroke: '#B45309' },
    { cx: 10.5, cy: 3.5, color: '#F59E0B', stroke: '#B45309' },
    { cx: 12.5, cy: 3.5, color: '#F59E0B', stroke: '#B45309' },
  ];

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      style={{ background: '#0C0C22', display: 'block' }}
    >
      {/* Board background */}
      <rect width={SIZE} height={SIZE} fill="#0C0C22" />

      {/* Main board area */}
      <rect
        x={0} y={0}
        width={SIZE} height={SIZE}
        fill="#111130"
        stroke="#F5C51820"
        strokeWidth={1}
      />

      {/* Home zones */}
      {homeZones.map((z, i) => (
        <g key={i}>
          <rect
            x={z.x * CELL} y={z.y * CELL}
            width={z.w * CELL} height={z.h * CELL}
            fill={z.color}
            opacity={0.18}
          />
          <rect
            x={z.x * CELL + 4} y={z.y * CELL + 4}
            width={z.w * CELL - 8} height={z.h * CELL - 8}
            rx={8}
            fill={z.color}
            opacity={0.35}
            stroke={z.color}
            strokeWidth={1}
            strokeOpacity={0.6}
          />
          {/* Inner circle safe zone */}
          <circle
            cx={(z.x + z.w / 2) * CELL}
            cy={(z.y + z.h / 2) * CELL}
            r={CELL * 1.5}
            fill="none"
            stroke={z.color}
            strokeWidth={1.5}
            strokeOpacity={0.5}
            strokeDasharray="4 4"
          />
        </g>
      ))}

      {/* Grid lines */}
      {Array.from({ length: 16 }).map((_, i) => (
        <g key={i}>
          <line
            x1={i * CELL} y1={0}
            x2={i * CELL} y2={SIZE}
            stroke="#F5C51815" strokeWidth={0.5}
          />
          <line
            x1={0} y1={i * CELL}
            x2={SIZE} y2={i * CELL}
            stroke="#F5C51815" strokeWidth={0.5}
          />
        </g>
      ))}

      {/* Colored corridors */}
      {/* Vertical corridor center */}
      <rect x={6 * CELL} y={0} width={CELL} height={SIZE} fill="#22C55E" opacity={0.15} />
      <rect x={8 * CELL} y={0} width={CELL} height={SIZE} fill="#EF4444" opacity={0.15} />
      {/* Horizontal corridor center */}
      <rect x={0} y={6 * CELL} width={SIZE} height={CELL} fill="#3B82F6" opacity={0.15} />
      <rect x={0} y={8 * CELL} width={SIZE} height={CELL} fill="#F59E0B" opacity={0.15} />

      {/* Center square */}
      <polygon
        points={`${7 * CELL},${7 * CELL} ${8 * CELL},${7 * CELL} ${7.5 * CELL},${6.5 * CELL}`}
        fill="#22C55E" opacity={0.7}
      />
      <polygon
        points={`${8 * CELL},${7 * CELL} ${8 * CELL},${8 * CELL} ${8.5 * CELL},${7.5 * CELL}`}
        fill="#EF4444" opacity={0.7}
      />
      <polygon
        points={`${7 * CELL},${8 * CELL} ${8 * CELL},${8 * CELL} ${7.5 * CELL},${8.5 * CELL}`}
        fill="#F59E0B" opacity={0.7}
      />
      <polygon
        points={`${7 * CELL},${7 * CELL} ${7 * CELL},${8 * CELL} ${6.5 * CELL},${7.5 * CELL}`}
        fill="#3B82F6" opacity={0.7}
      />
      <rect
        x={7 * CELL} y={7 * CELL}
        width={CELL} height={CELL}
        fill="#F5C518"
        opacity={0.9}
        rx={2}
      />
      {/* Star in center */}
      <text
        x={7.5 * CELL} y={7.5 * CELL + 5}
        textAnchor="middle"
        fontSize={CELL * 0.7}
        fill="#0A0A1A"
        fontWeight="bold"
      >
        ★
      </text>

      {/* Safe stars */}
      {safeStars.map(([col, row], i) => (
        <text
          key={i}
          x={(col + 0.5) * CELL}
          y={(row + 0.5) * CELL + 4}
          textAnchor="middle"
          fontSize={CELL * 0.55}
          fill="#F5C518"
          opacity={0.7}
        >
          ★
        </text>
      ))}

      {/* Tokens */}
      {tokens.map((t, i) => (
        <g key={i}>
          <circle
            cx={t.cx * CELL}
            cy={t.cy * CELL}
            r={CELL * 0.35}
            fill={t.color}
            stroke={t.stroke}
            strokeWidth={1.5}
            opacity={0.95}
          />
          <circle
            cx={t.cx * CELL - CELL * 0.08}
            cy={t.cy * CELL - CELL * 0.1}
            r={CELL * 0.1}
            fill="white"
            opacity={0.5}
          />
        </g>
      ))}

      {/* Gold border */}
      <rect
        x={1} y={1}
        width={SIZE - 2} height={SIZE - 2}
        fill="none"
        stroke="#F5C518"
        strokeWidth={2}
        strokeOpacity={0.3}
        rx={4}
      />
    </svg>
  );
}
