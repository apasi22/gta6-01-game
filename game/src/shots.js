// The screenshot scenes behind ?shot=cover|foot|mission|chase. Each one sets the world
// to a staged moment — Sugeng in a dusk chase with the helicopter overhead, on foot
// stealing the gold coupe, mid-mission at night in the harbor, five stars with a
// roadblock ahead — then plays the real rules forward for a couple of seconds with a
// simple autopilot that drives or walks toward the objective, so the frame is what
// real play looks like and the same seed always gives the same frame. Missions are
// not stepped here: the staged mission is the scene, and stepping it would complete
// it and change the shot.
import { PALETTE, STEP } from './config.js';
import { distToStreet } from './world.js';
import { SCREEN_PLAY } from './render.js';
import { stepPlayer } from './player.js';
import { stepTraffic } from './traffic.js';
import { stepPolice } from './police.js';
import { stepCombat } from './combat.js';

const COVER_SECONDS = 2.5;
const FOOT_SECONDS = 2;
const MISSION_SECONDS = 2;
const CHASE_SECONDS = 2;

const PARKED_MODELS = ['GARUDA GT', 'KENCANA S', 'ARJUNA', 'SRIKANDI', 'GATOTKACA', 'BIMA'];
const PARKED_COLORS = ['#2980b9', '#f39c12', '#7f8c8d', '#27ae60', '#8e44ad', '#d35400'];

function baseCtl() {
  return {
    mx: 0, my: 0, throttle: 0, steer: 0, brake: false, sprint: false,
    enter: false, punch: false, shoot: false, aimX: 0, aimY: 0, horn: false,
  };
}

/** Drive toward a point along the streets: pick the axis with the most distance left,
 * but only change axis at an intersection, and slow for the turn — so the car never
 * cuts across blocks and never wedges itself against a building. Close in, aim
 * straight at the point. */
function driveCtl(world, tx, ty) {
  const player = world.player;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const dist = Math.hypot(dx, dy);
  let desired;
  if (dist < 120) {
    desired = Math.atan2(dy, dx);
  } else {
    const travelingX = Math.abs(Math.cos(player.angle)) > Math.abs(Math.sin(player.angle));
    const wantX = Math.abs(dx) > Math.abs(dy);
    let goX = wantX;
    if (wantX !== travelingX) {
      const along = travelingX ? player.x : player.y;
      if (distToStreet(along) > 70) goX = travelingX; // not at an intersection: keep going
    }
    desired = goX ? (dx > 0 ? 0 : Math.PI) : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  let diff = desired - player.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const ctl = baseCtl();
  ctl.throttle = Math.abs(diff) > 0.6 ? 0.35 : 1;
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

function putPlayerInCar(world, x, y, angle, color, model) {
  const car = {
    kind: 'player', x, y, angle, speed: 320,
    color, model: model ?? 'GARUDA GT', health: 100, maxHealth: 100, dead: false,
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
    color: '#f5f5f0', model: 'WPD CRUISER', health: 100, maxHealth: 100, dead: false, light: 0,
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
    color: PARKED_COLORS[Math.floor(world.rng() * PARKED_COLORS.length)],
    model: PARKED_MODELS[Math.floor(world.rng() * PARKED_MODELS.length)],
    health: 100, maxHealth: 100, dead: false, atJunction: false,
  };
  world.cars.push(car);
  return car;
}

function placeParked(world, x, y) {
  const car = {
    kind: 'parked', x, y, angle: world.rng() < 0.5 ? 0 : Math.PI / 2, speed: 0,
    color: PARKED_COLORS[Math.floor(world.rng() * PARKED_COLORS.length)],
    model: PARKED_MODELS[Math.floor(world.rng() * PARKED_MODELS.length)],
    health: 100, maxHealth: 100, dead: false,
  };
  world.cars.push(car);
  return car;
}

function placePed(world, x, y) {
  world.peds.push({
    x, y, angle: world.rng() * Math.PI * 2, dir: 1, axis: 'x', line: y,
    speed: 55, color: PARKED_COLORS[Math.floor(world.rng() * PARKED_COLORS.length)],
    state: 'walk', fleeTimer: 0, downTimer: 0, idle: false, idleTimer: 0,
    atJunction: false, hp: 30,
  });
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
  // The camera snaps to Sugeng: the shot is framed on him, not on the spawn point.
  world.camera.x = world.player.x;
  world.camera.y = world.player.y;
  // The staged banner, dialogue and dispatch stay up for the screenshot.
  world.bannerUntil = world.time + 4;
  if (world.dialogue) world.dialogueUntil = world.time + 5;
  if (world.dispatch) world.dispatchUntil = world.time + 5;
}

function stageCover(world) {
  // Dusk chase with the helicopter: Sugeng west through downtown on 1680th street,
  // four stars, mission 9's escape on the HUD, the helicopter overhead.
  world.clock = 18.67 * 3600;
  world.day = 2;
  world.wanted = 4;
  world.siren = true;
  world.dispatchTimer = 6;
  world.mission = { index: 8, step: 1, timer: 45, done: false };
  world.player.cash = 12480;
  world.player.armor = 40;
  world.player.weapon = 'SMG';
  world.player.ammo = 30;
  world.stats.missionsDone = 8;
  world.station = 0;
  world.track = 1;
  world.banner = 'Outrun the helicopter — reach the docks!';
  world.dialogue = 'Four stars and a helicopter. Time to show WPD my taillights.';
  world.dialogueSpeaker = 'SUGENG';
  world.dispatch = 'WPD DISPATCH: air support on scene, suspect heading west downtown.';
  world.heli.x = 2400;
  world.heli.y = 1500;
  putPlayerInCar(world, 3120, 1680, Math.PI, PALETTE.playerCar, 'GARUDA GT');
  // The hero car is staged tough: the chase runs through downtown traffic, and the
  // shot needs Sugeng driving at the end of it, not walking away from a wreck.
  world.player.car.health = 400;
  world.player.car.maxHealth = 400;
  putCopCar(world, 3290, 1704, Math.PI);
  putCopCar(world, 3240, 1656, Math.PI);
  placeTraffic(world, 2664, 1400, 'y', 1);
  placeTraffic(world, 2136, 1900, 'y', -1);
  placeParked(world, 2700, 1730);
  placeParked(world, 2050, 1630);
  placePed(world, 2850, 1620);
  placePed(world, 2400, 1740);
  addSmoke(world, 3060, 1680, 8);
  playForward(world, COVER_SECONDS, (w) => driveCtl(w, 240, 1680));
}

function stageFoot(world) {
  // On foot on Lorong Emas in daylight, closing on the gold coupe while the
  // street lives around him: pedestrians, traffic, neon signs, Agus on the radio.
  world.clock = 14.0 * 3600;
  world.day = 1;
  world.mission = { index: 1, step: 0, timer: 0, done: false };
  world.player.cash = 850;
  world.player.weapon = 'PISTOL';
  world.player.ammo = 12;
  world.stats.missionsDone = 1;
  world.station = 1;
  world.track = 2;
  world.banner = 'Steal the gold coupe uptown';
  world.dialogue = 'Gold coupe, keys in it. Bring it to the garage — and keep it quiet.';
  world.dialogueSpeaker = 'AGUS';
  world.player.x = 3040;
  world.player.y = 790;
  world.player.angle = 0;
  world.player.onFoot = true;
  world.player.car = null;
  world.camera.x = 3120;
  world.camera.y = 720;
  const coupe = placeParked(world, 3170, 762);
  coupe.color = PALETTE.missionCar;
  coupe.model = 'GOLD COUPE';
  coupe.missionCar = true;
  placePed(world, 3050, 700);
  placePed(world, 3200, 790);
  placePed(world, 2960, 740);
  placePed(world, 3260, 700);
  placeTraffic(world, 2900, 744, 'x', 1);
  placeTraffic(world, 3400, 696, 'x', -1);
  placeParked(world, 3050, 790);
  playForward(world, FOOT_SECONDS, (w) => walkCtl(w, 3110, 785));
  // Sugeng ends the walk facing the coupe he came to steal.
  world.player.angle = Math.atan2(coupe.y - world.player.y, coupe.x - world.player.x);
}

function stageMission(world) {
  // Mission 11 at night in the harbor: 75 seconds on the clock, three stars, the
  // escape marker ahead, Sugeng's car already at speed, lit windows everywhere.
  world.clock = 21.5 * 3600;
  world.day = 3;
  world.wanted = 3;
  world.siren = true;
  world.dispatchTimer = 6;
  world.mission = { index: 10, step: 1, timer: 75, done: false };
  world.player.cash = 6200;
  world.player.armor = 25;
  world.player.weapon = 'SMG';
  world.player.ammo = 30;
  world.stats.missionsDone = 10;
  world.station = 0;
  world.track = 0;
  world.banner = 'It was a setup — run!';
  world.dialogue = 'Agus set me up. The case, the cops — all of it. I am done running.';
  world.dialogueSpeaker = 'SUGENG';
  world.dispatch = 'WPD DISPATCH: suspect fleeing the harbor, all units converge.';
  putPlayerInCar(world, 720, 2160, -Math.PI / 2, PALETTE.playerCar, 'KENCANA S');
  world.player.car.health = 400;
  world.player.car.maxHealth = 400;
  putCopCar(world, 696, 2340, -Math.PI / 2);
  putCopCar(world, 744, 2300, -Math.PI / 2);
  placeTraffic(world, 1000, 1704, 'x', 1);
  placeParked(world, 670, 1500);
  placePed(world, 800, 1450);
  addSmoke(world, 720, 2220, 6);
  playForward(world, MISSION_SECONDS, (w) => driveCtl(w, 720, 240));
}

function stageChase(world) {
  // Five stars at dusk: Sugeng flat out east on 1200th street, two cops chasing, the
  // helicopter overhead, a roadblock ahead, smoke trailing from his car.
  world.clock = 18.33 * 3600;
  world.day = 3;
  world.wanted = 5;
  world.siren = true;
  world.dispatchTimer = 6;
  world.mission = { index: 11, step: 1, timer: 38, done: false };
  world.player.cash = 9870;
  world.player.armor = 50;
  world.player.weapon = 'SMG';
  world.player.ammo = 30;
  world.stats.missionsDone = 11;
  world.station = 1;
  world.track = 3;
  world.banner = 'Five stars. Every cop in Wilwatikta is coming.';
  world.dialogue = 'One case, one ride across the whole city. Then Wilwatikta is mine.';
  world.dialogueSpeaker = 'SUGENG';
  world.dispatch = 'WPD DISPATCH: roadblock set — stop the suspect at the intersection.';
  world.heli.x = 1400;
  world.heli.y = 1020;
  putPlayerInCar(world, 1200, 1200, 0, PALETTE.playerCar, 'GARUDA GT');
  putCopCar(world, 1030, 1224, 0);
  putCopCar(world, 1080, 1176, 0);
  const block1 = putCopCar(world, 2400, 1176, Math.PI / 2);
  block1.speed = 0;
  block1.blockade = true;
  const block2 = putCopCar(world, 2400, 1224, -Math.PI / 2);
  block2.speed = 0;
  block2.blockade = true;
  world.roadblock = { x: 2400, y: 1200, horizontal: true, cars: [block1, block2] };
  placeTraffic(world, 1700, 1224, 'x', -1);
  placeParked(world, 1900, 1150);
  addSmoke(world, 1260, 1200, 10);
  playForward(world, CHASE_SECONDS, (w) => driveCtl(w, 3600, 1200));
}

/**
 * Set `world` to the named scene (cover, foot, mission or chase; anything else is cover)
 * and return the screen to draw over it, the best score to show, and the menu state.
 */
export function stageShot(name, world) {
  world.shotStaging = true; // staged scenes place their own police furniture by hand
  if (name === 'foot') stageFoot(world);
  else if (name === 'mission') stageMission(world);
  else if (name === 'chase') stageChase(world);
  else stageCover(world);
  return { screen: SCREEN_PLAY, best: 0, ui: { menuIndex: 0, slotSelect: false, garageIndex: 0, saves: [] } };
}
