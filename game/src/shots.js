// The screenshot scenes behind ?shot=cover|foot|mission|chase. Each one sets the world to
// a staged moment — Mara in a chase, on foot stealing a car, mid-mission, five stars —
// then plays the real rules forward for a couple of seconds with a simple autopilot that
// drives or walks toward the objective, so the frame is what real play looks like and the
// same seed always gives the same frame. Missions are not stepped here: the staged mission
// is the scene, and stepping it would complete it and change the shot.
import { PALETTE, STEP } from './config.js';
import { SCREEN_PLAY } from './render.js';
import { stepPlayer } from './player.js';
import { stepTraffic } from './traffic.js';
import { stepPolice } from './police.js';
import { stepCombat } from './combat.js';

const COVER_SECONDS = 2.5;
const FOOT_SECONDS = 2;
const MISSION_SECONDS = 2;
const CHASE_SECONDS = 2;

function baseCtl() {
  return {
    mx: 0, my: 0, throttle: 0, steer: 0, brake: false, sprint: false,
    enter: false, punch: false, shoot: false, aimX: 0, aimY: 0, horn: false,
  };
}

/** Drive straight toward a point: pick the axis with the most distance left. */
function driveCtl(world, tx, ty) {
  const player = world.player;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const desired = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : Math.PI) : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
  let diff = desired - player.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const ctl = baseCtl();
  ctl.throttle = Math.abs(diff) > 1.4 ? 0.35 : 1;
  ctl.steer = Math.max(-1, Math.min(1, diff * 2));
  ctl.aimX = tx;
  ctl.aimY = ty;
  return ctl;
}

/** Walk toward a point. */
function walkCtl(world, tx, ty) {
  const player = world.player;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const len = Math.hypot(dx, dy) || 1;
  const ctl = baseCtl();
  ctl.mx = dx / len;
  ctl.my = dy / len;
  ctl.aimX = tx;
  ctl.aimY = ty;
  return ctl;
}

function putPlayerInCar(world, x, y, angle, color) {
  const car = {
    kind: 'player', x, y, angle, speed: 0,
    color, health: 100, dead: false,
  };
  world.cars.push(car);
  const player = world.player;
  player.car = car;
  player.onFoot = false;
  player.x = x;
  player.y = y;
  player.angle = angle;
  player.speed = 320;
  car.speed = 320;
  return car;
}

function putCopCar(world, x, y, angle) {
  const car = {
    kind: 'police', x, y, angle, speed: 300,
    color: '#f5f5f0', health: 100, dead: false, light: 0,
  };
  world.cars.push(car);
  return car;
}

function placeTraffic(world, x, y, axis, dir) {
  const lane = axis === 'x' ? (dir === 1 ? 24 : -24) : (dir === 1 ? -24 : 24);
  const line = axis === 'x' ? y - lane : x - lane;
  const car = {
    kind: 'traffic', x, y,
    angle: axis === 'x' ? (dir === 1 ? 0 : Math.PI) : (dir === 1 ? Math.PI / 2 : -Math.PI / 2),
    dir, axis, line,
    speed: 170, maxSpeed: 180,
    color: world.rng() < 0.5 ? '#2980b9' : '#f39c12',
    health: 100, dead: false, atJunction: false,
  };
  world.cars.push(car);
  return car;
}

function addSmoke(world, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    world.particles.push({
      x: x + (world.rng() - 0.5) * 40, y: y + (world.rng() - 0.5) * 30,
      vx: (world.rng() - 0.5) * 20, vy: -25 - world.rng() * 20,
      life: 1.2, max: 1.2, size: 11, color: 'rgba(90,90,90,0.55)',
    });
  }
}

/** Run the sim forward for `seconds` with an autopilot control function. */
function playForward(world, seconds, ctlFor) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.time += STEP;
    world.clock += STEP * 30; // the game clock runs 30x real time
    const ctl = ctlFor(world);
    stepPlayer(world, STEP, ctl);
    stepTraffic(world, STEP);
    stepPolice(world, STEP);
    stepCombat(world, STEP, ctl);
    if (world.over) break;
  }
  // The camera snaps to Mara: the shot is framed on her, not on the spawn point.
  world.camera.x = world.player.x;
  world.camera.y = world.player.y;
  world.bannerUntil = world.time + 4;
}

function stageCover(world) {
  // Dusk police chase downtown: Mara's red car east on 1680th street, two cop cars on
  // her tail, three stars, mission 3's getaway on the HUD.
  world.clock = 18.67 * 3600;
  world.wanted = 3;
  world.siren = true;
  world.mission = { index: 2, step: 1, timer: 45, done: false };
  world.banner = 'The alarm is up — three stars and counting!';
  putPlayerInCar(world, 1500, 1680, 0, PALETTE.playerCar);
  putCopCar(world, 1330, 1704, 0);
  putCopCar(world, 1380, 1656, 0);
  placeTraffic(world, 2100, 1704, 'x', 1);
  placeTraffic(world, 2400, 1656, 'x', -1);
  addSmoke(world, 1560, 1680, 8);
  playForward(world, COVER_SECONDS, (w) => driveCtl(w, 3600, 1680));
}

function stageFoot(world) {
  // On foot downtown, closing on the red parked car while the street lives around her.
  world.player.x = 2080;
  world.player.y = 1740;
  world.player.angle = 0;
  world.player.onFoot = true;
  world.player.car = null;
  world.camera.x = 2160;
  world.camera.y = 1680;
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2;
    world.peds.push({
      x: 2160 + Math.cos(angle) * 130, y: 1680 + Math.sin(angle) * 130,
      angle: world.rng() * Math.PI * 2, dir: 1, axis: 'x', line: 1680,
      speed: 55, color: '#3498db', state: 'walk', fleeTimer: 0, downTimer: 0,
      atJunction: false, hp: 30,
    });
  }
  placeTraffic(world, 1900, 1704, 'x', 1);
  placeTraffic(world, 2500, 1656, 'x', -1);
  playForward(world, FOOT_SECONDS, (w) => walkCtl(w, 2260, 1720));
}

function stageMission(world) {
  // Mission 3, the getaway: 45 seconds on the clock, three stars, the hideout marker
  // ahead on 2160th street, Mara's car already at speed.
  world.clock = 17.83 * 3600;
  world.wanted = 3;
  world.siren = true;
  world.mission = { index: 2, step: 1, timer: 45, done: false };
  world.banner = 'Escape to the hideout — lose the cops!';
  putPlayerInCar(world, 1680, 2160, Math.PI, PALETTE.playerCar);
  putCopCar(world, 1860, 2136, Math.PI);
  putCopCar(world, 1820, 2184, Math.PI);
  addSmoke(world, 1620, 2160, 6);
  playForward(world, MISSION_SECONDS, (w) => driveCtl(w, 720, 2160));
}

function stageChase(world) {
  // Five stars: Mara flat out east on 1200th street, two cops chasing, two more forming
  // a roadblock ahead, smoke trailing from her car.
  world.clock = 18.33 * 3600;
  world.wanted = 5;
  world.siren = true;
  world.mission = { index: 2, step: 1, timer: 38, done: false };
  world.banner = 'Five stars. Every cop in Solmar is coming.';
  putPlayerInCar(world, 1200, 1200, 0, PALETTE.playerCar);
  putCopCar(world, 1030, 1224, 0);
  putCopCar(world, 1080, 1176, 0);
  const block1 = putCopCar(world, 2400, 1176, Math.PI / 2);
  block1.speed = 0;
  const block2 = putCopCar(world, 2400, 1224, -Math.PI / 2);
  block2.speed = 0;
  addSmoke(world, 1260, 1200, 10);
  playForward(world, CHASE_SECONDS, (w) => driveCtl(w, 3600, 1200));
}

/**
 * Set `world` to the named scene (cover, foot, mission or chase; anything else is cover)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'foot') stageFoot(world);
  else if (name === 'mission') stageMission(world);
  else if (name === 'chase') stageChase(world);
  else stageCover(world);
  return { screen: SCREEN_PLAY, best: 0 };
}
