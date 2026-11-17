// Mara Voss's story: a five-mission chain across Solmar. Each mission is a list of steps
// — go somewhere, pick someone up, steal a marked car, lose the cops on a timer — and
// each pays cash on completion. The objective marker on the HUD and the minimap always
// points at the current step.
import { PALETTE } from './config.js';
import { addWanted, showBanner } from './world.js';

/**
 * Mission steps: goto (reach the marker), pickup (reach it on foot or in a car),
 * steal (get into the gold-marked car), escape (reach it before the timer runs out).
 * Coordinates are street intersections, so the marker is always reachable by road.
 */
export const MISSIONS = [
  {
    name: '1 · First Delivery',
    intro: 'Mara Voss, getaway driver. The harbor boss has a package — take it downtown.',
    reward: 150,
    steps: [
      { type: 'goto', x: 240, y: 240, text: 'Pick up the package at the harbor docks' },
      { type: 'deliver', x: 2160, y: 1680, text: 'Deliver the package downtown' },
    ],
  },
  {
    name: '2 · The Pickup',
    intro: 'Your crew is waiting on the beach. Pick them up, bring them to the safehouse.',
    reward: 250,
    steps: [
      { type: 'pickup', x: 3120, y: 2640, text: 'Pick up the crew on Beach Boulevard' },
      { type: 'deliver', x: 1200, y: 720, text: 'Drive the crew to the safehouse' },
    ],
  },
  {
    name: '3 · The Getaway',
    intro: 'The bank job is on. Grab the bag downtown — then lose the cops. Sixty seconds.',
    reward: 500,
    steps: [
      { type: 'goto', x: 2160, y: 1200, text: 'Reach the bank downtown' },
      { type: 'escape', x: 720, y: 2160, text: 'Escape to the hideout — lose the cops!', time: 60 },
    ],
  },
  {
    name: '4 · The Heist',
    intro: 'A gold coupe is parked uptown. Steal it and bring it to the docks — quietly.',
    reward: 800,
    steps: [
      { type: 'steal', x: 3120, y: 1200, text: 'Steal the gold coupe uptown' },
      { type: 'deliver', x: 240, y: 2160, text: 'Deliver the coupe to the docks' },
    ],
  },
  {
    name: '5 · The Finale',
    intro: 'One last job. Grab the case at the marina, then bring it to the beach mansion.',
    reward: 1500,
    steps: [
      { type: 'goto', x: 1200, y: 2640, text: 'Pick up the case at the marina' },
      { type: 'escape', x: 3600, y: 2640, text: 'Deliver to the beach mansion — 90 seconds!', time: 90 },
    ],
  },
];

export function createMissionState() {
  return { index: 0, step: 0, timer: 0, done: false };
}

/** The current mission definition, or null when the campaign is complete. */
export function currentMission(world) {
  if (!world.mission || world.mission.done) return null;
  return MISSIONS[world.mission.index] ?? null;
}

/** The current step definition, or null when there is none. */
export function currentStep(world) {
  const mission = currentMission(world);
  if (!mission) return null;
  return mission.steps[world.mission.step] ?? null;
}

/** Where the objective marker points right now, with its text. */
export function currentObjective(world) {
  const mission = currentMission(world);
  const step = currentStep(world);
  if (!mission || !step) return null;
  return {
    x: step.x, y: step.y, text: step.text, name: mission.name,
    timer: step.type === 'escape' ? world.mission.timer : 0,
  };
}

function startStep(world) {
  const step = currentStep(world);
  const mission = currentMission(world);
  if (!step || !mission) return;
  if (step.type === 'escape') world.mission.timer = step.time;
  if (step.type === 'steal' && !world.missionCar) {
    // The gold coupe, parked at the marker, waiting to be stolen.
    const car = {
      kind: 'parked', x: step.x + 40, y: step.y, angle: Math.PI / 2, speed: 0,
      color: PALETTE.missionCar, health: 100, dead: false, missionCar: true,
    };
    world.cars.push(car);
    world.missionCar = car;
  }
  showBanner(world, step.text, 4);
}

export function startMission(world, index) {
  world.mission = { index, step: 0, timer: 0, done: false };
  const mission = MISSIONS[index];
  showBanner(world, `${mission.name} — ${mission.intro}`, 5);
  startStep(world);
}

function completeStep(world) {
  const mission = currentMission(world);
  const state = world.mission;
  state.step += 1;
  if (state.step < mission.steps.length) {
    startStep(world);
    return;
  }
  // Mission complete: pay out, count it, move on.
  world.player.cash += mission.reward;
  world.stats.missionsDone += 1;
  world.saveDirty = true;
  showBanner(world, `${mission.name} complete — $${mission.reward} earned.`, 4);
  if (state.index + 1 < MISSIONS.length) {
    startMission(world, state.index + 1);
  } else {
    state.done = true;
    showBanner(world, 'SOLMAR COMPLETE — Mara owns this city. Free roam!', 6);
  }
}

function failMission(world) {
  const mission = currentMission(world);
  showBanner(world, `${mission.name} failed — back to the start of the job.`, 4);
  world.mission.step = 0;
  world.mission.timer = 0;
  startStep(world);
}

/** One fixed step: timers, arrivals, the steal, and mission rewards. */
export function stepMissions(world, dt) {
  if (world.over) return;
  if (!world.mission) {
    startMission(world, 0);
    return;
  }
  const mission = currentMission(world);
  const step = currentStep(world);
  if (!mission || !step) return;
  const player = world.player;

  if (step.type === 'escape') {
    world.mission.timer -= dt;
    if (world.mission.timer <= 0) {
      failMission(world);
      return;
    }
  }

  if (step.type === 'steal') {
    if (player.car && player.car.missionCar) {
      addWanted(world, 2);
      showBanner(world, 'The coupe is yours — the alarm is screaming.', 3);
      completeStep(world);
    }
    return;
  }

  // Reaching the bank in mission 3 trips the alarm and the wanted level.
  const d = Math.hypot(player.x - step.x, player.y - step.y);
  if (d < 70) {
    if (mission.name.startsWith('3 ·') && step.type === 'goto') {
      addWanted(world, 3);
      showBanner(world, 'The alarm is up — three stars and counting!', 3);
    }
    completeStep(world);
  }
}
