// Wilwatikta's traffic and its pedestrians. Traffic cars drive the street grid on
// the right side of the road and turn at intersections; pedestrians walk the
// sidewalks, pause to look around, and run when a gun goes off or a car bears down
// on them. Both respawn near the player when they wander too far, so the streets
// always feel alive.
import { PEDS, TRAFFIC } from './config.js';
import { nearestIntersection, spawnParkedCar, spawnPed, spawnTrafficCar } from './world.js';

function laneOffset(axis, dir) {
  if (axis === 'x') return dir === 1 ? 24 : -24;
  return dir === 1 ? -24 : 24;
}

function carAngle(axis, dir) {
  if (axis === 'x') return dir === 1 ? 0 : Math.PI;
  return dir === 1 ? Math.PI / 2 : -Math.PI / 2;
}

/** At an intersection, keep going, turn left or turn right; never U-turn. */
function chooseTurn(world, car) {
  const junction = nearestIntersection(car.x, car.y);
  const roll = world.rng();
  if (roll < 0.55) return; // straight on
  const newAxis = car.axis === 'x' ? 'y' : 'x';
  const newDir = world.rng() < 0.5 ? 1 : -1;
  const newLine = car.axis === 'x' ? junction.x : junction.y;
  const lane = laneOffset(newAxis, newDir);
  if (newAxis === 'x') {
    car.y = newLine + lane;
  } else {
    car.x = newLine + lane;
  }
  car.axis = newAxis;
  car.dir = newDir;
  car.line = newLine;
  car.angle = carAngle(newAxis, newDir);
}

function stepTrafficCar(world, car, dt) {
  const player = world.player;
  // Slow for the car ahead, and for the player's car.
  let targetSpeed = car.maxSpeed;
  const aheadX = car.x + Math.cos(car.angle) * 70;
  const aheadY = car.y + Math.sin(car.angle) * 70;
  for (const other of world.cars) {
    if (other === car || other.dead) continue;
    if (Math.hypot(other.x - aheadX, other.y - aheadY) < 34) {
      targetSpeed = 0;
      break;
    }
  }
  if (player.car !== car && Math.hypot(player.x - aheadX, player.y - aheadY) < 34) targetSpeed = 0;
  car.speed += Math.max(-260 * dt, Math.min(180 * dt, targetSpeed - car.speed));

  if (car.axis === 'x') car.x += car.dir * car.speed * dt;
  else car.y += car.dir * car.speed * dt;

  // Turning is decided once per intersection, when the car first enters it.
  const along = car.axis === 'x' ? car.x : car.y;
  const junctionCoord = car.axis === 'x'
    ? nearestIntersection(car.x, car.y).x
    : nearestIntersection(car.x, car.y).y;
  if (Math.abs(along - junctionCoord) < 8 && !car.atJunction) {
    car.atJunction = true;
    chooseTurn(world, car);
  } else if (Math.abs(along - junctionCoord) > 48) {
    car.atJunction = false;
  }
}

function stepPed(world, ped, dt) {
  if (ped.state === 'down') {
    ped.downTimer -= dt;
    if (ped.downTimer <= 0) {
      ped.state = 'walk';
      ped.hp = 30;
      ped.x += 30;
    }
    return;
  }
  const player = world.player;
  // Flee a nearby threat: gunfire, or a fast car heading at you.
  const threatX = world.lastShotX ?? player.x;
  const threatY = world.lastShotY ?? player.y;
  const threatNear = (world.time - (world.lastShotTime ?? -99) < 1.5 && Math.hypot(ped.x - threatX, ped.y - threatY) < 320)
    || (!player.onFoot && Math.abs(player.speed) > 200 && Math.hypot(ped.x - player.x, ped.y - player.y) < 130);
  if (threatNear && ped.state !== 'flee') {
    ped.state = 'flee';
    ped.fleeTimer = 2;
    ped.angle = Math.atan2(ped.y - threatY, ped.x - threatX);
  }
  if (ped.state === 'flee') {
    ped.fleeTimer -= dt;
    ped.x += Math.cos(ped.angle) * PEDS.fleeSpeed * dt;
    ped.y += Math.sin(ped.angle) * PEDS.fleeSpeed * dt;
    if (ped.fleeTimer <= 0) ped.state = 'walk';
    return;
  }
  if (ped.state === 'idle') {
    ped.idleTimer -= dt;
    if (ped.idleTimer <= 0) ped.state = 'walk';
    return;
  }
  // Stroll the sidewalk; sometimes pause to look around; turn at intersections.
  if (world.rng() < 0.002) {
    ped.state = 'idle';
    ped.idleTimer = 1 + world.rng() * 2;
    return;
  }
  const speed = ped.speed;
  if (ped.axis === 'x') ped.x += ped.dir * speed * dt;
  else ped.y += ped.dir * speed * dt;
  const along = ped.axis === 'x' ? ped.x : ped.y;
  const junctionCoord = ped.axis === 'x'
    ? nearestIntersection(ped.x, ped.y).x
    : nearestIntersection(ped.x, ped.y).y;
  if (Math.abs(along - junctionCoord) < 8 && !ped.atJunction) {
    ped.atJunction = true;
    if (world.rng() < 0.4) {
      const newAxis = ped.axis === 'x' ? 'y' : 'x';
      const newDir = world.rng() < 0.5 ? 1 : -1;
      const junction = nearestIntersection(ped.x, ped.y);
      const newLine = ped.axis === 'x' ? junction.x : junction.y;
      const side = world.rng() < 0.5 ? 70 : -70;
      if (newAxis === 'x') ped.y = newLine + side;
      else ped.x = newLine + side;
      ped.axis = newAxis;
      ped.dir = newDir;
      ped.line = newLine;
      ped.angle = carAngle(newAxis, newDir);
    }
  } else if (Math.abs(along - junctionCoord) > 48) {
    ped.atJunction = false;
  }
  ped.angle = Math.atan2(
    ped.axis === 'x' ? 0 : ped.dir,
    ped.axis === 'x' ? ped.dir : 0,
  );
}

/** One fixed step for traffic cars and pedestrians, including respawns near the player. */
export function stepTraffic(world, dt) {
  const player = world.player;
  for (const car of world.cars) {
    if (car.kind !== 'traffic' || car.dead) continue;
    stepTrafficCar(world, car, dt);
  }
  // Traffic that drove far away respawns near the player, off-screen.
  for (let i = 0; i < world.cars.length; i += 1) {
    const car = world.cars[i];
    if (car.kind !== 'traffic' || car.dead) continue;
    if (Math.hypot(car.x - player.x, car.y - player.y) > 1700) {
      world.cars[i] = spawnTrafficCar(world.rng, world.city);
    }
  }
  for (const ped of world.peds) stepPed(world, ped, dt);
  for (let i = 0; i < world.peds.length; i += 1) {
    const ped = world.peds[i];
    if (Math.hypot(ped.x - player.x, ped.y - player.y) > 1500) {
      world.peds[i] = spawnPed(world.rng);
    }
  }
  // Keep the parked-car count up: the city always has cars worth stealing.
  let parked = 0;
  for (const car of world.cars) if (car.kind === 'parked' && !car.dead) parked += 1;
  if (parked < TRAFFIC.parked / 2 && world.rng() < 0.02) {
    world.cars.push(spawnParkedCar(world.rng));
  }
}
