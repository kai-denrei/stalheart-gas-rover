# City combat and exploration — October 19, 2026

This is the standalone rover lab. Main Stalheart and the creature lab remain source-only references. The current weapon, crowd and finale settings are documented in [battle-expansion.md](battle-expansion.md).

Post-race exploration now hands control to the actual ISAO builder drone, replacing the original free camera. The player takes over automatically after securing a podium or when the race ends; F switches between ISAO and rover views. WASD flies, Q/E descends/ascends, Shift flies faster, drag orbits, and the wheel zooms. Combat continues after all three podiums fill. See [isao-and-circuit.md](isao-and-circuit.md) for the current controls, flag collisions and circuit rendering.

Six Quivers, three Rotors and three Lancers occupy the existing twelve dome mounts. They use Stalheart's slew/recoil rules, original pivots and alternating muzzle sockets. Rotors spin up/down around bursts. Projectiles travel before applying damage; Talons use Stalheart's pooled model/exhaust renderer and home towards live targets. Buildings/terrain and friendly rovers inhibit fire. Active shots/actors/effects are capped and reset with the race.

Reeds now use an actual soft-body gait captured from the Creature Lab runtime port in Stalheart Below, including probing, planted limbs and pulling. `scripts/bake-reed-motion.mjs` produces six seconds at 20 poses/s; the GPU interpolates those poses and blends the loop. Different enemies have different phases. A coarse closed cage follows the same animated surface at distance. This deliberately reuses the motion without running a soft-body solver for every background enemy. The pinned RGBA16F position/normal texture is about 19.7 MB. The bake test rejects a stationary/probing-only capture.

Up to four Cutis-gorogoro use the actual rolling membrane controller/shaders from the same Creature Lab port, with a visible red pearl core. The host follows its real reach/transfer/launch/roll movement, with interpolated display phases. They take more sentry hits than Reeds. The current battle supports up to 640 bodies with adaptive spawn gating; the four full Gorogoro solvers remain separately bounded.

KORP Gunship and SOL-82 use the actual Stalheart models and articulation/animation clips. The 25 mm and 40 mm use the shared gunship cadence, heat and magazine rules. MK-9 drops use the source 4.2-second trajectory every 12 seconds, with a separate three-bomb salvo at disco start. SOL fires its original beam and retains its ground smoke/scorch layer. Orbital firing damages actual incoming enemies. It remains background support rather than a new player weapon or race damage hazard.

Explosion modules are the original `rotary-pop`, `bofors-burst`, `howitzer-blast`, `orbital-strike` and shared shaders from Stalheart, including mushroom cap/stem, base surge, rings and embers. Nuclear aftermath is slowed to about 16 seconds; ground scorch/coals last up to 65 seconds. Four nuclear effects, four heavy effects, ten medium and twelve small effects may coexist. Original sentry/report audio samples use distance attenuation and an eight-voice cap. No additional dynamic lights or shadow maps.

Source: Stalheart `5c36b5a13b5ca72532396c5cdc03303841b15c8f`; models by jelaludo. The Creature Lab-derived modules retain their GPL-3.0 licenses. Every new copied module, model, audio clip and generated motion asset is pinned in `docs/assets.lock.json`.

The dome entrance repair and asset-team message are in `docs/dome-entrance-asset-team.md`.

Validation reports: `artifacts/combat-browser-report.json`, `artifacts/unit-test-output.txt`. The browser run checks physical human landing/claim, locked and unlocked camera controls, creature/weapon activity, nuclear and SOL aftermath, continuing post-race combat and complete restart cleanup. Performance samples are recorded at the report's exact viewport/DPR; they are local measurements rather than a phone-performance promise.

Original combat-expansion baseline (before the ISAO/circuit update): 76/76 unit tests, all pinned asset hashes/module checks, the full physical AI race regression, and the combat browser acceptance passed without browser errors. Active race samples at 1440×913 (DPR 1) and 2520×1597 (DPR 1.75) both averaged approximately 60 FPS; P95 frame interval 16.7–16.8 ms. In the sampled high-resolution battle, simulation averaged 1.03 ms, render submission 2.41 ms and GPU 3.40 ms. No additional long tasks appeared between the grid and battle samples. See `artifacts/combat-performance.json` for the complete measurements.
