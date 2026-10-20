# R–47X / Stalheart rover lab

A standalone keyboard-first 3D proving ground. Drive the R–47X, use short cold-gas bursts to cross sinkholes, correct in flight, and cushion the landing. Stop on a marked pad to refill and save a checkpoint.

```sh
npm run dev
# http://localhost:8166
```

Node 22+; no package installation, external runtime services, or sibling checkout required. The imported Stalheart components are local, pinned copies. This project does not change or serve the main Stalheart game.

**[Play the public lab](https://kai-denrei.github.io/stalheart-gas-rover/?mode=race)** — keyboard and desktop browser recommended.

For the five-rover race, open **[The Last Leap](https://kai-denrei.github.io/stalheart-gas-rover/?mode=race)** or use the mode selector. Touch fourteen gates, clear the sinkholes, then boost onto a raised platform and stop inside one of three sequentially claimed podium circles. The gates use animated flags from [jelaludo’s CTF kit](https://jelaludo.github.io/SentryTowers_A6/ctf-flags/), with the 火 and 力 variants rendered in plain colors. [Race rules and controls](docs/race-mode.md).

For **[Three-plane flip practice](https://kai-denrei.github.io/stalheart-gas-rover/?mode=kickflip)**, boost into the air, use **Q/E** for Coronal Flip, **W/S** for Sagittal Flip, or **A/D** for Transverse Flip, release to coast, then counter with the opposite roll key. A full airborne 360° earns a brief CRT-style callout. [Trick controls and scoring](docs/kick-flip-mode.md). [Flight, braking and traction](docs/flight-and-traction.md).

Click **Enter proving ground**. Start with a short run-up on W, tap/hold Space before the rim, then use S to reduce forward speed in flight. Releasing Space lets gravity bring you down. Keep gas for the landing. Timing is experimental; repeated short attempts are the point of the lab.

| Input | Action |
| --- | --- |
| W / S | Drive / brake then reverse; forward / backward jets airborne |
| A / D | Steer; sideways jets airborne |
| Space | Upward boost |
| Shift | Ground handbrake; airborne downward thrust |
| X / C | Air brake / stabilize and level (uses gas) |
| Up / Down | Nose up / down |
| Left / Right | Yaw left / right |
| Q / E | Roll |
| Mouse drag / wheel | Orbit / distance |
| R | Reset to last pad |
| V | Cycle camera |
| P / Escape | Pause / resume |
| H / Tab | Controls / lab settings |

Boulders, rim rubble, barriers and pad beacons are solid. Impacts give a short sound/message; large hits can reset the rover. D0–D3 damage geometry is integrated; the original [asset brief](docs/rover-damage-asset-brief.md) records its contract.

The lab panel exposes assistance, gravity, lift, gas capacity, unlimited refill, sinkhole scale, camera, render resolution, volume, and diagnostics. Unlimited refill continues firing but latches when the nominal reserve would have emptied. The marker records consumption on the actual practice trajectory. Toggling it off does not grant fresh gas.

The updated rover has front steering, six spinning wheels, individual suspension and nozzle gimbals, sensor yaw/pitch scanning, and bounded cold-gas mist. Toggle **Cold-gas particles** in Lab settings to compare performance.

The rover carries cyan vertical nozzle-thrust bars on its right rear wheel cover, orange speed on the left, and nominal gas reserve on the back, plus a live attitude/rate panel on the rear deck. The sky reuses Stalheart’s black hole, star field, galaxies, and Veil/Bloom nebulae.

The upper-right counter shows measured FPS, average/P95 frame time, simulation CPU, draw CPU, and GPU time (`n/a` when unavailable). For a Retina performance comparison, select **Balanced** or **Standard** render resolution in Lab settings.

```sh
npm test                 # deterministic simulation checks
npm run check            # asset hashes, module syntax and local imports
npm run test:browser     # Chrome acceptance against the running local server
npm run test:race        # full five-rover race with actual rendered obstacle collisions
npm run test:city        # city LOD, opening holes, LANCER disco, audio lifecycle and FPS
npm run test:kick        # E, full rotation, counter-thrust and CRT callout
```

Browser checks use installed Google Chrome, with an isolated profile and cleanup. Set `CHROME` for another Chrome executable and `LAB_URL` if using a different server port. Screenshots and the browser report go to `artifacts/`.

- [Agreed specification](docs/rover-lab-spec.md)
- [Implementation plan](docs/rover-lab-plan.md)
- [Implementation notes and limitations](docs/implementation-notes.md)
- [Updated rover integration](docs/rover-asset-update.md)
- [Asset provenance](docs/assets.lock.json)

Models by **jelaludo** — [SentryTowers_A6](https://jelaludo.github.io/SentryTowers_A6/). Planet/grid and sinkhole integration from Stalheart. See the implementation notes for inherited sources and credits.

Driving and racing now include accumulated rover damage: D1 cosmetic wear, D2 reduced steering/grip/thrust, and D3 component failure. R recovers and repairs (three-second penalty in races); refill pads supply gas without repairs. The footer reports hull and control condition. Three-plane flip practice keeps damage off. Standalone art comparisons remain at [impact trials](https://kai-denrei.github.io/stalheart-gas-rover/artifacts/rover-damage-review/index.html) and [accumulation preview](https://kai-denrei.github.io/stalheart-gas-rover/artifacts/rover-damage-review/accumulation.html).

The race now runs through a dome city with distance-based detail. Jumps 2 and 4 tremble and open when the first racer approaches. Once the third podium spot is claimed, Stalheart’s day-42 disco ball and music celebrate the finish, with two LANCER sentries aiming lasers at the ball. [Race details](docs/race-mode.md).

Hold **Shift** while steering to drift the rear wheels; release to regain grip. The race finish now has the real Stalheart gantry and tiered podiums. Twelve dome sentries and sixteen ground sentries protect the course and podium against Reed and Red Core waves. Near the podium, the HUD explains any missing gate or positioning requirement before the shield can be claimed. Distant Gunship and SOL fire support the battle, including nuclear strikes during the finale. After finishing, explore as ISAO: A/D rotate left/right, W/S move forward/backward, Space rises, and Shift descends. Race starts use five red lights and matching beeps; stunt scores track flips and obstacle bonuses.

Publishing uses GitHub Pages. Every push to `main` runs the simulation tests, verifies pinned assets and module imports, builds the static site, and deploys it. Run `npm run build` to prepare the same site locally in `dist/`; no dependency installation is required.

The city includes six clear and six opaque domes, an independent automated SOL-88 laser, and a HUGIN pad where an SH02 rocket periodically lands and takes off. Recovery reserves a free space and rechecks it before release; NEEDLE uses its original sniper tracer, recoil, sound and impact effects. [Base traffic and recovery details](docs/base-traffic-and-recovery.md). Run `npm run test:base` against the local server to verify these integrations.
