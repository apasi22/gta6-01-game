// The HUD and every screen: the always-on frame (cash, stars, weapon, health,
// armour, REP, district banner, mission banner, circular minimap, speedometer,
// radio widget, dispatch line, dialogue, controls), the title menu with save
// slots, the pause menu, Eddie's garage, the How to Play panel, the MISSION PASSED
// screen, and the BUSTED / WASTED overlays. Screens are named constants; main.js
// owns the state machine, this file owns the paint.
import { DISTRICTS, FIELD, FONT, PALETTE, RADIO, TRACKS, UPGRADES, WORLD } from './config.js';
import { districtAt } from './world.js';
import { currentObjective } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_GARAGE = 'garage';
export const SCREEN_HOWTO = 'howto';
export const SCREEN_PASSED = 'passed';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';

const REP_TITLES = ['NOBODY', 'NOBODY', 'NOBODY', 'HUSTLER', 'HUSTLER', 'HUSTLER', 'WHEELMAN', 'WHEELMAN', 'WHEELMAN', 'LEGEND', 'LEGEND', 'LEGEND', 'QUEEN OF COSTA ALBA'];

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(12,14,22,${alpha ?? 0.72})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
}

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function formatClock(clock) {
  const total = Math.floor(clock / 60) % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function drawStars(ctx, x, y, wanted) {
  ctx.font = '20px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < wanted ? '#ffd94d' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', x + i * 22, y);
  }
}

function drawRightPanel(ctx, world) {
  const player = world.player;
  panel(ctx, 1026, 12, 242, 158, 0.72);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 24px ' + FONT;
  ctx.fillText(`$${player.cash.toLocaleString('en-US')}`, 1040, 42);
  drawStars(ctx, 1040, 62, world.wanted);
  ctx.fillStyle = world.wanted >= 4 ? '#ff6b6b' : '#ffd94d';
  ctx.font = 'bold 12px ' + FONT;
  const label = world.wanted >= 4 ? 'MOST WANTED' : world.wanted > 0 ? 'WANTED' : 'CLEAN';
  ctx.fillText(label, 1152, 67);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px ' + FONT;
  ctx.fillText(`${player.weapon}  ${player.ammo}`, 1040, 92);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '11px ' + FONT;
  ctx.fillText('HP', 1040, 112);
  bar(ctx, 1062, 102, 192, 9, player.health / 100, player.health > 30 ? '#7ee787' : '#ff6b6b');
  ctx.fillText('ARMOR', 1040, 130);
  const armorLevel = world.upgrades?.armor ?? 0;
  const maxArmor = 50 + (armorLevel > 0 ? UPGRADES.armor.health[armorLevel - 1] : 0);
  bar(ctx, 1062, 120, 192, 9, (player.armor ?? 0) / maxArmor, '#5ab0ff');
  const rep = Math.min(world.stats.missionsDone, 12);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 12px ' + FONT;
  ctx.fillText(`REP LVL ${rep + 1} · ${REP_TITLES[rep]}`, 1040, 152);
}

function drawDistrictBanner(ctx, world) {
  const district = DISTRICTS[districtAt(world.player.x, world.player.y)];
  panel(ctx, 12, 12, 300, 58, 0.72);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px ' + FONT;
  ctx.fillText(district.name, 24, 36);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '11px ' + FONT;
  ctx.fillText(district.tag, 24, 54);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 12px ' + FONT;
  ctx.textAlign = 'right';
  ctx.fillText(`${formatClock(world.clock)} · DAY ${world.day}`, 300, 36);
  ctx.textAlign = 'left';
}

function drawMissionBanner(ctx, world) {
  const objective = currentObjective(world);
  panel(ctx, 350, 12, 580, 58, 0.72);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (!objective) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText('FREE ROAM — Costa Alba is yours', 366, 38);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '12px ' + FONT;
    ctx.fillText('Drive, explore, and stay out of trouble.', 366, 58);
    return;
  }
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 15px ' + FONT;
  ctx.fillText(`MISSION ${objective.index + 1}/${objective.total} — ${objective.name.replace(/^\d+ · /, '')}`, 366, 34);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px ' + FONT;
  ctx.fillText(objective.text, 366, 56);
  const dist = Math.round(Math.hypot(world.player.x - objective.x, world.player.y - objective.y) / 10);
  ctx.textAlign = 'right';
  if (objective.timer > 0) {
    ctx.fillStyle = objective.timer < 15 ? '#ff6b6b' : '#ffffff';
    ctx.font = 'bold 18px ' + FONT;
    ctx.fillText(`${Math.ceil(objective.timer)}s`, 914, 36);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12px ' + FONT;
  ctx.fillText(`${dist} m`, 914, 56);
  ctx.textAlign = 'left';
}

function drawMinimap(ctx, world) {
  const cx = 112;
  const cy = 600;
  const r = 84;
  const scale = (r * 2) / WORLD.width;
  const mx = (x) => cx + (x - WORLD.width / 2) * scale;
  const my = (y) => cy + (y - WORLD.height / 2) * scale;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = PALETTE.ocean;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  for (const block of world.city.blocks) {
    ctx.fillStyle = DISTRICTS[block.district].ground;
    ctx.fillRect(mx(block.x), my(block.y), block.w * scale, block.h * scale);
  }
  ctx.strokeStyle = 'rgba(20,20,26,0.6)';
  ctx.lineWidth = 2;
  for (const sx of world.city.streetsX) {
    ctx.beginPath();
    ctx.moveTo(mx(sx), cy - r);
    ctx.lineTo(mx(sx), cy + r);
    ctx.stroke();
  }
  for (const sy of world.city.streetsY) {
    ctx.beginPath();
    ctx.moveTo(cx - r, my(sy));
    ctx.lineTo(cx + r, my(sy));
    ctx.stroke();
  }
  // Route: an L-shaped line from the player to the objective.
  const objective = currentObjective(world);
  const player = world.player;
  if (objective) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(mx(player.x), my(player.y));
    ctx.lineTo(mx(objective.x), my(player.y));
    ctx.lineTo(mx(objective.x), my(objective.y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.moveTo(mx(objective.x), my(objective.y) - 6);
    ctx.lineTo(mx(objective.x) + 6, my(objective.y));
    ctx.lineTo(mx(objective.x), my(objective.y) + 6);
    ctx.lineTo(mx(objective.x) - 6, my(objective.y));
    ctx.closePath();
    ctx.fill();
  }
  for (const car of world.cars) {
    if (car.kind !== 'police' || car.dead) continue;
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(mx(car.x), my(car.y), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of world.cops) {
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(mx(cop.x), my(cop.y), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (world.heli.active) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx(world.heli.x), my(world.heli.y), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(mx(player.x), my(player.y));
  ctx.rotate(player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, 5);
  ctx.lineTo(-5, -5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - r - 12);
  ctx.font = '11px ' + FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(DISTRICTS[districtAt(player.x, player.y)].name, cx, cy + r + 13);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawSpeedometer(ctx, world) {
  const player = world.player;
  if (player.onFoot || !player.car) return;
  const cx = 1150;
  const cy = 616;
  const speed = Math.abs(player.speed);
  const frac = Math.min(1, speed / 560);
  panel(ctx, cx - 92, cy - 66, 184, 108, 0.6);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, 44, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();
  ctx.strokeStyle = '#ffd94d';
  ctx.beginPath();
  ctx.arc(cx, cy, 44, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * frac));
  ctx.stroke();
  const needle = Math.PI * (0.75 + 1.5 * frac);
  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(needle) * 36, cy + Math.sin(needle) * 36);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(speed * 0.18)}`, cx, cy + 20);
  ctx.font = '10px ' + FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('KM/H', cx, cy + 34);
  ctx.font = 'bold 12px ' + FONT;
  ctx.fillStyle = '#ffd94d';
  ctx.fillText(player.car.model ?? 'CAR', cx, cy + 52);
  ctx.textAlign = 'left';
}

function drawRadioWidget(ctx, world) {
  const station = RADIO[world.station] ?? RADIO[0];
  const track = TRACKS[world.track] ?? TRACKS[0];
  panel(ctx, 490, 662, 300, 34, 0.72);
  ctx.fillStyle = world.muted ? 'rgba(255,255,255,0.4)' : '#ffd94d';
  ctx.font = 'bold 13px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${station.name} ${station.freq}  ·  ${track}${world.muted ? '  (MUTED)' : ''}`, 504, 680);
  ctx.textBaseline = 'alphabetic';
}

function drawDialogue(ctx, world) {
  if (world.time >= world.dialogueUntil || !world.dialogue) return;
  const lines = wrapText(world.dialogue, 58);
  const h = 34 + lines.length * 18;
  const y = 588 - h;
  panel(ctx, 340, y, 600, h, 0.82);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 13px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText(world.dialogueSpeaker ?? '', 356, y + 22);
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px ' + FONT;
  lines.forEach((line, i) => ctx.fillText(line, 356, y + 42 + i * 18));
}

function drawDispatch(ctx, world) {
  if (world.time >= world.dispatchUntil || !world.dispatch) return;
  ctx.font = 'bold 12px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(12,14,22,0.72)';
  const w = ctx.measureText(world.dispatch).width + 28;
  ctx.beginPath();
  ctx.roundRect(640 - w / 2, 632, w, 24, 6);
  ctx.fill();
  ctx.fillStyle = '#8ecbff';
  ctx.fillText(world.dispatch, 640, 649);
  ctx.textAlign = 'left';
}

function drawBanner(ctx, world) {
  if (world.time >= world.bannerUntil || !world.banner) return;
  ctx.font = 'bold 26px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText(world.banner, 642, 108);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(world.banner, 640, 106);
  ctx.textAlign = 'left';
}

function drawControlsFooter(ctx) {
  ctx.font = '11px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('WASD drive / walk · E enter or exit car · SPACE shoot · F punch · R radio · G garage · P pause · M mute', 640, 710);
  ctx.textAlign = 'left';
}

function drawPlayFrame(ctx, world) {
  drawRightPanel(ctx, world);
  drawDistrictBanner(ctx, world);
  drawMissionBanner(ctx, world);
  drawMinimap(ctx, world);
  drawSpeedometer(ctx, world);
  drawRadioWidget(ctx, world);
  drawDispatch(ctx, world);
  drawDialogue(ctx, world);
  drawBanner(ctx, world);
  drawControlsFooter(ctx);
  if (world.player.health < 30 && !world.over) {
    const pulse = 0.25 + Math.sin(world.time * 6) * 0.12;
    ctx.strokeStyle = `rgba(255,40,40,${pulse})`;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, FIELD.width - 14, FIELD.height - 14);
  }
}

function drawMenuItems(ctx, items, selected, cx, y0, gap) {
  ctx.textAlign = 'center';
  items.forEach((item, i) => {
    const y = y0 + i * gap;
    const active = i === selected;
    ctx.font = (active ? 'bold ' : '') + '26px ' + FONT;
    ctx.fillStyle = active ? '#ffd94d' : 'rgba(255,255,255,0.85)';
    ctx.fillText((active ? '► ' : '') + item, cx, y);
  });
  ctx.textAlign = 'left';
}

function drawTitle(ctx, world, best, ui) {
  ctx.fillStyle = 'rgba(8,10,22,0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.save();
  ctx.shadowColor = '#ff2d95';
  ctx.shadowBlur = 28;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 86px ' + FONT;
  ctx.fillText('COSTA ALBA', 640, 178);
  ctx.restore();
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText('A  M A K E  G T A  6  S T O R Y', 640, 212);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '16px ' + FONT;
  ctx.fillText('Lena Rook. Twelve jobs. One city to take.', 640, 244);
  if (ui.slotSelect) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px ' + FONT;
    ctx.fillText('CHOOSE A SAVE SLOT', 640, 330);
    (ui.saves ?? []).forEach((save, i) => {
      const y = 372 + i * 44;
      const active = i === ui.menuIndex;
      ctx.font = (active ? 'bold ' : '') + '20px ' + FONT;
      ctx.fillStyle = active ? '#ffd94d' : 'rgba(255,255,255,0.85)';
      const label = save ? `SLOT ${i + 1} — $${save.cash.toLocaleString('en-US')} · Mission ${(save.mission ?? 0) + 1}` : `SLOT ${i + 1} — EMPTY`;
      ctx.fillText((active ? '► ' : '') + label, 640, y);
    });
    ctx.font = '13px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Press 1-3 or ENTER to load · ESC back', 640, 530);
  } else {
    drawMenuItems(ctx, ['CONTINUE', 'NEW GAME', 'HOW TO PLAY'], ui.menuIndex, 640, 340, 52);
    ctx.font = '14px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`BEST CASH  $${(best ?? 0).toLocaleString('en-US')}`, 640, 530);
  }
  ctx.font = '12px ' + FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('WASD / arrows to choose · ENTER to confirm · M mute', 640, 690);
  ctx.textAlign = 'left';
}

function drawPaused(ctx, world, ui) {
  ctx.fillStyle = 'rgba(8,10,22,0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px ' + FONT;
  ctx.fillText('PAUSED', 640, 200);
  drawMenuItems(ctx, ['RESUME', 'GARAGE', 'HOW TO PLAY', 'QUIT TO TITLE'], ui.menuIndex, 640, 300, 52);
  ctx.font = '15px ' + FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(`Cash $${world.player.cash.toLocaleString('en-US')} · Missions ${world.stats.missionsDone}/12 · Cars stolen ${world.stats.carsStolen} · Cops dodged ${world.stats.copsDodged}`, 640, 612);
  ctx.textAlign = 'left';
}

function drawGarage(ctx, world, ui) {
  ctx.fillStyle = 'rgba(8,10,22,0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, 360, 110, 560, 440, 0.92);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 34px ' + FONT;
  ctx.fillText("EDDIE'S GARAGE", 640, 162);
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 18px ' + FONT;
  ctx.fillText(`CASH  $${world.player.cash.toLocaleString('en-US')}`, 640, 192);
  const engine = world.upgrades.engine;
  const armor = world.upgrades.armor;
  const options = [
    { label: `ENGINE  LVL ${engine}/3`, detail: engine >= 3 ? 'MAXED OUT' : `+$${UPGRADES.engine.costs[engine]} — faster top speed` },
    { label: `ARMOR  LVL ${armor}/3`, detail: armor >= 3 ? 'MAXED OUT' : `+$${UPGRADES.armor.costs[armor]} — tougher cars, more armor` },
    { label: 'REPAIR CAR', detail: world.player.car ? `$${UPGRADES.repairCost} — fix the car you are driving` : 'No car — steal one first' },
    { label: 'REFILL ARMOR', detail: `$${UPGRADES.armorRefillCost} — top up Lena's armor` },
    { label: 'BACK', detail: '' },
  ];
  options.forEach((opt, i) => {
    const y = 244 + i * 56;
    const active = i === ui.garageIndex;
    ctx.font = (active ? 'bold ' : '') + '22px ' + FONT;
    ctx.fillStyle = active ? '#ffd94d' : '#ffffff';
    ctx.fillText((active ? '► ' : '') + opt.label, 640, y);
    ctx.font = '13px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(opt.detail, 640, y + 22);
  });
  ctx.font = '12px ' + FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('ENTER to buy · ESC back to the game', 640, 528);
  ctx.textAlign = 'left';
}

function drawHowTo(ctx) {
  ctx.fillStyle = 'rgba(8,10,22,0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, 330, 90, 620, 520, 0.92);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 32px ' + FONT;
  ctx.fillText('HOW TO PLAY', 640, 140);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px ' + FONT;
  const lines = [
    'You are Lena Rook, getaway driver, new in Costa Alba.',
    'Eddie Vance has twelve jobs for you. Follow the gold',
    'marker, finish the job, get paid, stay alive.',
    '',
    'WASD / arrows — drive or walk (hold SHIFT to sprint)',
    'E — steal / enter a car, exit a car',
    'SPACE or click — shoot · F — punch · Q — horn',
    'R — change radio station · M — mute',
    'G — garage / upgrades · P / ESC — pause',
    '',
    'Stars mean heat: cops chase, the helicopter watches,',
    'and roadblocks close the roads. Hide until the heat dies.',
    'Save at any time from the pause menu — three slots.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 370, 180 + i * 28));
  ctx.textAlign = 'center';
  ctx.font = '13px ' + FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('Press ESC or ENTER to go back', 640, 584);
  ctx.textAlign = 'left';
}

function drawPassed(ctx, world) {
  const passed = world.passed;
  if (!passed) return;
  ctx.fillStyle = 'rgba(8,10,22,0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, 390, 170, 500, 330, 0.94);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 42px ' + FONT;
  ctx.fillText('MISSION PASSED', 640, 232);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px ' + FONT;
  ctx.fillText(passed.name, 640, 266);
  ctx.font = '16px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText('✓  Objective complete', 440, 312);
  if (passed.bonus > 0) ctx.fillText('✓  Time bonus — escaped with time to spare', 440, 340);
  ctx.fillText('✓  Lena walks away clean', 440, passed.bonus > 0 ? 368 : 340);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText(`REWARD  $${passed.reward.toLocaleString('en-US')}${passed.bonus > 0 ? `  +  $${passed.bonus} BONUS` : ''}`, 640, 424);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px ' + FONT;
  ctx.fillText(`TOTAL  $${passed.total.toLocaleString('en-US')}`, 640, 456);
  ctx.font = '13px ' + FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('Press ENTER to continue', 640, 486);
  ctx.textAlign = 'left';
}

function drawOver(ctx, world, screen, best) {
  ctx.fillStyle = 'rgba(8,10,22,0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  const busted = screen === SCREEN_BUSTED;
  ctx.fillStyle = busted ? '#5ab0ff' : '#ff6b6b';
  ctx.font = 'bold 72px ' + FONT;
  ctx.fillText(busted ? 'BUSTED' : 'WASTED', 640, 260);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px ' + FONT;
  ctx.fillText(busted ? 'CAPD caught Lena. The city keeps its secrets.' : 'Lena went down swinging. Costa Alba moves on.', 640, 302);
  ctx.font = '16px ' + FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(`Missions done ${world.stats.missionsDone}/12 · Cash $${world.player.cash.toLocaleString('en-US')} · Best $${(best ?? 0).toLocaleString('en-US')}`, 640, 348);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText('Press ENTER to start again', 640, 420);
  ctx.textAlign = 'left';
}

/** Paint the HUD and the active screen overlay on top of the world frame. */
export function drawHUD(ctx, world, screen, best, ui) {
  const safeUi = ui ?? { menuIndex: 0, slotSelect: false, garageIndex: 0, saves: [] };
  if (screen === SCREEN_TITLE) {
    drawTitle(ctx, world, best, safeUi);
    return;
  }
  drawPlayFrame(ctx, world);
  if (screen === SCREEN_PAUSED) drawPaused(ctx, world, safeUi);
  else if (screen === SCREEN_GARAGE) drawGarage(ctx, world, safeUi);
  else if (screen === SCREEN_HOWTO) drawHowTo(ctx);
  else if (screen === SCREEN_PASSED) drawPassed(ctx, world);
  else if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED) drawOver(ctx, world, screen, best);
}
