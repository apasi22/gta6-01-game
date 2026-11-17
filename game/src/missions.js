// Lena Rook's story: a twelve-mission chain across Costa Alba, handed out by the
// fixer Eddie Vance. Each mission is a list of steps — go somewhere, pick someone
// up, steal a marked car, lose the cops on a timer — with dialogue, heat that
// arrives with the job, and cash on completion plus a time bonus for fast escapes.
// The objective marker on the HUD and the minimap always points at the current step,
// and finishing a mission raises the MISSION PASSED screen before the next job.
import { PALETTE } from './config.js';
import { addWanted, showBanner, showDialogue } from './world.js';

/**
 * Mission steps: goto (reach the marker), pickup (reach it, crew hops in), steal
 * (get into the gold-marked car), deliver (reach it with the goods), escape (reach
 * it before the timer runs out). `heat` adds wanted stars when the step starts.
 * Coordinates are street intersections, so the marker is always reachable by road.
 */
export const MISSIONS = [
  { name: '1 · First Delivery', reward: 150,
    intro: 'EDDIE: Fresh in town? Take the package from the docks downtown. No detours.',
    steps: [
      { type: 'goto', x: 240, y: 240, text: 'Pick up the package at Porto Marina' },
      { type: 'deliver', x: 2160, y: 1680, text: 'Deliver the package in El Centro' },
    ] },
  { name: '2 · Hot Wheels', reward: 250,
    intro: 'EDDIE: I need wheels. Gold coupe, uptown — bring it to the garage.',
    steps: [
      { type: 'steal', x: 3120, y: 720, text: 'Steal the gold coupe uptown' },
      { type: 'deliver', x: 720, y: 720, text: 'Deliver the coupe to the garage' },
    ] },
  { name: '3 · Beach Pickup', reward: 300,
    intro: 'LENA: Crew’s waiting on the beach. Then the safehouse — easy money.',
    steps: [
      { type: 'pickup', x: 3120, y: 2640, text: 'Pick up the crew on Alba Beach' },
      { type: 'deliver', x: 1200, y: 720, text: 'Drive the crew to the safehouse' },
    ] },
  { name: '4 · The Getaway', reward: 500,
    intro: 'EDDIE: The bank job is on. Grab the bag — then lose the cops. Sixty seconds.',
    steps: [
      { type: 'goto', x: 2160, y: 1200, text: 'Reach the bank in El Centro', heat: 3 },
      { type: 'escape', x: 720, y: 2160, text: 'Escape to the hideout — lose the cops!', time: 60 },
    ] },
  { name: '5 · Night Freight', reward: 450,
    intro: 'EDDIE: A crate comes in at the marina tonight. Take it to the Mercado.',
    steps: [
      { type: 'goto', x: 240, y: 2640, text: 'Collect the crate at the marina' },
      { type: 'deliver', x: 1680, y: 240, text: 'Deliver the crate to the Mercado' },
    ] },
  { name: '6 · Strip Coupe', reward: 700,
    intro: 'LENA: A coupe on the Strip, keys in it. The docks want it quiet.',
    steps: [
      { type: 'steal', x: 3600, y: 1200, text: 'Steal the coupe on the Gilded Strip' },
      { type: 'deliver', x: 240, y: 2160, text: 'Deliver the coupe to the docks' },
    ] },
  { name: '7 · The Informant', reward: 800,
    intro: 'EDDIE: My man in El Centro talks too much. Hear him out — then vanish.',
    steps: [
      { type: 'goto', x: 1200, y: 1200, text: 'Meet the informant in El Centro', heat: 2 },
      { type: 'escape', x: 2640, y: 2640, text: 'Lose the tail — reach the beach house', time: 75 },
    ] },
  { name: '8 · Casino Run', reward: 900,
    intro: 'EDDIE: Three drops on the Strip, then back to the garage. Keep it smooth.',
    steps: [
      { type: 'goto', x: 3120, y: 720, text: 'First drop: Casino Oro' },
      { type: 'goto', x: 3600, y: 1680, text: 'Second drop: Club Luna' },
      { type: 'goto', x: 3120, y: 2160, text: 'Third drop: the Gilded Palm' },
      { type: 'deliver', x: 720, y: 720, text: 'Return to the garage' },
    ] },
  { name: '9 · Heat Wave', reward: 1100,
    intro: 'LENA: Four stars and a helicopter. Time to show CAPD my taillights.',
    steps: [
      { type: 'goto', x: 2160, y: 1680, text: 'Grab the ledger downtown', heat: 4 },
      { type: 'escape', x: 240, y: 240, text: 'Outrun the helicopter — reach the docks!', time: 90 },
    ] },
  { name: '10 · The Vault', reward: 1400,
    intro: 'EDDIE: The vault job. Ninety seconds from the alarm to the mansion.',
    steps: [
      { type: 'goto', x: 1680, y: 1200, text: 'Hit the vault in El Centro', heat: 3 },
      { type: 'escape', x: 3600, y: 2640, text: 'Escape to the beach mansion', time: 90 },
    ] },
  { name: '11 · Double Cross', reward: 1600,
    intro: 'EDDIE: Meet me at the marina. Come alone. …Something feels wrong.',
    steps: [
      { type: 'goto', x: 1200, y: 2640, text: 'Meet Eddie at the marina', heat: 3 },
      { type: 'escape', x: 2640, y: 240, text: 'It was a setup — run!', time: 75 },
    ] },
  { name: '12 · The Last Ride', reward: 2500,
    intro: 'LENA: One case, one ride across the whole city. Then Costa Alba is mine.',
    steps: [
      { type: 'goto', x: 720, y: 2640, text: 'Pick up the case on Alba Beach', heat: 2 },
      { type: 'escape', x: 3600, y: 720, text: 'The last ride — reach the mansion!', time: 120 },
    ] },
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
    total: MISSIONS.length, index: world.mission.index,
  };
}

function startStep(world) {
  const step = currentStep(world);
  const mission = currentMission(world);
  if (!step || !mission) return;
  if (step.type === 'escape') world.mission.timer = step.time;
  if (step.heat) {
    addWanted(world, step.heat);
    showBanner(world, `The alarm is up — ${step.heat} stars and counting!`, 3);
  }
  if (step.type === 'steal' && !world.missionCar) {
    // The gold coupe, parked at the marker, waiting to be stolen.
    const car = {
      kind: 'parked', x: step.x + 40, y: step.y, angle: Math.PI / 2, speed: 0,
      color: PALETTE.missionCar, model: 'GOLD COUPE', health: 100, maxHealth: 100,
      dead: false, missionCar: true,
    };
    world.cars.push(car);
    world.missionCar = car;
  }
  showBanner(world, step.text, 4);
}

export function startMission(world, index) {
  world.mission = { index, step: 0, timer: 0, done: false };
  const mission = MISSIONS[index];
  const [speaker, ...rest] = mission.intro.split(': ');
  showDialogue(world, speaker, rest.join(': '), 6);
  showBanner(world, `${mission.name}`, 4);
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
  // Mission complete: pay out with a time bonus for fast escapes, then raise the
  // MISSION PASSED screen; the next job starts when it is dismissed.
  const escaped = mission.steps.some((s) => s.type === 'escape');
  const bonus = escaped ? Math.max(0, Math.ceil(state.timer)) * 5 : 0;
  world.player.cash += mission.reward + bonus;
  world.stats.missionsDone += 1;
  world.saveDirty = true;
  world.passed = {
    name: mission.name, reward: mission.reward, bonus,
    total: mission.reward + bonus, last: state.index + 1 >= MISSIONS.length,
  };
  world.missionCar = null;
}

function failMission(world) {
  const mission = currentMission(world);
  showDialogue(world, 'EDDIE', 'You blew it. Again — from the top.', 4);
  showBanner(world, `${mission.name} failed — back to the start of the job.`, 4);
  world.mission.step = 0;
  world.mission.timer = 0;
  startStep(world);
}

/** Dismiss the MISSION PASSED screen: start the next job, or finish the campaign. */
export function advanceAfterPassed(world) {
  const state = world.mission;
  world.passed = null;
  if (!state) return;
  if (state.index + 1 < MISSIONS.length) {
    startMission(world, state.index + 1);
  } else {
    state.done = true;
    showBanner(world, 'COSTA ALBA COMPLETE — Lena owns this city. Free roam!', 6);
    showDialogue(world, 'LENA', 'Twelve jobs. This city is mine now.', 6);
  }
}

/** One fixed step: timers, arrivals, the steal, and mission rewards. */
export function stepMissions(world, dt) {
  if (world.over || world.passed) return;
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

  const d = Math.hypot(player.x - step.x, player.y - step.y);
  if (d < 70) completeStep(world);
}
