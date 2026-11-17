// The Solmar PD: the wanted level, cop cars that chase and ram, and foot cops that
// chase on foot and bust you. Cops spawn on roads near the player (never on top of them),
// give up and despawn when far away, and the heat decays when you stay out of sight.
import { CAR, COP, WANTED } from './config.js';
import { addWanted, randomRoadPoint, showBanner } from './world.js';
import { damagePlayer } from './player.js';

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
        color: '#f5f5f0', health: CAR.health, dead: false, light: 0,
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
    showBanner(world, 'BUSTED — the Solmar PD caught you.', 4);
  }
  if (d > 1600) cop.hp = 0;
}

/** One fixed step: wanted decay, cop spawns, pursuit and busts. */
export function stepPolice(world, dt) {
  if (world.over) return;
  // Wanted decays when the heat is off: no crime lately and no cop close by.
  if (world.wanted > 0) {
    world.wantedTimer += dt;
    if (world.wantedTimer > WANTED.decaySeconds && world.time - world.lastCrime > 4 && nearestCopDistance(world) > 500) {
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
