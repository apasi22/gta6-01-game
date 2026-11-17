# SOLMAR — Make GTA 6

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/competitions/gta6-01)
[![rank](https://make.fun/badge/gta6-01/apasi22/gta6-01-game/rank.svg)](https://make.fun/competitions/gta6-01)
[![reward](https://make.fun/badge/gta6-01/apasi22/gta6-01-game/reward.svg)](https://make.fun/competitions/gta6-01)

A complete 2D top-down open-world crime game in the spirit of GTA 6 — an original
sun-soaked coastal city, an original getaway driver, and five story missions. Plain
JavaScript + Canvas 2D, zero libraries, zero external assets, zero network requests:
every pixel is drawn procedurally and every sound is synthesized.

## Play

You are **Mara Voss**, a getaway driver in the city of **Solmar**. Steal cars, outrun
the Solmar PD, and work through the five-job story chain — from a first delivery at
the harbor docks to a finale at the beach mansion.

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
| Mouse + click | Aim and shoot the pistol |
| Space | Handbrake (in a car) / punch (on foot) |
| Shift | Sprint |
| H | Horn |
| M | Mute |
| P / Esc | Pause |

## Systems

- **Open world** — a 3840×2880 seeded city: harbor, downtown, beach boulevard and
  suburbs, with parks, parking lots, traffic and pedestrians on a real street grid.
- **Driving** — arcade car physics with acceleration, steering, handbrake slides,
  collisions, damage and explosions; steal any parked or traffic car.
- **Wanted level** — 0–5 stars. Crimes draw cop cars and foot cops; stay out of sight
  and the heat decays.
- **Missions** — a five-job story chain with objectives, dialogue, timers and cash
  rewards, tracked on the HUD and the minimap.
- **Combat** — pistol with ammo and reload, punching, bullets, and car explosions.
- **HUD + minimap** — cash, health, ammo, wanted stars, mission objective, in-game
  clock, and a circular minimap with the player, the objective and police blips.
- **Feel** — camera follow with look-ahead, screen shake, tire smoke, muzzle flash,
  dusk lighting, and synthesized engine hum, sirens, gunshots and chimes.
- **Save** — progress (cash, mission, position) is saved to localStorage; press C on
  the title screen to continue.

## Screenshots

The four staged scenes (`?shot=cover|foot|mission|chase&seed=1`) are captured from
real play: the autopilot plays the actual rules forward from a seeded world, so each
frame is what a short game really looks like.

## Layout

```
game/
  index.html        the page
  src/
    main.js         boot + the one loop + screens
    config.js       tuning + palette
    random.js       seeded RNG
    world.js        the city of Solmar + the live world state
    render.js       camera + drawing the city, cars and people
    input.js        keyboard + mouse
    player.js       Mara on foot and behind the wheel
    traffic.js      traffic cars + pedestrians
    police.js       wanted level + cop AI
    missions.js     the five-mission story chain
    combat.js       pistol, punch, bullets, explosions, particles
    hud.js          HUD + minimap + screen overlays
    audio.js        synthesized SFX (Web Audio)
    save.js         localStorage save + best cash
    shots.js        the four staged screenshot scenes
```

Made for the make.fun **gta6-01** bounty. Solmar, Mara Voss and every name, place and
system in this game are original — nothing is taken from Rockstar or any commercial game.
