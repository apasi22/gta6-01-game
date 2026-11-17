// The city of Solmar and the live world state, with no drawing and no browser in it:
// the street grid, the blocks and their buildings, and every moving thing (the player,
// traffic and parked cars, pedestrians, cops, bullets, particles). createWorld builds a
// whole fresh world from a seed; the other modules step it. Nothing here allocates after
// createWorld returns, except the small respawn churn of traffic and pedestrians.
import { CAR, COP, PALETTE, PEDS, PLAYER, ROAD_W, STREET, STREET0, TRAFFIC, WORLD } from './config.js';
import { createRandom, pick, randInt, randRange } from './random.js';

/** Street centre lines: 8 vertical (x) and 6 horizontal (y). */
export const STREETS_X = [240, 720, 1200, 1680, 2160, 2640, 3120, 3600];
export const STREETS_Y = [240, 720, 1200, 1680, 2160, 2640];
/** Blocks between the streets: 7 columns by 5 rows, each 384x384. */
export const BLOCK_COLS = 7;
export const BLOCK_ROWS = 5;

export const EVENT_BUSTED = 1;
export const EVENT_WASTED = 2;
export const EVENT_CRIME = 4;

/** Distance from a coordinate to the nearest street centre line on its axis. */
export function distToStreet(value) {
  const m = (((value - STREET0) % STREET) + STREET) % STREET;
  return Math.min(m, STREET - m);
}

/** True when the point is on a road (either axis). */
export function isRoad(x, y) {
  return distToStreet(x) < ROAD_W / 2 || distToStreet(y) < ROAD_W / 2;
}

/** The nearest street intersection to a point, clamped inside the city. */
export function nearestIntersection(x, y) {
  const ix = Math.round((x - STREET0) / STREET) * STREET + STREET0;
  const iy = Math.round((y - STREET0) / STREET) * STREET + STREET0;
  return {
    x: Math.min(STREETS_X[STREETS_X.length - 1], Math.max(STREETS_X[0], ix)),
    y: Math.min(STREETS_Y[STREETS_Y.length - 1], Math.max(STREETS_Y[0], iy)),
  };
}

/** The district a point sits in: harbor west, downtown centre, beach south, suburbs else. */
export function districtAt(x, y) {
  if (x < 1100) return 'harbor';
  if (x >= 1440 && x < 2400 && y >= 960 && y < 1920) return 'downtown';
  if (y >= 2400) return 'beach';
  return 'suburbs';
}

/** A random point on a road: a street line, a position along it, and a lane offset. */
export function randomRoadPoint(rng) {
  const axis = rng() < 0.5 ? 'x' : 'y';
  if (axis === 'x') {
    const line = pick(rng, STREETS_Y);
    const along = randRange(rng, STREETS_X[0], STREETS_X[STREETS_X.length - 1]);
    return { x: along, y: line + (rng() < 0.5 ? 24 : -24), axis, line };
  }
  const line = pick(rng, STREETS_X);
  const along = randRange(rng, STREETS_Y[0], STREETS_Y[STREETS_Y.length - 1]);
  return { x: line + (rng() < 0.5 ? 24 : -24), y: along, axis, line };
}

/** A random point on a sidewalk: a street line, a position along it, offset 70 px out. */
export function randomSidewalkPoint(rng) {
  const point = randomRoadPoint(rng);
  const offset = point.axis === 'x' ? { x: 0, y: point.y < point.line ? -70 : 70 } : { x: point.x < point.line ? -70 : 70, y: 0 };
  return { x: point.x + offset.x, y: point.y + offset.y, axis: point.axis, line: point.line };
}

/**
 * The building a circle of radius `r` at (x, y) overlaps, or null. Buildings sit at least
 * 30 px inside their block, so only the containing block can ever match.
 */
export function collidesBuilding(city, x, y, r) {
  const i = Math.floor((x - (STREET0 + ROAD_W / 2)) / STREET);
  const j = Math.floor((y - (STREET0 + ROAD_W / 2)) / STREET);
  if (i < 0 || i >= BLOCK_COLS || j < 0 || j >= BLOCK_ROWS) return null;
  const block = city.blocks[j * BLOCK_COLS + i];
  for (const b of block.buildings) {
    if (x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) return b;
  }
  return null;
}

export function clampToWorld(x, y, margin) {
  return {
    x: Math.min(WORLD.width - margin, Math.max(margin, x)),
    y: Math.min(WORLD.height - margin, Math.max(margin, y)),
  };
}

function buildBlock(rng, i, j) {
  const x = STREET0 + ROAD_W / 2 + i * STREET;
  const y = STREET0 + ROAD_W / 2 + j * STREET;
  const cx = x + 192;
  const cy = y + 192;
  const district = districtAt(cx, cy);
  const block = { i, j, x, y, w: 384, h: 384, district, kind: 'block', buildings: [], trees: [] };
  const roll = rng();
  if (district !== 'downtown' && district !== 'harbor' && roll < 0.14) block.kind = 'park';
  else if (district !== 'downtown' && roll < 0.24) block.kind = 'lot';

  if (block.kind === 'park') {
    for (let t = 0; t < 10; t += 1) {
      block.trees.push({ x: x + randRange(rng, 30, 354), y: y + randRange(rng, 30, 354), r: randRange(rng, 10, 17) });
    }
    return block;
  }
  if (block.kind === 'lot') {
    for (let t = 0; t < 4; t += 1) {
      block.trees.push({ x: x + randRange(rng, 30, 354), y: y + randRange(rng, 30, 354), r: randRange(rng, 10, 15) });
    }
    return block;
  }
  if (district === 'downtown') {
    const w = randRange(rng, 200, 260);
    const h = randRange(rng, 170, 230);
    block.buildings.push({
      x: cx - w / 2, y: cy - h / 2, w, h,
      color: pick(rng, PALETTE.tower), roof: '#3a4a5a', hgt: randInt(rng, 3, 6),
    });
  } else if (district === 'harbor') {
    for (let k = 0; k < 2; k += 1) {
      block.buildings.push({
        x: x + 40 + k * 180, y: cy - 60, w: 150, h: 120,
        color: pick(rng, PALETTE.warehouse), roof: '#5a4a3a', hgt: 1,
      });
    }
  } else if (district === 'beach') {
    for (let k = 0; k < 2; k += 1) {
      block.buildings.push({
        x: x + 50 + k * 170, y: cy - 35, w: 90, h: 70,
        color: pick(rng, PALETTE.roof), roof: '#e8d8b0', hgt: 1,
      });
    }
    for (let t = 0; t < 5; t += 1) {
      block.trees.push({ x: x + randRange(rng, 30, 354), y: y + randRange(rng, 30, 354), r: randRange(rng, 11, 16) });
    }
  } else {
    const spots = [
      [60, 60], [230, 60], [60, 230], [230, 230],
    ];
    for (let k = 0; k < 3; k += 1) {
      const [ox, oy] = spots[k + randInt(rng, 0, 1)];
      block.buildings.push({
        x: x + ox, y: y + oy, w: randRange(rng, 70, 95), h: randRange(rng, 65, 90),
        color: pick(rng, PALETTE.roof), roof: '#6a5a4a', hgt: 1,
      });
    }
    for (let t = 0; t < 3; t += 1) {
      block.trees.push({ x: x + randRange(rng, 30, 354), y: y + randRange(rng, 30, 354), r: randRange(rng, 10, 15) });
    }
  }
  return block;
}

export function createCity(rng) {
  const blocks = [];
  for (let j = 0; j < BLOCK_ROWS; j += 1) {
    for (let i = 0; i < BLOCK_COLS; i += 1) blocks.push(buildBlock(rng, i, j));
  }
  return { blocks, streetsX: STREETS_X, streetsY: STREETS_Y };
}

function spawnTrafficCar(rng, city) {
  const point = randomRoadPoint(rng);
  const dir = rng() < 0.5 ? 1 : -1;
  const lane = point.axis === 'x' ? (dir === 1 ? 24 : -24) : (dir === 1 ? -24 : 24);
  const x = point.axis === 'x' ? point.x : point.line + lane;
  const y = point.axis === 'x' ? point.line + lane : point.y;
  const angle = point.axis === 'x' ? (dir === 1 ? 0 : Math.PI) : (dir === 1 ? Math.PI / 2 : -Math.PI / 2);
  return {
    kind: 'traffic', x, y, angle, dir, axis: point.axis, line: point.line,
    speed: randRange(rng, TRAFFIC.speedMin, TRAFFIC.speedMax),
    maxSpeed: randRange(rng, TRAFFIC.speedMin, TRAFFIC.speedMax),
    color: pick(rng, PALETTE.car), health: CAR.health, dead: false, atJunction: false,
  };
}

function spawnParkedCar(rng) {
  const point = randomRoadPoint(rng);
  const along = point.axis === 'x' ? point.x : point.y;
  // Parked at the curb: 40 px off the centre line, just inside the road.
  const side = rng() < 0.5 ? 40 : -40;
  const x = point.axis === 'x' ? along : point.line + side;
  const y = point.axis === 'x' ? point.line + side : along;
  const angle = point.axis === 'x' ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
  return {
    kind: 'parked', x, y, angle, speed: 0,
    color: pick(rng, PALETTE.car), health: CAR.health, dead: false,
  };
}

function spawnPed(rng) {
  const point = randomSidewalkPoint(rng);
  const dir = rng() < 0.5 ? 1 : -1;
  const angle = point.axis === 'x' ? (dir === 1 ? 0 : Math.PI) : (dir === 1 ? Math.PI / 2 : -Math.PI / 2);
  return {
    x: point.x, y: point.y, angle, dir, axis: point.axis, line: point.line,
    speed: randRange(rng, PEDS.walkMin, PEDS.walkMax),
    color: pick(rng, PALETTE.pedShirt), state: 'walk', fleeTimer: 0, downTimer: 0,
    atJunction: false, hp: 30,
  };
}

/** A whole fresh world from a seed: the city plus every moving thing in it. */
export function createWorld(seed) {
  const rng = createRandom(seed);
  const city = createCity(rng);
  const world = {
    seed,
    rng,
    city,
    time: 0,
    /** In-game clock in seconds; the game starts at 17:30, dusk falls after 18:00. */
    clock: 17.5 * 3600,
    player: {
      x: 2160, y: 1740, angle: -Math.PI / 2, onFoot: true, health: PLAYER.health,
      cash: 0, ammo: 12, reload: 0, car: null, speed: 0, invuln: 0, lastDamage: -99,
    },
    cars: [],
    peds: [],
    cops: [],
    bullets: [],
    particles: [],
    wanted: 0,
    wantedTimer: 0,
    lastCrime: -99,
    stats: { missionsDone: 0, carsStolen: 0, copsDodged: 0, shotsFired: 0 },
    camera: { x: 2160, y: 1680 },
    shake: 0,
    banner: '',
    bannerUntil: 0,
    over: null,
    mission: null,
    missionCar: null,
    siren: false,
    muted: false,
    saveDirty: false,
  };
  for (let k = 0; k < TRAFFIC.count; k += 1) world.cars.push(spawnTrafficCar(rng, city));
  for (let k = 0; k < TRAFFIC.parked; k += 1) world.cars.push(spawnParkedCar(rng));
  // One parked car right by the player's spawn, on the road's edge, so the first
  // steal is one walk away and the first drive starts on a street.
  world.cars.push({
    kind: 'parked', x: 2260, y: 1720, angle: 0, speed: 0,
    color: PALETTE.playerCar, health: CAR.health, dead: false,
  });
  for (let k = 0; k < PEDS.count; k += 1) world.peds.push(spawnPed(rng));
  return world;
}

/** Show a banner line over the game until `world.time + seconds`. */
export function showBanner(world, text, seconds) {
  world.banner = text;
  world.bannerUntil = world.time + seconds;
}

/** Add a wanted star (capped at 5) and restart the decay timer. */
export function addWanted(world, stars) {
  world.wanted = Math.min(5, world.wanted + stars);
  world.wantedTimer = 0;
  world.lastCrime = world.time;
  world.siren = world.wanted > 0;
}

export { spawnTrafficCar, spawnParkedCar, spawnPed };
