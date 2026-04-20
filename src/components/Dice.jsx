// src/components/Dice.jsx
// Dé 3D animé en CSS

import { useState } from 'react';
import './Dice.css';

const DOT_POSITIONS = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

export default function Dice({ value, rolling, onRoll, disabled, currentColor }) {
  const dots = value ? DOT_POSITIONS[value] || [] : [];

  return (
    <div className="dice-wrapper">
      <div
        className={`dice ${rolling ? 'rolling' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={!disabled && !rolling ? onRoll : undefined}
        id="dice"
        style={{ '--dice-color': currentColor || '#F5C518' }}
        title={disabled ? 'Ce n\'est pas votre tour' : 'Lancer le dé'}
      >
        {/* Dots */}
        <div className="dice-face">
          {value ? dots.map(([cx, cy], i) => (
            <div
              key={i}
              className="dot"
              style={{
                left: `${cx}%`,
                top: `${cy}%`,
              }}
            />
          )) : (
            <span className="dice-question">?</span>
          )}
        </div>

        {/* Rolling overlay */}
        {rolling && (
          <div className="dice-rolling-overlay">
            <div className="dice-spin-dots">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="spin-dot" />
              ))}
            </div>
          </div>
        )}
      </div>

      {value && !rolling && (
        <div className="dice-value-label">
          {value === 6 ? '🎉 SIX !' : `Valeur: ${value}`}
        </div>
      )}

      {!disabled && !rolling && (
        <div className="dice-hint">Cliquez pour lancer</div>
      )}
    </div>
  );
}
