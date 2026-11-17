// Keyboard + mouse input. One read per frame returns the control state for that frame:
// a move vector for walking, throttle/steer/brake for driving, and edge-triggered actions
// (enter car, punch, shoot, horn) that are consumed by the read. Menu keys are consumed
// separately by takeActions, which never eats the keys read() needs.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_CONTINUE = 8;

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: FIELD.width / 2, y: FIELD.height / 2, clicked: false, shootQueued: false };

  function trackMouse(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) * FIELD.width) / Math.max(rect.width, 1);
    mouse.y = ((event.clientY - rect.top) * FIELD.height) / Math.max(rect.height, 1);
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    pressed.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousemove', trackMouse);
  canvas.addEventListener('mousedown', (event) => {
    trackMouse(event);
    mouse.clicked = true;
    mouse.shootQueued = true;
  });
  window.addEventListener('mouseup', () => {
    mouse.clicked = false;
  });

  /** Menu actions pressed since the last call; consumes Enter/P/Esc/M/C and clicks. */
  function takeActions() {
    let actions = 0;
    if (pressed.has('Enter') || pressed.has('Space') || mouse.clicked) actions |= ACTION_CONFIRM;
    if (pressed.has('KeyP') || pressed.has('Escape')) actions |= ACTION_PAUSE;
    if (pressed.has('KeyM')) actions |= ACTION_MUTE;
    if (pressed.has('KeyC')) actions |= ACTION_CONTINUE;
    pressed.delete('Enter');
    pressed.delete('KeyP');
    pressed.delete('Escape');
    pressed.delete('KeyM');
    pressed.delete('KeyC');
    mouse.clicked = false;
    return actions;
  }

  /** The control state for this frame, from the keyboard and mouse right now. */
  function read(game) {
    const player = game.player;
    const up = keys.has('KeyW') || keys.has('ArrowUp');
    const down = keys.has('KeyS') || keys.has('ArrowDown');
    const left = keys.has('KeyA') || keys.has('ArrowLeft');
    const right = keys.has('KeyD') || keys.has('ArrowRight');
    let mx = (right ? 1 : 0) - (left ? 1 : 0);
    let my = (down ? 1 : 0) - (up ? 1 : 0);
    const len = Math.hypot(mx, my) || 1;
    mx /= len;
    my /= len;
    const ctl = {
      mx,
      my,
      throttle: up ? 1 : down ? -0.7 : 0,
      steer: mx,
      brake: keys.has('Space'),
      sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
      enter: pressed.has('KeyE'),
      punch: pressed.has('Space') && player.onFoot,
      shoot: mouse.shootQueued,
      aimX: game.camera.x + (mouse.x - FIELD.width / 2),
      aimY: game.camera.y + (mouse.y - FIELD.height / 2),
      horn: pressed.has('KeyH'),
    };
    pressed.delete('KeyE');
    pressed.delete('Space');
    pressed.delete('KeyH');
    mouse.shootQueued = false;
    return ctl;
  }

  /** Drop queued clicks/keys (used when a new game starts, so a title click is not a shot). */
  function discard() {
    pressed.clear();
    mouse.clicked = false;
    mouse.shootQueued = false;
  }

  return { takeActions, read, discard };
}
