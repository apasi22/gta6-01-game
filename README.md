# COSTA ALBA — Make GTA 6

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/competitions/gta6-01)
[![rank](https://make.fun/badge/gta6-01/apasi22/gta6-01-game/rank.svg)](https://make.fun/competitions/gta6-01)
[![reward](https://make.fun/badge/gta6-01/apasi22/gta6-01-game/reward.svg)](https://make.fun/competitions/gta6-01)

A complete 2D top-down open-world crime game in the spirit of GTA 6 — an original
sun-soaked coastal city in six named districts, an original getaway driver, and a
twelve-mission story chain. Plain JavaScript + Canvas 2D, zero libraries, zero
external assets, zero network requests: every pixel is drawn procedurally and every
sound — including a two-station radio loop — is synthesized.

## Play

You are **Lena Rook**, a getaway driver new in the city of **Costa Alba**. Eddie
Vance, a fixer with twelve jobs and a long memory, sends you from a first delivery
at the Porto Marina docks to a finale across the whole city — stealing coupes,
losing the CAPD helicopter, and surviving a double cross.

Serve it locally and open it in a desktop browser:

```sh
node serve.ts
# then open http://localhost:8080
```

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Walk, or drive (throttle / steer) |
| E | Enter / exit / steal a car |
| Mouse + click | Aim and shoot |
| Space | Handbrake (in a car) / shoot (on foot) |
| F | Punch |
| Q / H | Horn |
| R | Change radio station |
| G | Garage / upgrades |
| M | Mute |
| P / Esc | Pause |
| 1–3 | Choose a save slot on the title screen |

## Systems

- **Open world** — a 3840×2880 seeded city in six districts: Porto Marina, El
  Centro, Alba Beach, Mercado, Las Palmas and the Gilded Strip, with labeled
  businesses, crosswalks, parks, parking lots, palms, boats, traffic and
  pedestrians on a real street grid.
- **Driving** — arcade car physics with acceleration, steering, handbrake slides,
  collisions, damage and explosions; steal any parked or traffic car, from a
  Rustler to a gold coupe.
- **Wanted level** — 0–5 stars. Crimes draw cop cars and foot cops, a helicopter
  with a searchlight at four stars, and roadblocks across your route; stay out of
  sight and the heat decays.
- **Missions** — a twelve-job story chain with objectives, timers, dialogue,
  cash rewards, time bonuses and a MISSION PASSED screen, tracked on the HUD and
  the minimap.
- **Combat** — pistol and (after five jobs) SMG with ammo and reload, punching,
  bullets, and car explosions.
- **HUD** — cash, health + armor bars, weapon + ammo, wanted stars, REP level,
  district banner, mission banner with timer and distance, circular minimap with
  route and police blips, speedometer, radio widget, police-dispatch text and
  character dialogue.
- **Screens** — title menu with three save slots, pause menu, Eddie's garage
  (engine / armor upgrades, repairs, armor refills), How to Play, and
  BUSTED / WASTED overlays.
- **Feel** — closer camera with look-ahead, screen shake, tire smoke, muzzle
  flash, day / dusk / night lighting with lit windows, headlights, and
  synthesized engine hum, sirens, gunshots, chimes and radio music.
- **Save** — progress (cash, mission, position, upgrades, armor, weapon) is saved
  to localStorage in three slots; continue from the title screen.

## Screenshots

The four staged scenes (`?shot=cover|foot|mission|chase&seed=1`) are captured from
real play: the autopilot plays the actual rules forward from a seeded world, so each
frame is what a short game really looks like.

## Layout

```
game/
  index.html        the page
  src/
    main.js         boot + the one loop + the screen state machine
    config.js       tuning + districts + radio + palette
    random.js       seeded RNG
    world.js        the city of Costa Alba + the live world state
    render.js       camera + drawing the city, cars, people, helicopter
    input.js        keyboard + mouse
    player.js       Lena on foot and behind the wheel
    traffic.js      traffic cars + pedestrians
    police.js       wanted level + cop AI + helicopter + roadblocks
    missions.js     the twelve-mission story chain
    combat.js       pistol / SMG, punch, bullets, explosions, particles
    hud.js          HUD + minimap + menus + screen overlays
    audio.js        synthesized SFX + radio loop (Web Audio)
    save.js         localStorage save slots + best cash
    shots.js        the four staged screenshot scenes
```

Made for the make.fun **gta6-01** bounty. Costa Alba, Lena Rook, Eddie Vance and
every name, place and system in this game are original — nothing is taken from
Rockstar or any commercial game.
