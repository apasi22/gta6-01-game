// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between eight screens: title (with save slots), play, paused,
// garage, how-to, mission passed, busted and wasted. Menus read takeMenu(), play reads
// takeActions() — never both in one frame, so a keypress lands on exactly one screen.
//
// ?seed=N fixes the city. ?shot=cover|foot|mission|chase (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { RADIO, STEP, TRACKS, UPGRADES } from './config.js';
import { createWorld, showBanner } from './world.js';
import { ACTION_GARAGE, ACTION_MUTE, ACTION_PAUSE, ACTION_RADIO, createInput } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_GARAGE, SCREEN_HOWTO, SCREEN_PASSED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED } from './render.js';
import { createAudio } from './audio.js';
import { clearSave, listSaves, loadBest, loadSave, saveBest, saveSave } from './save.js';
import { stepPlayer } from './player.js';
import { stepTraffic } from './traffic.js';
import { clearRoadblock, stepPolice } from './police.js';
import { advanceAfterPassed, startMission, stepMissions } from './missions.js';
import { stepCombat } from './combat.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
/** How long the MISSION PASSED screen stays up before it dismisses itself. */
const PASSED_MS = 5000;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
let world = createWorld(seed);
const renderer = createRenderer(canvas);

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best, scene.ui);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = loadBest();
  let accumulator = 0;
  let last = performance.now();
  let currentSlot = 1;
  let garageFrom = SCREEN_PLAY;
  let howtoFrom = SCREEN_TITLE;
  let passedAt = 0;
  let trackTimer = 0;
  const ui = { menuIndex: 0, slotSelect: false, slot: 1, garageIndex: 0, howtoFrom: SCREEN_TITLE, saves: listSaves() };

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function writeSave() {
    saveSave(currentSlot, {
      cash: Math.floor(world.player.cash),
      mission: world.mission ? world.mission.index : 0,
      x: world.player.x,
      y: world.player.y,
      missionsDone: world.stats.missionsDone,
      upgrades: { ...world.upgrades },
      armor: world.player.armor,
      weapon: world.player.weapon,
    });
    ui.saves = listSaves();
  }

  function startGame(fromSave, slot) {
    currentSlot = slot ?? 1;
    world = createWorld(seed);
    const save = fromSave ? loadSave(currentSlot) : null;
    if (save) {
      world.player.cash = save.cash;
      world.player.x = save.x;
      world.player.y = save.y;
      world.stats.missionsDone = save.missionsDone || 0;
      world.upgrades = { ...world.upgrades, ...(save.upgrades ?? {}) };
      world.player.armor = save.armor ?? 0;
      world.player.weapon = save.weapon ?? 'PISTOL';
      startMission(world, save.mission ?? 0);
    } else {
      startMission(world, 0);
    }
    world.camera.x = world.player.x;
    world.camera.y = world.player.y;
    input.discard();
    accumulator = 0;
    trackTimer = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Sugeng Wibowo is on the streets of Wilwatikta.');
  }

  function endBusted() {
    screen = SCREEN_BUSTED;
    const lost = Math.floor(world.player.cash * 0.2);
    world.player.cash -= lost;
    world.player.health = 100;
    world.wanted = 0;
    world.siren = false;
    world.over = null;
    world.cops = [];
    clearRoadblock(world);
    announce(`Busted. WPD took $${lost}.`);
  }

  function endWasted() {
    screen = SCREEN_WASTED;
    world.player.cash = Math.floor(world.player.cash * 0.9);
    if (world.player.cash > best) {
      best = world.player.cash;
      saveBest(best);
    }
    announce('Wasted. Sugeng is down.');
  }

  function buyGarage(index) {
    const player = world.player;
    if (index === 0) {
      const level = world.upgrades.engine;
      if (level >= 3) showBanner(world, 'Engine already maxed out.', 2);
      else if (player.cash < UPGRADES.engine.costs[level]) showBanner(world, 'Not enough cash for that engine.', 2);
      else {
        player.cash -= UPGRADES.engine.costs[level];
        world.upgrades.engine += 1;
        showBanner(world, `Engine upgraded to LVL ${world.upgrades.engine}!`, 3);
        audio.chime();
      }
    } else if (index === 1) {
      const level = world.upgrades.armor;
      if (level >= 3) showBanner(world, 'Armor already maxed out.', 2);
      else if (player.cash < UPGRADES.armor.costs[level]) showBanner(world, 'Not enough cash for that armor.', 2);
      else {
        player.cash -= UPGRADES.armor.costs[level];
        world.upgrades.armor += 1;
        showBanner(world, `Armor upgraded to LVL ${world.upgrades.armor}!`, 3);
        audio.chime();
      }
    } else if (index === 2) {
      if (!player.car) showBanner(world, 'No car — steal one first.', 2);
      else if (player.car.health >= player.car.maxHealth) showBanner(world, 'This car is already in perfect shape.', 2);
      else if (player.cash < UPGRADES.repairCost) showBanner(world, 'Not enough cash for repairs.', 2);
      else {
        player.cash -= UPGRADES.repairCost;
        player.car.health = player.car.maxHealth;
        showBanner(world, 'Car repaired — good as new.', 3);
        audio.chime();
      }
    } else if (index === 3) {
      const level = world.upgrades.armor;
      const maxArmor = 50 + (level > 0 ? UPGRADES.armor.health[level - 1] : 0);
      if (player.armor >= maxArmor) showBanner(world, 'Armor is already full.', 2);
      else if (player.cash < UPGRADES.armorRefillCost) showBanner(world, 'Not enough cash for armor.', 2);
      else {
        player.cash -= UPGRADES.armorRefillCost;
        player.armor = maxArmor;
        showBanner(world, 'Armor refilled.', 3);
        audio.chime();
      }
    }
  }

  function handleTitle(menu) {
    if (menu.mute) {
      world.muted = !world.muted;
      announce(world.muted ? 'Muted.' : 'Sound on.');
    }
    if (ui.slotSelect) {
      if (menu.up) ui.menuIndex = (ui.menuIndex + 2) % 3;
      if (menu.down) ui.menuIndex = (ui.menuIndex + 1) % 3;
      const pick = menu.digit ?? (menu.confirm ? ui.menuIndex + 1 : 0);
      if (pick >= 1 && pick <= 3) {
        const save = loadSave(pick);
        if (save) startGame(true, pick);
        else showBanner(world, `Slot ${pick} is empty — start a new game instead.`, 2);
      }
      if (menu.back) {
        ui.slotSelect = false;
        ui.menuIndex = 0;
      }
      return;
    }
    if (menu.up) ui.menuIndex = (ui.menuIndex + 2) % 3;
    if (menu.down) ui.menuIndex = (ui.menuIndex + 1) % 3;
    if (!menu.confirm) return;
    if (ui.menuIndex === 0) {
      ui.saves = listSaves();
      ui.slotSelect = true;
      ui.menuIndex = 0;
    } else if (ui.menuIndex === 1) {
      const saves = listSaves();
      const empty = saves.findIndex((s) => !s);
      startGame(false, empty >= 0 ? empty + 1 : 1);
    } else {
      howtoFrom = SCREEN_TITLE;
      ui.howtoFrom = SCREEN_TITLE;
      screen = SCREEN_HOWTO;
    }
  }

  function handlePaused(menu) {
    if (menu.up) ui.menuIndex = (ui.menuIndex + 3) % 4;
    if (menu.down) ui.menuIndex = (ui.menuIndex + 1) % 4;
    if (menu.back) {
      screen = SCREEN_PLAY;
      announce('Playing.');
      return;
    }
    if (!menu.confirm) return;
    if (ui.menuIndex === 0) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (ui.menuIndex === 1) {
      garageFrom = SCREEN_PAUSED;
      ui.garageIndex = 0;
      screen = SCREEN_GARAGE;
    } else if (ui.menuIndex === 2) {
      howtoFrom = SCREEN_PAUSED;
      ui.howtoFrom = SCREEN_PAUSED;
      screen = SCREEN_HOWTO;
    } else {
      writeSave();
      ui.slotSelect = false;
      ui.menuIndex = 0;
      screen = SCREEN_TITLE;
      announce('Wilwatikta. Press Enter to play.');
    }
  }

  function handleGarage(menu) {
    if (menu.up) ui.garageIndex = (ui.garageIndex + 4) % 5;
    if (menu.down) ui.garageIndex = (ui.garageIndex + 1) % 5;
    if (menu.back || (menu.confirm && ui.garageIndex === 4)) {
      screen = garageFrom;
      return;
    }
    if (menu.confirm) buyGarage(ui.garageIndex);
  }

  function handleMenus() {
    const menu = input.takeMenu();
    if (screen === SCREEN_TITLE) handleTitle(menu);
    else if (screen === SCREEN_PAUSED) handlePaused(menu);
    else if (screen === SCREEN_GARAGE) handleGarage(menu);
    else if (screen === SCREEN_HOWTO) {
      if (menu.confirm || menu.back) screen = howtoFrom;
    } else if (screen === SCREEN_PASSED) {
      if (menu.confirm || performance.now() - passedAt > PASSED_MS) {
        advanceAfterPassed(world);
        screen = SCREEN_PLAY;
      }
    } else if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED) {
      if (menu.confirm) {
        if (screen === SCREEN_BUSTED) {
          // Walk free: respawn at the WPD station, heat off, story intact.
          world.player.x = 1200;
          world.player.y = 780;
          world.player.onFoot = true;
          world.player.car = null;
          world.camera.x = 1200;
          world.camera.y = 720;
          screen = SCREEN_PLAY;
          announce('Free. Sugeng is back on the street.');
        } else {
          clearSave(currentSlot);
          startGame(false, currentSlot);
        }
      }
    }
  }

  function handlePlayActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      world.muted = !world.muted;
      announce(world.muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RADIO) {
      world.station = (world.station + 1) % RADIO.length;
      world.track = (world.track + 1) % TRACKS.length;
      const station = RADIO[world.station];
      showBanner(world, `${station.name} ${station.freq} — ${station.genre}`, 3);
    }
    if (actions & ACTION_GARAGE) {
      garageFrom = SCREEN_PLAY;
      ui.garageIndex = 0;
      screen = SCREEN_GARAGE;
    }
    if (actions & ACTION_PAUSE) {
      ui.menuIndex = 0;
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  }

  function step() {
    world.time += STEP;
    world.clock += STEP * 30;
    if (world.clock >= 24 * 3600) {
      world.clock -= 24 * 3600;
      world.day += 1;
    }
    trackTimer += STEP;
    if (trackTimer > 90) {
      trackTimer = 0;
      world.track = (world.track + 1) % TRACKS.length;
    }
    const ctl = input.read(world);
    stepPlayer(world, STEP, ctl);
    stepTraffic(world, STEP);
    stepPolice(world, STEP);
    stepMissions(world, STEP);
    stepCombat(world, STEP, ctl);
    audio.step(world, STEP);
    if (world.saveDirty) {
      world.saveDirty = false;
      writeSave();
      audio.chime();
    }
    if (world.passed && screen === SCREEN_PLAY) {
      screen = SCREEN_PASSED;
      passedAt = performance.now();
      audio.chime();
    }
    if (world.over === 'busted') endBusted();
    else if (world.over === 'wasted') endWasted();
    if (world.player.cash > best) {
      best = Math.floor(world.player.cash);
      saveBest(best);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (screen === SCREEN_PLAY) {
      handlePlayActions();
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      handleMenus();
      accumulator = 0;
    }
    renderer.draw(world, screen, best, ui);
  }

  // Leaving the tab pauses a running game rather than letting the cops close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      ui.menuIndex = 0;
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Wilwatikta. Choose Continue, New Game, or How to Play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
