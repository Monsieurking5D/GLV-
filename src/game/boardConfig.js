// src/game/boardConfig.js
// Configuration du plateau Ludo 15x15
// Inspiré des règles implémentées dans maverick-360/Ludo (Unity C#)

export const COLORS = {
  RED: 'red',
  BLUE: 'blue',
  GREEN: 'green',
  YELLOW: 'yellow',
};

export const COLOR_HEX = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  yellow: '#F59E0B',
};

export const COLOR_LIGHT_HEX = {
  red: '#FCA5A5',
  blue: '#93C5FD',
  green: '#86EFAC',
  yellow: '#FCD34D',
};

export const COLOR_HOME = {
  red: '#300000',
  blue: '#000830',
  green: '#003010',
  yellow: '#302000',
};

// Parcours principal (cases 0 à 51, sens horaire)
// Chaque couleur a un point d'entrée et un chemin final (home stretch)
export const START_POSITIONS = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39,
};

export const HOME_ENTRY = {
  red: 50,
  blue: 11,
  green: 24,
  yellow: 37,
};

// Cases sûres (étoiles) sur le parcours principal
export const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Position initiale des pions dans leur maison
export const HOME_POSITIONS = {
  red: [-1, -2, -3, -4],
  blue: [-5, -6, -7, -8],
  green: [-9, -10, -11, -12],
  yellow: [-13, -14, -15, -16],
};

// Parcours final (couloir de maison) : positions 52-57
// offset par couleur pour ne pas se superposer
export const HOME_STRETCH_START = {
  red: 52,
  blue: 58,
  green: 64,
  yellow: 70,
};

// Nombre de cases dans le couloir final
export const HOME_STRETCH_LENGTH = 6;

// Position finale dans la zone centrale
export const FINAL_POSITION = {
  red: 57,
  blue: 63,
  green: 69,
  yellow: 75,
};

// Coordonnées visuelles pour chaque case du parcours principal (grille 15x15, 0-indexed)
// Format: [col, row] — basé sur le plateau Ludo standard
export const MAIN_PATH_COORDS = [
  // RED side bottom-left going up (0-5)
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  // Top-left horizontal (5-12)
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  // Up right column (12 is padding)
  [0, 7], [0, 6],
  // Blue start zone top
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  // Going down right
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  // Top right
  [7, 0], [8, 0],
  // Green start zone
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  // Right column going down
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  // Right side
  [14, 7], [14, 8],
  // Yellow start zone
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  // Bottom right going down
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  // Bottom
  [7, 14], [6, 14],
];

// Couloir final de chaque couleur
export const HOME_STRETCH_COORDS = {
  red: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

// Position maison (zone colorée) pour affichage
export const HOME_ZONE_TOKENS = {
  red: [
    [2, 10], [3, 10],
    [2, 11], [3, 11],
  ],
  blue: [
    [10, 2], [11, 2],
    [10, 3], [11, 3],
  ],
  green: [
    [10, 10], [11, 10],
    [10, 11], [11, 11],
  ],
  yellow: [
    [2, 2], [3, 2],
    [2, 3], [3, 3],
  ],
};

// Centre du plateau (case d'arrivée)
export const CENTER_COORDS = [7, 7];
