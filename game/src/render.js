// Drawing only: the world's state and the current screen in, pixels out. The camera
// follows Sugeng with a smooth lerp, a closer zoom and a shake on impacts; only the
// blocks in view are painted. The city is drawn ground first — ocean and boats,
// beach, district grounds, sidewalks, roads with dashes and crosswalks — then
// buildings with signs and lit windows, props, cars, pedestrians and Sugeng, the
// helicopter and its searchlight, particles, day/dusk/night light, and the HUD.
import { DISTRICTS, FIELD, FONT, PALETTE, ROAD_W, STREET, STREET0, WORLD, ZOOM } from './config.js';
import { BLOCK_COLS, BLOCK_ROWS } from './world.js';
import { drawHUD, SCREEN_BUSTED, SCREEN_GARAGE, SCREEN_HOWTO, SCREEN_PASSED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED } from './hud.js';
import { currentObjective } from './missions.js';

export { SCREEN_BUSTED, SCREEN_GARAGE, SCREEN_HOWTO, SCREEN_PASSED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED };
export const SCREEN_OVER = 'over';

/** Deterministic 0..1 hash of a point: window lights and sign colours. */
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Warm dusk glow and night darkness, 0..1 each, from the in-game clock. */
function lightFor(clock) {
  const h = (clock / 3600) % 24;
  let warm = 0;
  if (h >= 17 && h <= 20) warm = 1 - Math.abs(h - 18.5) / 1.5;
  else if (h >= 6 && h <= 7.5) warm = 0.5 * (1 - Math.abs(h - 6.75) / 0.75);
  let dark = 0;
  if (h >= 19.5 || h < 6) dark = 1;
  else if (h >= 18.5) dark = h - 18.5;
  else if (h >= 6 && h < 7) dark = 1 - (h - 6);
  return { warm: Math.max(0, warm), dark: Math.max(0, Math.min(1, dark)) };
}

function drawCar(ctx, car, time, dark) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-20, -11, 44, 26);
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-22, -11, 44, 22, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  ctx.fillRect(-4, -9, 8, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(6, -8, 10, 16);
  // Headlights and taillights; the cones glow at night.
  ctx.fillStyle = dark > 0.3 ? '#fff8c0' : '#f5eeb0';
  ctx.fillRect(20, -9, 3, 5);
  ctx.fillRect(20, 4, 3, 5);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-23, -9, 3, 5);
  ctx.fillRect(-23, 4, 3, 5);
  if (dark > 0.3) {
    ctx.fillStyle = 'rgba(255,248,190,0.10)';
    ctx.beginPath();
    ctx.moveTo(22, -8);
    ctx.lineTo(120, -34);
    ctx.lineTo(120, 34);
    ctx.lineTo(22, 8);
    ctx.closePath();
    ctx.fill();
  }
  if (car.taxi) {
    ctx.fillStyle = '#111111';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 7px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAXI', 0, 0);
  }
  if (car.kind === 'police') {
    ctx.fillStyle = '#111111';
    ctx.fillRect(-14, -11, 10, 22);
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

function drawHeli(ctx, world) {
  const heli = world.heli;
  const player = world.player;
  if (!heli.active) return;
  // Searchlight pool on the player, and the cone from the helicopter.
  ctx.fillStyle = 'rgba(255,250,210,0.14)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y, 95, 95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,250,210,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(player.x, player.y, 95, 95, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,250,210,0.07)';
  ctx.beginPath();
  ctx.moveTo(heli.x - 14, heli.y - 6);
  ctx.lineTo(heli.x + 14, heli.y + 6);
  ctx.lineTo(player.x + 70, player.y + 70);
  ctx.lineTo(player.x - 70, player.y - 70);
  ctx.closePath();
  ctx.fill();
  // Shadow, then the body facing the player, rotor spinning.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(heli.x + 34, heli.y + 44, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(heli.x, heli.y);
  ctx.rotate(Math.atan2(player.y - heli.y, player.x - heli.x));
  ctx.fillStyle = '#20303c';
  ctx.fillRect(-26, -3, 18, 6);
  ctx.fillStyle = '#f5f5f0';
  ctx.beginPath();
  ctx.roundRect(-12, -10, 30, 20, 8);
  ctx.fill();
  ctx.fillStyle = '#1d3a8a';
  ctx.fillRect(6, -10, 10, 20);
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  ctx.fillRect(12, -7, 6, 14);
  ctx.strokeStyle = 'rgba(20,20,20,0.8)';
  ctx.lineWidth = 3;
  const r = heli.rotor;
  ctx.beginPath();
  ctx.moveTo(Math.cos(r) * -34, Math.sin(r) * -34);
  ctx.lineTo(Math.cos(r) * 34, Math.sin(r) * 34);
  ctx.moveTo(Math.cos(r + Math.PI / 2) * -34, Math.sin(r + Math.PI / 2) * -34);
  ctx.lineTo(Math.cos(r + Math.PI / 2) * 34, Math.sin(r + Math.PI / 2) * 34);
  ctx.stroke();
  ctx.restore();
}

function drawRoadblock(ctx, world) {
  const block = world.roadblock;
  if (!block) return;
  for (const side of [-26, 26]) {
    const x = block.horizontal ? block.x : block.x + side;
    const y = block.horizontal ? block.y + side : block.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(block.horizontal ? 0 : Math.PI / 2);
    ctx.fillStyle = '#f7c948';
    ctx.fillRect(-30, -8, 60, 16);
    ctx.fillStyle = '#111111';
    for (let s = -30; s < 30; s += 12) ctx.fillRect(s, -8, 6, 16);
    ctx.restore();
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(x + (block.horizontal ? 40 : 0), y + (block.horizontal ? 0 : 40), 6, 0, Math.PI * 2);
    ctx.fill();
  }
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

  function drawCrosswalks(left, top, right, bottom) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const sx of STREETS_X_ARR) {
      if (sx < left || sx > right) continue;
      for (const sy of STREETS_Y_ARR) {
        if (sy < top || sy > bottom) continue;
        for (let s = -2; s <= 2; s += 1) {
          ctx.fillRect(sx - 40 + s * 17, sy - ROAD_W / 2 + 8, 9, 14);
          ctx.fillRect(sx - 40 + s * 17, sy + ROAD_W / 2 - 22, 9, 14);
          ctx.fillRect(sx - ROAD_W / 2 + 8, sy - 40 + s * 17, 14, 9);
          ctx.fillRect(sx + ROAD_W / 2 - 22, sy - 40 + s * 17, 14, 9);
        }
      }
    }
  }

  function drawGround(world, left, top, right, bottom) {
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(left, top, right - left, bottom - top);
    // Ocean west, with boats; sand on the east and south edges.
    ctx.fillStyle = PALETTE.ocean;
    ctx.fillRect(left, top, Math.min(right, 192) - left, bottom - top);
    ctx.fillStyle = PALETTE.oceanDeep;
    for (let y = Math.floor(top / 90) * 90; y < bottom; y += 90) {
      ctx.fillRect(20, y, 120, 3);
    }
    for (const boat of world.city.boats) {
      if (boat.x < left || boat.x > right || boat.y < top || boat.y > bottom) continue;
      ctx.save();
      ctx.translate(boat.x, boat.y);
      ctx.rotate(boat.angle);
      ctx.fillStyle = '#f5f5f0';
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-6, -5, 12, 10);
      ctx.restore();
    }
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(Math.max(left, WORLD.width - 192), top, right - Math.max(left, WORLD.width - 192), bottom - top);
    ctx.fillRect(left, Math.max(top, WORLD.height - 192), right - left, bottom - Math.max(top, WORLD.height - 192));

    // Blocks: sidewalk frame, then district ground; parks green, lots grey.
    const i0 = Math.max(0, Math.floor((left - STREET0 - ROAD_W / 2) / STREET));
    const i1 = Math.min(BLOCK_COLS - 1, Math.floor((right - STREET0 - ROAD_W / 2) / STREET));
    const j0 = Math.max(0, Math.floor((top - STREET0 - ROAD_W / 2) / STREET));
    const j1 = Math.min(BLOCK_ROWS - 1, Math.floor((bottom - STREET0 - ROAD_W / 2) / STREET));
    for (let j = j0; j <= j1; j += 1) {
      for (let i = i0; i <= i1; i += 1) {
        const block = world.city.blocks[j * BLOCK_COLS + i];
        ctx.fillStyle = PALETTE.sidewalk;
        ctx.fillRect(block.x - 14, block.y - 14, block.w + 28, block.h + 28);
        ctx.fillStyle = block.kind === 'park' ? PALETTE.park : block.kind === 'lot' ? PALETTE.concrete : DISTRICTS[block.district].ground;
        ctx.fillRect(block.x, block.y, block.w, block.h);
        if (block.kind === 'lot') {
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 2;
          for (let s = 0; s < 3; s += 1) {
            ctx.strokeRect(block.x + 36 + s * 120, block.y + 100, 84, 120);
          }
        }
      }
    }

    // Roads: asphalt bands with a dashed centre line, then crosswalks.
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
    drawCrosswalks(left, top, right, bottom);
  }

  function drawProp(p, left, top, right, bottom) {
    if (p.x < left || p.x > right || p.y < top || p.y > bottom) return;
    if (p.kind === 'palm') {
      ctx.strokeStyle = '#7a5a3a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 10);
      ctx.lineTo(p.x + 4, p.y - 12);
      ctx.stroke();
      ctx.strokeStyle = '#3f8a3f';
      ctx.lineWidth = 3;
      for (let f = 0; f < 5; f += 1) {
        const a = (f / 5) * Math.PI * 2 + p.seed;
        ctx.beginPath();
        ctx.moveTo(p.x + 4, p.y - 12);
        ctx.lineTo(p.x + 4 + Math.cos(a) * 16, p.y - 12 + Math.sin(a) * 10 + 6);
        ctx.stroke();
      }
    } else if (p.kind === 'umbrella') {
      ctx.strokeStyle = '#8a8a8a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 8);
      ctx.lineTo(p.x, p.y - 6);
      ctx.stroke();
      ctx.fillStyle = p.seed > 0.5 ? '#e74c3c' : '#f1c40f';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 6, 13, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 6, 13, Math.PI * 1.25, Math.PI * 1.75);
      ctx.fill();
    } else if (p.kind === 'pool' || p.kind === 'pond') {
      ctx.fillStyle = p.kind === 'pool' ? '#4fc3e8' : '#3a8ab8';
      ctx.beginPath();
      if (p.kind === 'pool') ctx.roundRect(p.x - 50, p.y - 30, 100, 60, 8);
      else ctx.ellipse(p.x, p.y, 60, 44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(p.x - 40, p.y - 20, 30, 6);
    } else if (p.kind === 'planter') {
      ctx.fillStyle = '#6a5a4a';
      ctx.fillRect(p.x - 14, p.y - 10, 28, 20);
      ctx.fillStyle = '#4a9e4a';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 8, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'hydrant') {
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(p.x - 4, p.y - 8, 8, 14);
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 8, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'crates') {
      ctx.fillStyle = '#9a7a52';
      ctx.fillRect(p.x - 14, p.y - 10, 16, 16);
      ctx.fillRect(p.x + 2, p.y - 6, 14, 14);
      ctx.fillStyle = '#7a5a3a';
      ctx.fillRect(p.x - 6, p.y - 22, 14, 14);
    } else if (p.kind === 'stall') {
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(p.x - 20, p.y - 14, 40, 10);
      ctx.fillStyle = '#ffffff';
      for (let s = -20; s < 20; s += 10) ctx.fillRect(p.x + s, p.y - 14, 5, 10);
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(p.x - 18, p.y - 4, 36, 14);
    } else if (p.kind === 'neon') {
      ctx.fillStyle = '#ff2d95';
      ctx.fillRect(p.x - 6, p.y - 30, 12, 44);
      ctx.fillStyle = '#ffd94d';
      ctx.fillRect(p.x - 3, p.y - 26, 6, 36);
    } else if (p.kind === 'propCar') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.seed * Math.PI);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.roundRect(-20, -10, 40, 20, 5);
      ctx.fill();
      ctx.fillStyle = 'rgba(20,30,40,0.85)';
      ctx.fillRect(-3, -8, 7, 16);
      ctx.restore();
    }
  }

  function drawBuildings(world, left, top, right, bottom, light) {
    const i0 = Math.max(0, Math.floor((left - STREET0 - ROAD_W / 2) / STREET));
    const i1 = Math.min(BLOCK_COLS - 1, Math.floor((right - STREET0 - ROAD_W / 2) / STREET));
    const j0 = Math.max(0, Math.floor((top - STREET0 - ROAD_W / 2) / STREET));
    const j1 = Math.min(BLOCK_ROWS - 1, Math.floor((bottom - STREET0 - ROAD_W / 2) / STREET));
    const litFrac = light.dark > 0.3 ? 0.55 : light.warm > 0.5 ? 0.3 : 0.08;
    for (let j = j0; j <= j1; j += 1) {
      for (let i = i0; i <= i1; i += 1) {
        const block = world.city.blocks[j * BLOCK_COLS + i];
        for (const b of block.buildings) {
          if (b.x > right || b.x + b.w < left || b.y > bottom || b.y + b.h < top) continue;
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(b.x + 5 * b.hgt, b.y + 6 * b.hgt, b.w, b.h);
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.fillStyle = b.roof;
          ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
          // Windows: a grid, some lit warm when it is dark.
          if (b.w >= 70 && b.h >= 60) {
            for (let wy = b.y + 16; wy < b.y + b.h - 14; wy += 22) {
              for (let wx = b.x + 14; wx < b.x + b.w - 12; wx += 20) {
                ctx.fillStyle = hash2(wx, wy) < litFrac ? '#ffd97a' : 'rgba(30,40,55,0.55)';
                ctx.fillRect(wx, wy, 9, 11);
              }
            }
          }
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x, b.y, b.w, b.h);
          // Business sign: a band with the name, neon pink on the Strip. Long names
          // shrink to fit the band instead of spilling past it.
          if (b.label) {
            const neon = block.district === 'strip';
            ctx.fillStyle = neon ? '#2a0a24' : 'rgba(20,20,26,0.9)';
            ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, 20);
            let fs = 12;
            ctx.font = `bold ${fs}px ` + FONT;
            const tw = ctx.measureText(b.label).width;
            if (tw > b.w - 20) {
              fs = Math.max(8, Math.floor(12 * (b.w - 20) / tw));
              ctx.font = `bold ${fs}px ` + FONT;
            }
            ctx.fillStyle = neon ? '#ff5ab0' : '#ffd94d';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.label, b.x + b.w / 2, b.y + 19);
          }
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
        for (const p of block.props) drawProp(p, left, top, right, bottom);
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
    ctx.fillStyle = 'rgba(255,217,77,0.12)';
    ctx.fillRect(objective.x - 8, objective.y - 300, 16, 600);
  }

  /** Paint one frame: the city, the cars and people, the helicopter, then the HUD. */
  function draw(world, screen, best, ui) {
    const player = world.player;
    const halfW = FIELD.width / 2 / ZOOM;
    const halfH = FIELD.height / 2 / ZOOM;
    const lookX = player.onFoot ? 0 : Math.cos(player.angle) * Math.abs(player.speed) * 0.18;
    const lookY = player.onFoot ? 0 : Math.sin(player.angle) * Math.abs(player.speed) * 0.18;
    const tx = Math.min(WORLD.width - halfW, Math.max(halfW, player.x + lookX));
    const ty = Math.min(WORLD.height - halfH, Math.max(halfH, player.y + lookY));
    world.camera.x += (tx - world.camera.x) * 0.12;
    world.camera.y += (ty - world.camera.y) * 0.12;
    const shakeX = world.shake > 0 ? (world.rng() - 0.5) * world.shake : 0;
    const shakeY = world.shake > 0 ? (world.rng() - 0.5) * world.shake : 0;
    if (world.shake > 0) world.shake = Math.max(0, world.shake - 0.6);
    const camX = world.camera.x + shakeX;
    const camY = world.camera.y + shakeY;
    const light = lightFor(world.clock);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11141b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.save();
    ctx.translate(FIELD.width / 2, FIELD.height / 2);
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(-camX, -camY);
    const left = camX - halfW - 40;
    const top = camY - halfH - 40;
    const right = camX + halfW + 40;
    const bottom = camY + halfH + 40;

    drawGround(world, left, top, right, bottom);
    drawBuildings(world, left, top, right, bottom, light);
    if (light.dark > 0) {
      ctx.fillStyle = `rgba(10,15,40,${0.30 * light.dark})`;
      ctx.fillRect(left, top, right - left, bottom - top);
    }
    drawObjectiveMarker(ctx, world);
    drawRoadblock(ctx, world);

    for (const car of world.cars) {
      if (car.dead) continue;
      if (car.x < left || car.x > right || car.y < top || car.y > bottom) continue;
      drawCar(ctx, car, world.time, light.dark);
    }
    for (const ped of world.peds) {
      if (ped.x < left || ped.x > right || ped.y < top || ped.y > bottom) continue;
      drawPed(ctx, ped);
    }
    for (const cop of world.cops) {
      if (cop.x < left || cop.x > right || cop.y < top || cop.y > bottom) continue;
      drawCop(ctx, cop);
    }
    if (player.onFoot) drawPlayer(ctx, world);

    ctx.fillStyle = '#ffd94d';
    for (const bullet of world.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const particle of world.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.max);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawHeli(ctx, world);

    if (light.warm > 0) {
      ctx.fillStyle = `rgba(255,120,40,${0.10 * light.warm})`;
      ctx.fillRect(left, top, right - left, bottom - top);
    }
    const vignette = ctx.createRadialGradient(camX, camY, halfH * 0.84, camX, camY, halfH * 1.5);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vignette;
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.restore();

    drawHUD(ctx, world, screen, best, ui);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}

const STREETS_X_ARR = [240, 720, 1200, 1680, 2160, 2640, 3120, 3600];
const STREETS_Y_ARR = [240, 720, 1200, 1680, 2160, 2640];
