// The CAPD: the wanted level, cop cars that chase and ram, foot cops that chase on
// foot and bust you, a helicopter with a searchlight at four stars and up, and
// roadblocks thrown across your route. Cops spawn on roads near the player (never on
// top of them), give up when far away, and the heat decays when you stay out of sight
// — unless the helicopter is overhead, watching.
import { CAR, COP, WANTED } from './config.js';
import { addWanted, nearestIntersection, randomRoadPoint, showBanner, showDispatch } from './world.js';
import { damagePlayer } from './player.js';

const DISPATCH = [
  'CAPD DISPATCH: suspect in a stolen car, last seen heading downtown.',
  'CAPD DISPATCH: all units, armed driver — approach with caution.',
  'CAPD DISPATCH: air support requested, suspect still mobile.',
  'CAPD DISPATCH: roadblock units, cover the beach route.',
  'CAPD DISPATCH: suspect vehicle damaged, smoking — close in.',
  'CAPD DISPATCH: keep the perimeter tight, she is running out of road.',
];

function nearestCopDistance(world) {
  let best = Infinity;
  for (const car of world.cars) {
    if (car.kind !== 'police' || car.dead) continue;
    best = Math.min(best, Math.hypot(car.x - world.player.x, car.y - world.player.y));
  }
  for (const cop of world.cops) {
    best = Math.min(best, Math.hypot(cop.x - world.player.x, cop.y - world.player.y));
  }
  return best;
}

function spawnCopCar(world) {
  const player = world.player;
  for (let tries = 0; tries < 8; tries += 1) {
    const point = randomRoadPoint(world.rng);
    const x = point.axis === 'x' ? point.x : point.line;
    const y = point.axis === 'x' ? point.line : point.y;
    const d = Math.hypot(x - player.x, y - player.y);
    if (d > 650 && d < 1000) {
      world.cars.push({
        kind: 'police', x, y, angle: Math.atan2(player.y - y, player.x - x), speed: 0,
        color: '#f5f5f0', model: 'CAPD CRUISER', health: CAR.health, maxHealth: CAR.health,
        dead: false, light: 0,
      });
      return;
    }
  }
}

function spawnFootCop(world) {
  const player = world.player;
  const angle = world.rng() * Math.PI * 2;
  const d = 500 + world.rng() * 200;
  world.cops.push({
    kind: 'cop', x: player.x + Math.cos(angle) * d, y: player.y + Math.sin(angle) * d,
    angle, speed: COP.footSpeed, hp: 50, state: 'chase',
  });
}

/** Throw a roadblock across the road ahead of the player: two parked cruisers. */
function spawnRoadblock(world) {
  const player = world.player;
  const ahead = { x: player.x + Math.cos(player.angle) * 700, y: player.y + Math.sin(player.angle) * 700 };
  const junction = nearestIntersection(ahead.x, ahead.y);
  const horizontal = Math.abs(player.angle) < Math.PI / 4 || Math.abs(player.angle) > (3 * Math.PI) / 4;
  const cars = [];
  for (const side of [-26, 26]) {
    const car = {
      kind: 'police', blockade: true,
      x: horizontal ? junction.x : junction.x + side,
      y: horizontal ? junction.y + side : junction.y,
      angle: horizontal ? Math.PI / 2 : 0, speed: 0,
      color: '#f5f5f0', model: 'CAPD CRUISER', health: CAR.health, maxHealth: CAR.health,
      dead: false, light: 0,
    };
    world.cars.push(car);
    cars.push(car);
  }
  world.roadblock = { x: junction.x, y: junction.y, horizontal, cars };
  showDispatch(world, 'CAPD DISPATCH: roadblock set — stop the suspect at the intersection.', 5);
}

function clearRoadblock(world) {
  if (!world.roadblock) return;
  for (const car of world.roadblock.cars) car.dead = true;
  world.roadblock = null;
}

/** Steer a car toward a point with the same arcade physics the player uses. */
function steerCarToward(car, tx, ty, dt, maxSpeed) {
  const desired = Math.atan2(ty - car.y, tx - car.x);
  let diff = desired - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.speed = Math.min(maxSpeed, car.speed + CAR.accel * dt);
  car.angle += Math.max(-1, Math.min(1, diff * 2.2)) * CAR.turnRate * (Math.abs(car.speed) / CAR.maxSpeed) * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

function stepCopCar(world, car, dt) {
  const player = world.player;
  car.light += dt;
  if (car.blockade) return; // roadblock cruisers hold their ground
  // Lead the target a little, so the chase cuts corners instead of tailing.
  const lead = 0.35;
  const tx = player.x + Math.cos(player.angle) * player.speed * lead;
  const ty = player.y + Math.sin(player.angle) * player.speed * lead;
  steerCarToward(car, tx, ty, dt, COP.carSpeed);
  // Ramming the player hurts; ramming the player's car dents it.
  const d = Math.hypot(car.x - player.x, car.y - player.y);
  if (d < 44) {
    if (player.onFoot) {
      damagePlayer(world, COP.ramDamage);
      car.speed *= 0.3;
    } else if (player.car && Math.abs(player.speed) < 200) {
      player.car.health -= COP.ramDamage * dt * 4;
      world.shake = Math.max(world.shake, 3);
    }
  }
  // A cop car that falls far behind gives up.
  if (d > 1800) car.dead = true;
}

function stepFootCop(world, cop, dt) {
  const player = world.player;
  const d = Math.hypot(cop.x - player.x, cop.y - player.y);
  cop.angle = Math.atan2(player.y - cop.y, player.x - cop.x);
  cop.x += Math.cos(cop.angle) * cop.speed * dt;
  cop.y += Math.sin(cop.angle) * cop.speed * dt;
  if (d < COP.bustRange && player.onFoot) {
    world.over = 'busted';
    showBanner(world, 'BUSTED — CAPD caught you.', 4);
  }
  if (d > 1600) cop.hp = 0;
}

function stepHeli(world, dt) {
  const heli = world.heli;
  const player = world.player;
  heli.active = world.wanted >= 4 && !world.over;
  if (!heli.active) return;
  heli.rotor += dt * 30;
  // Shadow the player from up and to the side, searchlight on them.
  const tx = player.x + 110;
  const ty = player.y - 90;
  const d = Math.hypot(tx - heli.x, ty - heli.y);
  if (d > 4) {
    const step = Math.min(d, COP.heliSpeed * dt);
    heli.x += ((tx - heli.x) / d) * step;
    heli.y += ((ty - heli.y) / d) * step;
  }
}

/** One fixed step: wanted decay, cop spawns, pursuit, helicopter, roadblocks, busts. */
export function stepPolice(world, dt) {
  if (world.over) return;
  stepHeli(world, dt);
  // Dispatch chatter while wanted, rotating every few seconds.
  if (world.wanted > 0) {
    world.dispatchTimer -= dt;
    if (world.dispatchTimer <= 0) {
      world.dispatchTimer = 6;
      showDispatch(world, DISPATCH[Math.floor(world.rng() * DISPATCH.length)], 5);
    }
  }
  // Wanted decays when the heat is off: no crime lately, no cop close by, and no
  // helicopter overhead keeping eyes on the player.
  if (world.wanted > 0) {
    world.wantedTimer += dt;
    if (world.wantedTimer > WANTED.decaySeconds && world.time - world.lastCrime > 4 && !world.heli.active && nearestCopDistance(world) > 500) {
      const was = world.wanted;
      world.wanted -= 1;
      world.wantedTimer = 0;
      world.siren = world.wanted > 0;
      if (world.wanted === 0) {
        if (was >= 2) world.stats.copsDodged += 1;
        showBanner(world, 'You lost them — the heat is off.', 3);
      }
    }
  }

  // Roadblocks at four stars and up; cleared when the heat drops. Staged screenshot
  // scenes set world.shotStaging and place their own roadblocks by hand, so the
  // random spawn stays out of the frame there.
  if (world.wanted >= 4 && !world.roadblock && !world.shotStaging && world.rng() < 0.01) spawnRoadblock(world);
  if (world.wanted <= 2 && world.roadblock) clearRoadblock(world);

  const wantCars = Math.min(world.wanted, 4);
  const wantCops = world.wanted >= 2 ? Math.min(world.wanted - 1, 3) : 0;
  let haveCars = 0;
  for (const car of world.cars) if (car.kind === 'police' && !car.dead) haveCars += 1;
  let haveCops = 0;
  for (const cop of world.cops) if (cop.hp > 0) haveCops += 1;
  if (haveCars < wantCars && world.rng() < 0.05) spawnCopCar(world);
  if (haveCops < wantCops && world.rng() < 0.03) spawnFootCop(world);

  for (const car of world.cars) {
    if (car.kind === 'police' && !car.dead) stepCopCar(world, car, dt);
  }
  for (const cop of world.cops) {
    if (cop.hp > 0) stepFootCop(world, cop, dt);
  }
  world.cops = world.cops.filter((cop) => cop.hp > 0);
}

export { spawnRoadblock, clearRoadblock };
