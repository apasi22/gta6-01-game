// Keyboard + mouse input for Wilwatikta. One read per frame returns the control
// state for that frame: a move vector for walking, throttle/steer/brake for
// driving, and edge-triggered actions (enter car, punch, shoot, horn) consumed by
// the read. Menus use takeMenu instead: up/down navigation, confirm, back, digit
// keys for save slots and mute — it never eats the keys read() needs, and read()
// never eats the keys menus need. Aim coordinates are corrected for the camera zoom.
import { FIELD, ZOOM } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_CONTINUE = 8;
export const ACTION_RADIO = 16;
export const ACTION_GARAGE = 32;

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

  /** Gameplay actions pressed since the last call; consumes Enter/P/Esc/M/C/R/G and clicks.
   * Space is deliberately NOT consumed here: read() needs it for shooting on foot and
   * the handbrake while driving, and nothing on the play screen confirms with Space. */
  function takeActions() {
    let actions = 0;
    if (pressed.has('Enter') || mouse.clicked) actions |= ACTION_CONFIRM;
    if (pressed.has('KeyP') || pressed.has('Escape')) actions |= ACTION_PAUSE;
    if (pressed.has('KeyM')) actions |= ACTION_MUTE;
    if (pressed.has('KeyC')) actions |= ACTION_CONTINUE;
    if (pressed.has('KeyR')) actions |= ACTION_RADIO;
    if (pressed.has('KeyG')) actions |= ACTION_GARAGE;
    pressed.delete('Enter');
    pressed.delete('KeyP');
    pressed.delete('Escape');
    pressed.delete('KeyM');
    pressed.delete('KeyC');
    pressed.delete('KeyR');
    pressed.delete('KeyG');
    // Movement and digit edges are held-state or menu-only: never let a W held while
    // driving leak into the next menu as a phantom up/down press.
    for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3', 'Backspace']) {
      pressed.delete(code);
    }
    mouse.clicked = false;
    return actions;
  }

  /** Menu navigation since the last call: arrows/W/S move, Enter/Space/click confirms. */
  function takeMenu() {
    const menu = { up: false, down: false, confirm: false, back: false, digit: 0, mute: false };
    if (pressed.has('ArrowUp') || pressed.has('KeyW')) menu.up = true;
    if (pressed.has('ArrowDown') || pressed.has('KeyS')) menu.down = true;
    if (pressed.has('Enter') || pressed.has('Space') || mouse.clicked) menu.confirm = true;
    if (pressed.has('Escape') || pressed.has('KeyP') || pressed.has('Backspace')) menu.back = true;
    if (pressed.has('KeyM')) menu.mute = true;
    for (let d = 1; d <= 3; d += 1) {
      if (pressed.has(`Digit${d}`) || pressed.has(`Numpad${d}`)) menu.digit = d;
    }
    for (const code of ['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'Enter', 'Space', 'Escape', 'KeyP', 'Backspace', 'KeyM', 'Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3']) {
      pressed.delete(code);
    }
    mouse.clicked = false;
    return menu;
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
      punch: pressed.has('KeyF') && player.onFoot,
      shoot: mouse.shootQueued || (pressed.has('Space') && player.onFoot),
      aimX: game.camera.x + (mouse.x - FIELD.width / 2) / ZOOM,
      aimY: game.camera.y + (mouse.y - FIELD.height / 2) / ZOOM,
      horn: pressed.has('KeyH') || pressed.has('KeyQ'),
    };
    pressed.delete('KeyE');
    pressed.delete('Space');
    pressed.delete('KeyF');
    pressed.delete('KeyH');
    pressed.delete('KeyQ');
    mouse.shootQueued = false;
    return ctl;
  }

  /** Drop queued clicks/keys (used when a new game starts, so a title click is not a shot). */
  function discard() {
    pressed.clear();
    mouse.clicked = false;
    mouse.shootQueued = false;
  }

  return { takeActions, takeMenu, read, discard };
}
