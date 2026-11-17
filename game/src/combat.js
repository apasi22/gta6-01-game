// Combat: Sugeng's pistol, the SMG Agus hands over after five jobs, his fists, and
// everything that blows up. Bullets fly from the player toward the mouse, punch is
// a short arc in front of him, and a car whose health reaches zero goes up in an
// explosion that hurts whatever is close. Particles (smoke, sparks, muzzle flash,
// explosion) live here too.
import { WANTED } from './config.js';
import { addWanted, collidesBuilding, showBanner, showDialogue } from './world.js';
import { damagePlayer } from './player.js';

const BULLET_SPEED = 900;
const WEAPONS = {
  PISTOL: { mag: 12, interval: 0.16, reload: 1.2, flash: 3 },
  SMG: { mag: 30, interval: 0.09, reload: 1.4, flash: 5 },
};

function spawnParticles(world, x, y, count, color, speed, life, size) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.rng() * Math.PI * 2;
    const v = speed * (0.3 + world.rng() * 0.7);
    world.particles.push({
      x, y,
      vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
      life: life * (0.6 + world.rng() * 0.4), max: life,
      size: size * (0.6 + world.rng() * 0.8), color,
    });
  }
}

function explodeCar(world, car) {
  car.dead = true;
  world.shake = Math.max(world.shake, 14);
  world.explosion = true;
  spawnParticles(world, car.x, car.y, 26, '#ff9f1c', 260, 0.9, 10);
  spawnParticles(world, car.x, car.y, 18, '#e74c3c', 180, 1.1, 12);
  spawnParticles(world, car.x, car.y, 12, '#555555', 90, 1.6, 14);
  const player = world.player;
  const d = Math.hypot(player.x - car.x, player.y - player.y);
  if (d < 130) damagePlayer(world, Math.round(40 * (1 - d / 130)) + 10);
  for (const ped of world.peds) {
    if (ped.state !== 'down' && Math.hypot(ped.x - car.x, ped.y - car.y) < 110) {
      ped.state = 'down';
      ped.downTimer = 5;
    }
  }
}

function witnessNearby(world, x, y, range) {
  for (const ped of world.peds) {
    if (ped.state !== 'down' && Math.hypot(ped.x - x, ped.y - y) < range) return true;
  }
  for (const cop of world.cops) {
    if (Math.hypot(cop.x - x, cop.y - y) < range) return true;
  }
  for (const car of world.cars) {
    if (car.kind === 'police' && !car.dead && Math.hypot(car.x - x, car.y - y) < range) return true;
  }
  return false;
}

function shoot(world, ctl) {
  const player = world.player;
  const weapon = WEAPONS[player.weapon] ?? WEAPONS.PISTOL;
  if (!player.onFoot || player.ammo <= 0 || player.reload > 0) return;
  player.ammo -= 1;
  player.reload = player.ammo === 0 ? weapon.reload : weapon.interval;
  if (player.ammo === 0) showBanner(world, 'Reloading…', 1);
  world.stats.shotsFired += 1;
  world.lastShotX = player.x;
  world.lastShotY = player.y;
  world.lastShotTime = world.time;
  const angle = Math.atan2(ctl.aimY - player.y, ctl.aimX - player.x);
  player.angle = angle;
  world.bullets.push({
    x: player.x + Math.cos(angle) * 22, y: player.y + Math.sin(angle) * 22,
    angle, speed: BULLET_SPEED, life: 1.1, from: 'player',
  });
  spawnParticles(world, player.x + Math.cos(angle) * 26, player.y + Math.sin(angle) * 26, weapon.flash, '#ffd94d', 120, 0.15, 5);
  world.gunshot = true;
  if (witnessNearby(world, player.x, player.y, 500)) addWanted(world, WANTED.crimeShoot);
}

function punch(world) {
  const player = world.player;
  if (!player.onFoot) return;
  const reach = 48;
  const px = player.x + Math.cos(player.angle) * reach;
  const py = player.y + Math.sin(player.angle) * reach;
  let hit = false;
  for (const ped of world.peds) {
    if (ped.state === 'down') continue;
    if (Math.hypot(ped.x - px, ped.y - py) < 30) {
      ped.state = 'down';
      ped.downTimer = 3;
      hit = true;
      if (witnessNearby(world, player.x, player.y, 400)) addWanted(world, WANTED.crimeHitPed);
    }
  }
  for (const cop of world.cops) {
    if (Math.hypot(cop.x - px, cop.y - py) < 30) {
      cop.hp -= 34;
      hit = true;
      addWanted(world, WANTED.crimeCopDown);
      if (cop.hp <= 0) showBanner(world, 'Cop down — that will cost you.', 3);
    }
  }
  if (hit) world.punchHit = true;
}

function stepParticles(world, dt) {
  for (const particle of world.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 1 - 2.4 * dt;
    particle.vy *= 1 - 2.4 * dt;
    particle.life -= dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
}

/** One fixed step: firing, punching, bullets, explosions, particles. */
export function stepCombat(world, dt, ctl) {
  if (world.over) return;
  const player = world.player;
  // Agus's SMG: five jobs in, the pistol gets retired.
  if (player.weapon === 'PISTOL' && world.stats.missionsDone >= 5) {
    player.weapon = 'SMG';
    player.ammo = WEAPONS.SMG.mag;
    showDialogue(world, 'AGUS', 'You earned this. Thirty rounds — spend them wisely.', 5);
  }
  if (ctl.shoot) shoot(world, ctl);
  if (ctl.punch) punch(world);
  // Ammo refills on its own once the magazine is empty.
  const weapon = WEAPONS[player.weapon] ?? WEAPONS.PISTOL;
  if (player.ammo === 0 && player.reload <= 0) player.ammo = weapon.mag;

  for (const bullet of world.bullets) {
    bullet.x += Math.cos(bullet.angle) * bullet.speed * dt;
    bullet.y += Math.sin(bullet.angle) * bullet.speed * dt;
    bullet.life -= dt;
    if (bullet.life <= 0) continue;
    if (bullet.from !== 'player') continue;
    // A bullet in a building is a spark and nothing more.
    if (collidesBuilding(world.city, bullet.x, bullet.y, 2)) {
      bullet.life = 0;
      spawnParticles(world, bullet.x, bullet.y, 3, '#ffd94d', 80, 0.2, 4);
      continue;
    }
    for (const ped of world.peds) {
      if (ped.state === 'down') continue;
      if (Math.hypot(ped.x - bullet.x, ped.y - bullet.y) < 14) {
        ped.state = 'down';
        ped.downTimer = 5;
        bullet.life = 0;
        addWanted(world, WANTED.crimeHitPed);
        break;
      }
    }
    if (bullet.life <= 0) continue;
    for (const cop of world.cops) {
      if (Math.hypot(cop.x - bullet.x, cop.y - bullet.y) < 14) {
        cop.hp -= 34;
        bullet.life = 0;
        addWanted(world, WANTED.crimeCopDown);
        if (cop.hp <= 0) showBanner(world, 'Cop down — that will cost you.', 3);
        break;
      }
    }
    if (bullet.life <= 0) continue;
    for (const car of world.cars) {
      if (car.dead || car === player.car) continue;
      if (Math.hypot(car.x - bullet.x, car.y - bullet.y) < 24) {
        car.health -= 25;
        bullet.life = 0;
        spawnParticles(world, bullet.x, bullet.y, 4, '#c0c0c0', 100, 0.25, 4);
        if (car.kind === 'police') addWanted(world, WANTED.crimeShoot);
        break;
      }
    }
  }
  world.bullets = world.bullets.filter((b) => b.life > 0);

  // Wrecked cars explode; smoking cars smoulder.
  for (const car of world.cars) {
    if (!car.dead && car.health <= 0) explodeCar(world, car);
    else if (!car.dead && car.health < 40 && world.rng() < 0.3) {
      world.particles.push({
        x: car.x + (world.rng() - 0.5) * 20, y: car.y + (world.rng() - 0.5) * 20,
        vx: 0, vy: -30, life: 0.9, max: 0.9, size: 10, color: 'rgba(90,90,90,0.55)',
      });
    }
  }
  world.cars = world.cars.filter((car) => !car.dead || car === player.car);

  stepParticles(world, dt);
}

export { spawnParticles, explodeCar, WEAPONS };
