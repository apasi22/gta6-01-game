// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, busted and wasted.
//
// ?seed=N fixes the city. ?shot=cover|foot|mission|chase (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_CONTINUE, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED } from './render.js';
import { createAudio } from './audio.js';
import { clearSave, loadBest, loadSave, saveBest, saveSave } from './save.js';
import { stepPlayer } from './player.js';
import { stepTraffic } from './traffic.js';
import { stepPolice } from './police.js';
import { stepMissions, startMission } from './missions.js';
import { stepCombat } from './combat.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
let world = createWorld(seed);
world.save = loadSave();
const renderer = createRenderer(canvas);

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best);
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

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function writeSave() {
    saveSave({
      cash: world.player.cash,
      mission: world.mission ? world.mission.index : 0,
      x: world.player.x,
      y: world.player.y,
      missionsDone: world.stats.missionsDone,
    });
    world.save = loadSave();
  }

  function startGame(fromSave) {
    world = createWorld(seed);
    world.save = loadSave();
    if (fromSave && world.save) {
      world.player.cash = world.save.cash;
      world.player.x = world.save.x;
      world.player.y = world.save.y;
      world.stats.missionsDone = world.save.missionsDone || 0;
      startMission(world, world.save.mission);
    }
    input.discard();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Mara Voss is on the streets of Solmar.');
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
    announce(`Busted. The police took $${lost}.`);
  }

  function endWasted() {
    screen = SCREEN_WASTED;
    world.player.cash = Math.floor(world.player.cash * 0.9);
    if (world.player.cash > best) {
      best = world.player.cash;
      saveBest(best);
    }
    announce('Wasted. Mara is down.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      world.muted = !world.muted;
      announce(world.muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONTINUE && world.save) startGame(true);
      else if (actions & ACTION_CONFIRM) startGame(false);
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED) {
      if (actions & ACTION_CONFIRM) {
        if (screen === SCREEN_BUSTED) {
          // Walk free: respawn at the police station, heat off.
          world.player.x = 1200;
          world.player.y = 780;
          world.player.onFoot = true;
          world.player.car = null;
          world.camera.x = 1200;
          world.camera.y = 720;
          screen = SCREEN_PLAY;
          announce('Free. Mara is back on the street.');
        } else {
          clearSave();
          startGame(false);
        }
      }
    }
  }

  function step() {
    world.time += STEP;
    world.clock += STEP * 30;
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
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the cops close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Solmar. Press Enter to play, C to continue a saved game.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
