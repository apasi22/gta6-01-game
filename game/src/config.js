// SOLMAR — Make GTA 6 (gta6-01). Every tuning number and colour in one place.
// The viewport is a fixed 1280x720 logical area; the renderer scales it to the window.
// The city itself is a 3840x2880 world the camera moves over. No rule below depends on
// the screen size.

export const FIELD = { width: 1280, height: 720 };
export const WORLD = { width: 3840, height: 2880 };
/** Spacing between street centre lines; the first line sits at STREET0 on each axis. */
export const STREET = 480;
export const STREET0 = 240;
/** Road width; blocks are the 384 px squares between roads. */
export const ROAD_W = 96;
export const STEP = 1 / 60;

export const BEST_KEY = 'solmar-best-cash';
export const SAVE_KEY = 'solmar-save-v1';

export const PLAYER = {
  walkSpeed: 230,
  sprintSpeed: 340,
  radius: 14,
  health: 100,
};

export const CAR = {
  accel: 460,
  brake: 900,
  reverseAccel: 300,
  maxSpeed: 560,
  maxReverse: 200,
  turnRate: 2.6,
  handbrakeTurn: 3.8,
  radius: 20,
  health: 100,
};

export const TRAFFIC = { count: 14, speedMin: 130, speedMax: 210, parked: 12 };
export const PEDS = { count: 18, walkMin: 42, walkMax: 72, fleeSpeed: 170 };
export const COP = { carSpeed: 520, footSpeed: 255, bustRange: 28, ramDamage: 8 };

/** Stars added by each crime; wanted decays when no cop is near and no crime is fresh. */
export const WANTED = {
  decaySeconds: 9,
  crimeSteal: 1,
  crimeHitPed: 1,
  crimeShoot: 1,
  crimeCopDown: 2,
};

export const PALETTE = {
  ocean: '#2e7fa8',
  oceanDeep: '#256b8f',
  sand: '#e0c48f',
  grass: '#8fae6b',
  concrete: '#9a9a92',
  asphalt: '#3a3d42',
  roadLine: '#e8d44f',
  sidewalk: '#b8b2a4',
  downtown: '#8f8f88',
  harbor: '#87867e',
  suburbs: '#93ac6d',
  beach: '#e0c48f',
  park: '#6f9e57',
  roof: ['#b5654a', '#c98a5a', '#8a6f5c', '#a85f43', '#7a6a8a'],
  tower: ['#5a7a9a', '#6a8aa5', '#4a6a85', '#7a90a5'],
  warehouse: ['#9a7a52', '#7a8a9a', '#a08a6a'],
  car: ['#c0392b', '#2980b9', '#f39c12', '#27ae60', '#8e44ad', '#e67e22', '#ecf0f1', '#2c3e50'],
  pedShirt: ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#fd79a8'],
  player: '#e74c3c',
  playerCar: '#d63031',
  missionCar: '#f1c40f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
