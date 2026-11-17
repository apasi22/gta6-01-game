// Drawing only: the world's state and the current screen in, pixels out. The camera
// follows Mara with a smooth lerp and a shake on impacts; only the blocks in view are
// painted. The city is drawn ground first — ocean and beach at the edges, districts,
// roads with centre dashes — then buildings, cars, pedestrians and Mara, then particles,
// a dusk tint after 18:00, and the HUD on top.
import { FIELD, FONT, PALETTE, ROAD_W, STREET, STREET0, WORLD } from './config.js';
import { BLOCK_COLS, BLOCK_ROWS } from './world.js';
import { drawHUD, SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED } from './hud.js';
import { currentObjective } from './missions.js';

export { SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED };
export const SCREEN_OVER = 'over';

function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-20, -11, 44, 26);
  ctx.fillStyle = car.color;
  // Body: a rounded rectangle, 44 long and 22 wide.
  ctx.beginPath();
  ctx.roundRect(-22, -11, 44, 22, 6);
  ctx.fill();
  // Windshield + roof.
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  ctx.fillRect(-4, -9, 8, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(6, -8, 10, 16);
  if (car.kind === 'police') {
    ctx.fillStyle = '#111111';
    ctx.fillRect(-14, -11, 10, 22);
    // Flashing light bar.
    const red = Math.floor(time * 4) % 2 === 0;
    ctx.fillStyle = red ? '#ff2d2d' : '#2d7dff';
    ctx.fillRect(-2, -12, 7, 5);
    ctx.fillStyle = red ? '#2d7dff' : '#ff2d2d';
    ctx.fillRect(-2, 7, 7, 5);
  }
  if (car.missionCar) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-24, -13, 48, 26, 7);
    ctx.stroke();
  }
  if (car.health < 40) {
    ctx.fillStyle = 'rgba(40,40,40,0.7)';
    ctx.beginPath();
    ctx.arc(-14, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPed(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  if (ped.state === 'down') {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 3, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath();
  ctx.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, world) {
  const player = world.player;
  ctx.save();
  if (player.onFoot) {
    ctx.translate(player.x, player.y);
    if (player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath();
    ctx.arc(Math.cos(player.angle) * 4, Math.sin(player.angle) * 4, 5, 0, Math.PI * 2);
    ctx.fill();
    // Pistol in hand when aiming.
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(player.angle) * 10, Math.sin(player.angle) * 10);
    ctx.lineTo(Math.cos(player.angle) * 18, Math.sin(player.angle) * 18);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCop(ctx, cop) {
  ctx.save();
  ctx.translate(cop.x, cop.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d3a8a';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath();
  ctx.arc(Math.cos(cop.angle) * 4, Math.sin(cop.angle) * 4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d3a8a';
  ctx.fillRect(-6, -14, 12, 5);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function districtGround(district) {
    if (district === 'downtown') return PALETTE.downtown;
    if (district === 'harbor') return PALETTE.harbor;
    if (district === 'beach') return PALETTE.beach;
    return PALETTE.suburbs;
  }

  function drawGround(world, left, top, right, bottom) {
    // Base grass, then the ocean west and the sand east/south.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.fillStyle = PALETTE.ocean;
    ctx.fillRect(left, top, Math.min(right, 192) - left, bottom - top);
    ctx.fillStyle = PALETTE.oceanDeep;
    for (let y = Math.floor(top / 90) * 90; y < bottom; y += 90) {
      ctx.fillRect(20, y, 120, 3);
    }
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(Math.max(left, WORLD.width - 192), top, right - Math.max(left, WORLD.width - 192), bottom - top);
    ctx.fillRect(left, Math.max(top, WORLD.height - 192), right - left, bottom - Math.max(top, WORLD.height - 192));

    // Blocks: district ground, parks green, parking lots grey.
    const i0 = Math.max(0, Math.floor((left - STREET0 - ROAD_W / 2) / STREET));
    const i1 = Math.min(BLOCK_COLS - 1, Math.floor((right - STREET0 - ROAD_W / 2) / STREET));
    const j0 = Math.max(0, Math.floor((top - STREET0 - ROAD_W / 2) / STREET));
    const j1 = Math.min(BLOCK_ROWS - 1, Math.floor((bottom - STREET0 - ROAD_W / 2) / STREET));
    for (let j = j0; j <= j1; j += 1) {
      for (let i = i0; i <= i1; i += 1) {
        const block = world.city.blocks[j * BLOCK_COLS + i];
        ctx.fillStyle = block.kind === 'park' ? PALETTE.park : block.kind === 'lot' ? PALETTE.concrete : districtGround(block.district);
        ctx.fillRect(block.x, block.y, block.w, block.h);
        if (block.kind === 'lot') {
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 2;
          for (let s = 0; s < 4; s += 1) {
            ctx.strokeRect(block.x + 40 + s * 80, block.y + 150, 60, 90);
          }
        }
      }
    }

    // Roads: asphalt bands with a dashed centre line.
    ctx.fillStyle = PALETTE.asphalt;
    for (const sx of world.city.streetsX) {
      ctx.fillRect(sx - ROAD_W / 2, top, ROAD_W, bottom - top);
    }
    for (const sy of world.city.streetsY) {
      ctx.fillRect(left, sy - ROAD_W / 2, right - left, ROAD_W);
    }
    ctx.strokeStyle = PALETTE.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([24, 30]);
    for (const sx of world.city.streetsX) {
      ctx.beginPath();
      ctx.moveTo(sx, top);
      ctx.lineTo(sx, bottom);
      ctx.stroke();
    }
    for (const sy of world.city.streetsY) {
      ctx.beginPath();
      ctx.moveTo(left, sy);
      ctx.lineTo(right, sy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawBuildings(world, left, top, right, bottom) {
    const i0 = Math.max(0, Math.floor((left - STREET0 - ROAD_W / 2) / STREET));
    const i1 = Math.min(BLOCK_COLS - 1, Math.floor((right - STREET0 - ROAD_W / 2) / STREET));
    const j0 = Math.max(0, Math.floor((top - STREET0 - ROAD_W / 2) / STREET));
    const j1 = Math.min(BLOCK_ROWS - 1, Math.floor((bottom - STREET0 - ROAD_W / 2) / STREET));
    for (let j = j0; j <= j1; j += 1) {
      for (let i = i0; i <= i1; i += 1) {
        const block = world.city.blocks[j * BLOCK_COLS + i];
        for (const b of block.buildings) {
          if (b.x > right || b.x + b.w < left || b.y > bottom || b.y + b.h < top) continue;
          // Fake height: a shadow offset down-right, then the wall, then the roof.
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(b.x + 5 * b.hgt, b.y + 6 * b.hgt, b.w, b.h);
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.fillStyle = b.roof;
          ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x, b.y, b.w, b.h);
        }
        for (const tree of block.trees) {
          if (tree.x < left || tree.x > right || tree.y < top || tree.y > bottom) continue;
          ctx.fillStyle = '#2f6b2f';
          ctx.beginPath();
          ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#4a9e4a';
          ctx.beginPath();
          ctx.arc(tree.x - 3, tree.y - 3, tree.r - 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawObjectiveMarker(ctx, world) {
    const objective = currentObjective(world);
    if (!objective) return;
    const pulse = 1 + Math.sin(world.time * 5) * 0.15;
    ctx.save();
    ctx.translate(objective.x, objective.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(16, 0);
    ctx.lineTo(0, 22);
    ctx.lineTo(-16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 16px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, 1);
    ctx.restore();
    // A beam so the marker is visible from far away.
    ctx.fillStyle = 'rgba(255,217,77,0.12)';
    ctx.fillRect(objective.x - 8, objective.y - 300, 16, 600);
  }

  /** Paint one frame: the city, the cars and people, the particles, then the HUD. */
  function draw(world, screen, best) {
    const player = world.player;
    // Camera: lerp toward the player, look a little ahead of a fast car, shake on hits.
    const lookX = player.onFoot ? 0 : Math.cos(player.angle) * Math.abs(player.speed) * 0.18;
    const lookY = player.onFoot ? 0 : Math.sin(player.angle) * Math.abs(player.speed) * 0.18;
    const tx = Math.min(WORLD.width - FIELD.width / 2, Math.max(FIELD.width / 2, player.x + lookX));
    const ty = Math.min(WORLD.height - FIELD.height / 2, Math.max(FIELD.height / 2, player.y + lookY));
    world.camera.x += (tx - world.camera.x) * 0.12;
    world.camera.y += (ty - world.camera.y) * 0.12;
    const shakeX = world.shake > 0 ? (world.rng() - 0.5) * world.shake : 0;
    const shakeY = world.shake > 0 ? (world.rng() - 0.5) * world.shake : 0;
    if (world.shake > 0) world.shake = Math.max(0, world.shake - 0.6);
    const camX = world.camera.x + shakeX;
    const camY = world.camera.y + shakeY;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11141b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.save();
    ctx.translate(FIELD.width / 2 - camX, FIELD.height / 2 - camY);
    const left = camX - FIELD.width / 2 - 40;
    const top = camY - FIELD.height / 2 - 40;
    const right = camX + FIELD.width / 2 + 40;
    const bottom = camY + FIELD.height / 2 + 40;

    drawGround(world, left, top, right, bottom);
    drawBuildings(world, left, top, right, bottom);
    drawObjectiveMarker(ctx, world);

    for (const car of world.cars) {
      if (car.dead) continue;
      if (car.x < left || car.x > right || car.y < top || car.y > bottom) continue;
      drawCar(ctx, car, world.time);
    }
    for (const ped of world.peds) {
      if (ped.x < left || ped.x > right || ped.y < top || ped.y > bottom) continue;
      drawPed(ctx, ped);
    }
    for (const cop of world.cops) {
      if (cop.x < left || cop.x > right || cop.y < top || cop.y > bottom) continue;
      drawCop(ctx, cop);
    }
    // Mara: on foot she is drawn here; in a car the car itself is her.
    if (player.onFoot) drawPlayer(ctx, world);

    // Bullets.
    ctx.fillStyle = '#ffd94d';
    for (const bullet of world.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Particles.
    for (const particle of world.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.max);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Dusk: after 18:00 a warm orange wash deepens with the clock.
    const dusk = Math.min(1, Math.max(0, (world.clock - 18 * 3600) / 3600));
    if (dusk > 0) {
      ctx.fillStyle = `rgba(255,120,40,${0.10 * dusk})`;
      ctx.fillRect(left, top, right - left, bottom - top);
    }
    // Vignette.
    const vignette = ctx.createRadialGradient(camX, camY, FIELD.height * 0.42, camX, camY, FIELD.height * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vignette;
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.restore();

    drawHUD(ctx, world, screen, best);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
