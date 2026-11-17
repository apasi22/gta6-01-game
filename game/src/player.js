// Lena Rook on foot and behind the wheel: walking and sprinting, arcade car physics
// (accelerate, steer, handbrake), getting in and out of cars with E, body armor that
// absorbs damage, garage upgrades that make cars faster and tougher, and the
// collisions that follow — buildings stop you, other cars dent you, pedestrians get
// run over.
import { CAR, PLAYER, UPGRADES, WANTED } from './config.js';
import { addWanted, clampToWorld, collidesBuilding, showBanner } from './world.js';

function damagePlayer(world, amount) {
  const player = world.player;
  if (player.invuln > 0) return;
  // Body armor absorbs 60% of a hit until it is gone.
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, Math.round(amount * 0.6));
    player.armor -= absorbed;
    amount -= absorbed;
  }
  player.health -= amount;
  player.invuln = 0.5;
  player.lastDamage = world.time;
  world.shake = Math.max(world.shake, 6);
  if (player.health <= 0) {
    player.health = 0;
    world.over = 'wasted';
  }
}

/** Push a circle out of buildings, axis by axis so it slides along walls. */
function moveWithBuildings(world, x, y, dx, dy, radius) {
  let nx = x + dx;
  if (!collidesBuilding(world.city, nx, y, radius)) x = nx;
  let ny = y + dy;
  if (!collidesBuilding(world.city, x, ny, radius)) y = ny;
  const clamped = clampToWorld(x, y, radius + 4);
  return clamped;
}

function nearestCar(world, x, y, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of world.cars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}

function enterCar(world, car) {
  const player = world.player;
  player.car = car;
  player.onFoot = false;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  player.speed = 0;
  // Garage armor reinforces any car Lena takes.
  const bonus = UPGRADES.armor.health[world.upgrades.armor - 1] ?? 0;
  car.maxHealth = CAR.health + bonus;
  if (world.upgrades.armor > 0) car.health = car.maxHealth;
  if (car.kind === 'parked' || car.kind === 'traffic') {
    world.stats.carsStolen += 1;
    addWanted(world, WANTED.crimeSteal);
    showBanner(world, car.kind === 'parked' ? `Stole the ${car.model} — CAPD noticed.` : `Carjacked the ${car.model} — CAPD noticed.`, 3);
  }
  if (car.kind === 'police') {
    addWanted(world, WANTED.crimeSteal + 1);
    showBanner(world, 'You stole a cop car?!', 3);
  }
}

function exitCar(world) {
  const player = world.player;
  const car = player.car;
  if (!car) return;
  const side = { x: player.x + Math.cos(player.angle + Math.PI / 2) * 34, y: player.y + Math.sin(player.angle + Math.PI / 2) * 34 };
  const spot = moveWithBuildings(world, side.x, side.y, 0, 0, PLAYER.radius);
  player.x = spot.x;
  player.y = spot.y;
  player.onFoot = true;
  player.car = null;
  player.speed = 0;
  car.speed = 0;
}

function stepOnFoot(world, dt, ctl) {
  const player = world.player;
  const speed = ctl.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  const dx = ctl.mx * speed * dt;
  const dy = ctl.my * speed * dt;
  if (dx !== 0 || dy !== 0) player.angle = Math.atan2(dy, dx);
  const spot = moveWithBuildings(world, player.x, player.y, dx, dy, PLAYER.radius);
  player.x = spot.x;
  player.y = spot.y;
  if (ctl.shoot) player.angle = Math.atan2(ctl.aimY - player.y, ctl.aimX - player.x);
  if (ctl.enter) {
    const car = nearestCar(world, player.x, player.y, 56);
    if (car) enterCar(world, car);
  }
}

function stepDriving(world, dt, ctl) {
  const player = world.player;
  const car = player.car;
  if (!car) {
    player.onFoot = true;
    return;
  }
  const speedMul = 1 + (UPGRADES.engine.speed[world.upgrades.engine - 1] ?? 0);
  const maxSpeed = CAR.maxSpeed * speedMul;
  const accel = CAR.accel * (1 + speedMul * 0.2);
  const handbrake = ctl.brake;
  if (ctl.throttle > 0) player.speed += accel * ctl.throttle * dt;
  else if (ctl.throttle < 0) {
    player.speed += (player.speed > 20 ? -CAR.brake : CAR.reverseAccel * ctl.throttle) * dt;
  } else {
    player.speed -= Math.sign(player.speed) * Math.min(Math.abs(player.speed), 240 * dt);
  }
  if (handbrake) {
    player.speed -= Math.sign(player.speed) * Math.min(Math.abs(player.speed), 700 * dt);
  }
  player.speed = Math.max(-CAR.maxReverse, Math.min(maxSpeed, player.speed));
  const turn = (handbrake ? CAR.handbrakeTurn : CAR.turnRate) * (Math.abs(player.speed) / maxSpeed);
  player.angle += ctl.steer * turn * dt * Math.sign(player.speed);
  car.angle = player.angle;

  const dx = Math.cos(player.angle) * player.speed * dt;
  const dy = Math.sin(player.angle) * player.speed * dt;
  const before = { x: player.x, y: player.y };
  const spot = moveWithBuildings(world, player.x, player.y, dx, dy, CAR.radius);
  player.x = spot.x;
  player.y = spot.y;
  car.x = player.x;
  car.y = player.y;
  // A hard stop against a wall dents the car. The movement test needs an epsilon:
  // at a cardinal heading the perpendicular component is float noise (~1e-15, from
  // sin(pi) and cos(pi/2)), which never moves the coordinate — without the epsilon
  // every north/south/west step would look "blocked" and the car would crawl.
  if ((Math.abs(dx) > 1e-9 && spot.x === before.x) || (Math.abs(dy) > 1e-9 && spot.y === before.y)) {
    if (Math.abs(player.speed) > 240) {
      car.health -= Math.abs(player.speed) * 0.02;
      world.shake = Math.max(world.shake, 4);
    }
    player.speed *= 0.4;
  }

  // Bumping other cars: push apart, dent both.
  for (const other of world.cars) {
    if (other === car || other.dead) continue;
    const d = Math.hypot(other.x - player.x, other.y - player.y);
    if (d < 44 && d > 0.01) {
      const push = (44 - d) / 2;
      const nx = (other.x - player.x) / d;
      const ny = (other.y - player.y) / d;
      other.x += nx * push;
      other.y += ny * push;
      if (Math.abs(player.speed) > 120) {
        car.health -= 3;
        other.health -= 6;
        world.shake = Math.max(world.shake, 3);
      }
    }
  }

  // Running a pedestrian over is a crime, and the pedestrian goes down.
  for (const ped of world.peds) {
    if (ped.state === 'down') continue;
    const d = Math.hypot(ped.x - player.x, ped.y - player.y);
    if (d < 30 && Math.abs(player.speed) > 40) {
      ped.state = 'down';
      ped.downTimer = 4;
      addWanted(world, WANTED.crimeHitPed);
      showBanner(world, 'Pedestrian down — witnesses called it in.', 3);
      player.speed *= 0.7;
    }
  }

  // Handbrake slides leave tire smoke.
  if (handbrake && Math.abs(player.speed) > 150 && world.rng() < 0.6) {
    world.particles.push({
      x: player.x - Math.cos(player.angle) * 18, y: player.y - Math.sin(player.angle) * 18,
      vx: (world.rng() - 0.5) * 30, vy: (world.rng() - 0.5) * 30,
      life: 0.7, max: 0.7, size: 9, color: 'rgba(200,200,200,0.5)',
    });
  }

  if (ctl.enter && Math.abs(player.speed) < 30) exitCar(world);
  if (ctl.horn) world.horn = true;
}

/** One fixed step for the player, on foot or driving. Returns nothing; sets world.over. */
export function stepPlayer(world, dt, ctl) {
  const player = world.player;
  if (world.over) return;
  if (player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);
  if (player.reload > 0) player.reload = Math.max(0, player.reload - dt);
  // Slow health recovery while the law is not after you.
  if (world.wanted === 0 && player.health > 0 && player.health < PLAYER.health && world.time - player.lastDamage > 6) {
    player.health = Math.min(PLAYER.health, player.health + 2 * dt);
  }
  if (player.onFoot) stepOnFoot(world, dt, ctl);
  else stepDriving(world, dt, ctl);
  const car = player.car;
  if (car && car.health <= 0 && !car.dead) {
    // The car is wrecked: combat turns it into an explosion next step, and the
    // player is thrown clear on foot here.
    player.onFoot = true;
    player.car = null;
    player.x += Math.cos(player.angle + Math.PI / 2) * 40;
    player.y += Math.sin(player.angle + Math.PI / 2) * 40;
    damagePlayer(world, 20);
  }
}

export { damagePlayer, nearestCar, enterCar, exitCar, moveWithBuildings };
