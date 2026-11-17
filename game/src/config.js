// COSTA ALBA — Make GTA 6 (gta6-01). Every tuning number, colour, name and list
// in one place. The viewport is a fixed 1280x720 logical area, drawn with a closer
// zoom so the action fills the frame; the city is a 3840x2880 world the camera moves
// over. No rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };
export const WORLD = { width: 3840, height: 2880 };
/** Camera zoom: 1.18 frames the action more densely than 1:1. */
export const ZOOM = 1.18;
/** Spacing between street centre lines; the first line sits at STREET0 on each axis. */
export const STREET = 480;
export const STREET0 = 240;
/** Road width; blocks are the 384 px squares between roads. */
export const ROAD_W = 96;
export const STEP = 1 / 60;

export const BEST_KEY = 'costa-alba-best-cash';
export const SAVE_KEYS = ['costa-alba-save-1', 'costa-alba-save-2', 'costa-alba-save-3'];

export const PLAYER = {
  walkSpeed: 230,
  sprintSpeed: 340,
  radius: 14,
  health: 100,
  armor: 50,
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

/** Garage upgrades: engine adds speed, armor adds car health and refills body armor. */
export const UPGRADES = {
  engine: { name: 'ENGINE TUNE', costs: [400, 800, 1400], speed: [0.08, 0.16, 0.26] },
  armor: { name: 'CAR ARMOR', costs: [300, 700, 1200], health: [25, 50, 85] },
  repairCost: 100,
  armorRefillCost: 150,
};

export const TRAFFIC = { count: 18, speedMin: 130, speedMax: 210, parked: 14 };
export const PEDS = { count: 26, walkMin: 42, walkMax: 72, fleeSpeed: 170 };
export const COP = { carSpeed: 520, footSpeed: 255, bustRange: 28, ramDamage: 8, heliSpeed: 300 };

/** Stars added by each crime; wanted decays when no cop is near and no crime is fresh. */
export const WANTED = {
  decaySeconds: 9,
  crimeSteal: 1,
  crimeHitPed: 1,
  crimeShoot: 1,
  crimeCopDown: 2,
};

/** The six districts: id, display name, tagline, ground colour. */
export const DISTRICTS = {
  marina: { name: 'PORTO MARINA', tag: 'Docks, boats and bad deals', ground: '#87867e' },
  downtown: { name: 'EL CENTRO', tag: 'Glass towers, gold teeth', ground: '#8f8f88' },
  beach: { name: 'ALBA BEACH', tag: 'Surf, motels and getaway cars', ground: '#e0c48f' },
  mercado: { name: 'MERCADO', tag: 'Spices, noise and second chances', ground: '#a89a7e' },
  suburbs: { name: 'LAS PALMAS', tag: 'Quiet streets, loud secrets', ground: '#93ac6d' },
  strip: { name: 'THE GILDED STRIP', tag: 'Neon, chips and high rollers', ground: '#9a8f7a' },
};

/** Business signs, one per district, drawn on the district's biggest building. */
export const BUSINESSES = {
  marina: ['MARINA DELI', 'FISH MARKET', 'BOAT YARD', 'ANCHOR BAR', 'NET & TACKLE'],
  downtown: ['FIRST ALBA BANK', 'HOTEL ALBA', 'CITY HALL', 'TOWER ONE', 'LAW OFFICE'],
  beach: ['MOTEL CORAL', 'ALBA SURF CO', 'TACOS EL FARO', 'BEACH BAR', 'SUNSET MOTEL'],
  mercado: ['SPICE BAZAAR', 'FLOWER STALL', 'MEAT MARKET', 'CAFÉ LUNA', 'BAKERY'],
  suburbs: ['DONUT RING', 'PUMP HOUSE GYM', 'LAUNDRY', 'CORNER STORE', 'PIZZA SLICE'],
  strip: ['CASINO ORO', 'CLUB LUNA', 'THE GILDED PALM', 'NEON MOTEL', 'STEAK HOUSE'],
};

export const CAR_MODELS = ['ALBA GT', 'COMET S', 'FALCON', 'DUCHESS', 'RUSTLER', 'SUNDANCE'];

/** Radio stations: name, frequency, genre, tempo and bass root for the synth loop. */
export const RADIO = [
  { name: 'COSTA FM', freq: '101.1', genre: 'NIGHT DRIVE', bpm: 132, root: 110 },
  { name: 'RADIO ALBA', freq: '88.5', genre: 'LATIN HEAT', bpm: 96, root: 131 },
];
export const TRACKS = ['Midnight Run — The Palms', 'Neon Tide — Vega Six', 'Gold Coast — Marlow', 'Heat Wave — DJ Cielo'];

export const PALETTE = {
  ocean: '#2e7fa8',
  oceanDeep: '#256b8f',
  sand: '#e0c48f',
  grass: '#8fae6b',
  concrete: '#9a9a92',
  asphalt: '#3a3d42',
  roadLine: '#e8d44f',
  sidewalk: '#b8b2a4',
  park: '#6f9e57',
  roof: ['#b5654a', '#c98a5a', '#8a6f5c', '#a85f43', '#7a6a8a'],
  tower: ['#5a7a9a', '#6a8aa5', '#4a6a85', '#7a90a5'],
  warehouse: ['#9a7a52', '#7a8a9a', '#a08a6a'],
  car: ['#c0392b', '#2980b9', '#f39c12', '#27ae60', '#8e44ad', '#e67e22', '#ecf0f1', '#2c3e50'],
  pedShirt: ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#fd79a8'],
  player: '#16a8a0',
  playerCar: '#d63031',
  missionCar: '#f1c40f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
