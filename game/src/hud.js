// The HUD and the screens: cash, health and ammo, the wanted stars, the mission
// objective, the in-game clock, a circular minimap, the dialogue banner, and the title,
// pause, busted and wasted overlays. Everything is drawn in the 1280x720 logical field.
import { FIELD, FONT, WORLD } from './config.js';
import { currentObjective } from './missions.js';

const SCREEN_TITLE = 'title';
const SCREEN_PLAY = 'play';
const SCREEN_PAUSED = 'paused';
const SCREEN_BUSTED = 'busted';
const SCREEN_WASTED = 'wasted';

function fmtCash(cash) {
  return `$${Math.floor(cash).toLocaleString('en-US')}`;
}

function fmtClock(seconds) {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor((total % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function drawStars(ctx, wanted, x, y) {
  ctx.font = '28px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i += 1) {
    const filled = i < wanted;
    ctx.fillStyle = filled ? '#ffd94d' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', x + i * 30, y);
  }
}

function drawMinimap(ctx, world) {
  const cx = FIELD.width - 104;
  const cy = FIELD.height - 104;
  const r = 88;
  const scale = (r * 2) / WORLD.width;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(20, 26, 32, 0.85)';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Streets.
  ctx.strokeStyle = 'rgba(220,220,220,0.55)';
  ctx.lineWidth = 2;
  for (const sx of world.city.streetsX) {
    ctx.beginPath();
    ctx.moveTo(cx - r + sx * scale, cy - r);
    ctx.lineTo(cx - r + sx * scale, cy + r);
    ctx.stroke();
  }
  for (const sy of world.city.streetsY) {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r + sy * scale);
    ctx.lineTo(cx + r, cy - r + sy * scale);
    ctx.stroke();
  }
  // Mission marker.
  const objective = currentObjective(world);
  if (objective) {
    const mx = cx - r + objective.x * scale;
    const my = cy - r + objective.y * scale;
    const pulse = 5 + Math.sin(world.time * 5) * 2;
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(mx, my, pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police blips.
  ctx.fillStyle = '#5aa2ff';
  for (const car of world.cars) {
    if (car.kind !== 'police' || car.dead) continue;
    ctx.beginPath();
    ctx.arc(cx - r + car.x * scale, cy - r + car.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // The player, an arrow pointing where they face.
  const px = cx - r + world.player.x * scale;
  const py = cy - r + world.player.y * scale;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(world.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '11px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText('SOLMAR', cx, cy + r + 13);
}

function drawPlayHud(ctx, world) {
  const player = world.player;
  ctx.textBaseline = 'alphabetic';
  // Cash + health + ammo, top left.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(16, 14, 250, 84);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 26px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText(fmtCash(player.cash), 28, 46);
  ctx.fillStyle = '#333333';
  ctx.fillRect(28, 58, 180, 12);
  ctx.fillStyle = player.health > 30 ? '#7dff8a' : '#ff5a4d';
  ctx.fillRect(28, 58, 180 * (player.health / 100), 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px ' + FONT;
  ctx.fillText(`HEALTH ${Math.ceil(player.health)}`, 28, 88);
  ctx.fillText(player.onFoot ? `PISTOL ${player.ammo}/12` : `CAR ${Math.max(0, Math.round(player.car ? player.car.health : 0))}%`, 150, 88);
  // Wanted stars + clock, top right.
  drawStars(ctx, world.wanted, FIELD.width - 170, 34);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px ' + FONT;
  ctx.textAlign = 'right';
  ctx.fillText(fmtClock(world.clock), FIELD.width - 20, 62);
  if (world.wanted > 0) {
    ctx.fillStyle = '#ff5a4d';
    ctx.fillText('WANTED', FIELD.width - 20, 82);
  }
  // Mission objective, top centre.
  const objective = currentObjective(world);
  if (objective) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const label = objective.name + ' — ' + objective.text + (objective.timer ? `  ${Math.ceil(objective.timer)}s` : '');
    const width = ctx.measureText(label).width + 28;
    ctx.fillRect((FIELD.width - width) / 2, 12, width, 30);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText(label, FIELD.width / 2, 32);
  }
  // Banner, centre.
  if (world.banner && world.time < world.bannerUntil) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px ' + FONT;
    const width = Math.min(FIELD.width - 120, ctx.measureText(world.banner).width + 36);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect((FIELD.width - width) / 2, 108, width, 38);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(world.banner, FIELD.width / 2, 134);
  }
  // Controls hint, early on.
  if (world.time < 14) {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '14px ' + FONT;
    ctx.fillText('WASD drive / walk · E enter car · Click shoot · Space handbrake / punch · P pause · M mute', 20, FIELD.height - 16);
  }
  drawMinimap(ctx, world);
}

function drawOverlay(ctx, title, lines, hint) {
  ctx.fillStyle = 'rgba(10, 14, 20, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 64px ' + FONT;
  ctx.fillText(title, FIELD.width / 2, 240);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px ' + FONT;
  let y = 300;
  for (const line of lines) {
    ctx.fillText(line, FIELD.width / 2, y);
    y += 32;
  }
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 18px ' + FONT;
  ctx.fillText(hint, FIELD.width / 2, y + 30);
}

export function drawHUD(ctx, world, screen, best) {
  if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawPlayHud(ctx, world);
  if (screen === SCREEN_TITLE) {
    drawOverlay(ctx, 'SOLMAR', [
      'A getaway driver. A sun-soaked city. Five jobs.',
      'Steal cars, outrun the Solmar PD, finish the story.',
      `Best cash so far: ${fmtCash(best)}${world.save ? ' · saved game ready — press C to continue' : ''}`,
    ], 'Press ENTER to play');
  } else if (screen === SCREEN_PAUSED) {
    drawOverlay(ctx, 'PAUSED', ['Mara is waiting. The city is not.'], 'Press P or ENTER to keep playing');
  } else if (screen === SCREEN_BUSTED) {
    drawOverlay(ctx, 'BUSTED', [
      'The Solmar PD caught Mara Voss.',
      `They took 20% of her cash. The jobs are still waiting.`,
    ], 'Press ENTER to walk free');
  } else if (screen === SCREEN_WASTED) {
    drawOverlay(ctx, 'WASTED', [
      'Mara Voss is down. Solmar keeps moving without her.',
      'She keeps 90% of her cash. The story restarts.',
    ], 'Press ENTER to start over');
  }
}

export { SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_BUSTED, SCREEN_WASTED };
