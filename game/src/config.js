// WILWATIKTA — Make GTA 6 (gta6-01). Every tuning number, colour, name and list
// in one place. The viewport is a fixed 1280x720 logical area, drawn with a closer
// zoom so the action fills the frame; the city is a 3840x2880 world the camera moves
// over. No rule below depends on the screen size. Wilwatikta is a fictional city,
// named with pride after the old Majapahit capital; its people carry Javanese names.
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

export const BEST_KEY = 'wilwatikta-best-cash';
export const SAVE_KEYS = ['wilwatikta-save-1', 'wilwatikta-save-2', 'wilwatikta-save-3'];

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
  engine: { name: 'TUNE MESIN', costs: [400, 800, 1400], speed: [0.08, 0.16, 0.26] },
  armor: { name: 'BAJA MOBIL', costs: [300, 700, 1200], health: [25, 50, 85] },
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
  marina: { name: 'PELABUHAN SEGARA', tag: 'Docks, fishing boats and shady deals', ground: '#87867e' },
  downtown: { name: 'ALUN-ALUN', tag: 'Old square, new towers, gold teeth', ground: '#8f8f88' },
  beach: { name: 'PANTAI KIDUL', tag: 'Surf, warungs and getaway cars', ground: '#e0c48f' },
  mercado: { name: 'PASAR SENJA', tag: 'Spices, noise and second chances', ground: '#a89a7e' },
  suburbs: { name: 'KAMPUNG BATIK', tag: 'Quiet streets, loud secrets', ground: '#93ac6d' },
  strip: { name: 'LORONG EMAS', tag: 'Neon, chips and high rollers', ground: '#9a8f7a' },
};

/** Business signs, one per district, drawn on the district's biggest building. */
export const BUSINESSES = {
  marina: ['WARUNG IKAN', 'PASAR IKAN', 'GALANGAN KAPAL', 'WARUNG KOPI', 'ALAT PANCING'],
  downtown: ['BANK WILWATIKTA', 'HOTEL WILWATIKTA', 'BALAI KOTA', 'MENARA SATU', 'KANTOR HUKUM'],
  beach: ['PENGINAPAN KARANG', 'SELANCAR KIDUL', 'SATE PANTAI', 'WARUNG SENJA', 'PENGINAPAN MATAHARI'],
  mercado: ['PASAR REMPAH', 'KIOS BUNGA', 'PASAR DAGING', 'WARUNG LUNA', 'TOKO ROTI'],
  suburbs: ['DONAT SARI', 'SANGGAR SENAM', 'LAUNDRY MBAK RATNA', 'TOKO KELONTONG', 'MARTABAK MANIS'],
  strip: ['KASINO EMAS', 'KLUB LUNA', 'KELAPA EMAS', 'PENGINAPAN NEON', 'RUMAH STEAK'],
};

export const CAR_MODELS = ['GARUDA GT', 'KENCANA S', 'ARJUNA', 'SRIKANDI', 'GATOTKACA', 'BIMA'];

/** Radio stations: name, frequency, genre, tempo and bass root for the synth loop. */
export const RADIO = [
  { name: 'GAMELAN FM', freq: '101.1', genre: 'NIGHT DRIVE', bpm: 132, root: 110 },
  { name: 'RADIO WILWATIKTA', freq: '88.5', genre: 'DANGDUT HEAT', bpm: 96, root: 131 },
];
export const TRACKS = ['Gending Wilwatikta — Larasati', 'Saron Senja — Srimpi', 'Ladrang Kidul — Gamelan Kencana', 'Gending Panas — DJ Srimpi'];

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
