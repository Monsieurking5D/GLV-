// src/components/Dice.jsx
// Dé classique blanc à points noirs, avec animation de lancer.
// API conservée: { value, rolling, onRoll, disabled, currentColor }

import './Dice.css';

const DOT_POSITIONS = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

export default function Dice({
  value,
  rolling = false,
  onRoll,
  disabled = false,
  currentColor = '#1f2937',
}) {
  const dots = value && !rolling ? DOT_POSITIONS[value] || [] : [];
  const clickable = !disabled && !rolling && typeof onRoll === 'function';

  return (
    <div className="dice-wrapper" style={{ '--dice-accent': currentColor }}>
      <button
        type="button"
        className={[
          'dice',
          rolling ? 'is-rolling' : '',
          disabled ? 'is-disabled' : '',
          clickable ? 'is-clickable' : '',
        ].join(' ').trim()}
        onClick={clickable ? onRoll : undefined}
        disabled={!clickable}
        aria-label={
          rolling
            ? 'Lancer en cours'
            : value
              ? `Dé : ${value}`
              : 'Lancer le dé'
        }
      >
        <span className="dice-face">
          {rolling ? (
            <span className="dice-spinner" aria-hidden="true">
              <span /><span /><span /><span />
            </span>
          ) : value ? (
            dots.map(([cx, cy], i) => (
              <span
                key={i}
                className="dice-dot"
                style={{ left: `${cx}%`, top: `${cy}%` }}
              />
            ))
          ) : (
            <span className="dice-placeholder">?</span>
          )}
        </span>
      </button>

      <div className="dice-status">
        {rolling
          ? 'Lancement…'
          : value
            ? value === 6
              ? 'SIX ! Vous rejouez'
              : `Vous avez fait ${value}`
            : clickable
              ? 'Cliquez pour lancer'
              : 'En attente'}
      </div>
    </div>
  );
}
