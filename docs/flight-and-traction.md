# Flight, contacts and traction

The rover now separates translation from attitude control. All added reaction jets share the existing finite gas reserve and scale with thruster health; the lab's unlimited toggle still tracks nominal expenditure. The original eight gimbals provide lift. Small visible lab reaction ports provide balanced torque and opposed translation, so a backward burst can brake without adding unwanted lift.

| Key | Ground | Air |
| --- | --- | --- |
| W / S | Drive / brake / reverse | Forward / backward bursts |
| A / D | Steer | Sideways bursts |
| Space | Take off | Main lift jets |
| Shift | Rear handbrake | Thrust toward the surface, regardless of attitude |
| Q / E | — | Left / right Kick-Flip roll |
| Up / Down | — | Nose up / down; hold for pitch flips |
| Left / Right | — | Yaw for flat spins; combine with pitch/roll |
| X | — | Brake translation without stopping rotation |
| C | — | Counter angular velocity and level the rover |

WASD jets follow the rover's body axes. Shift always points toward the planet and X opposes actual velocity. Gravity still acts during braking; use Space to cushion a landing. A rotation axis becomes manual when its control is used: release to coast, opposite input to counter. C restores stabilization, including from an inverted attitude. Landing clears the current trick. Ground steering and post-race ISAO controls retain their existing mappings.

Racing awards completed physical rotations, not key presses: Kick-Flip starts at 100 points, front/back flips and flat spins at 150, face-up yaw spins at 250. Successive turns increase the award, capped at five times the first-turn value. Existing Kick-Flip crossing bonuses remain. The shared scoreboard and CRT callout display the new figures.

Fixture collision separation now uses positional correction instead of injecting a large velocity bias into every overlapping wheel/chassis sphere. Contact torque transfer and friction are reduced for fixtures and rover-to-rover hits, and rover restitution drops from 8% to 2%. Serious impacts still stop and damage the rover; this is not collision immunity.

Fast cornering creates bounded chassis roll, lifting actual inside-wheel contacts. Drive, lateral grip and steering authority scale with the number of supporting wheels; unsupported wheels no longer count toward wheel roll. The HUD shows `GRIP n/6` while contact is reduced. Counter-steer, ease the throttle or straighten out to settle the chassis and regain traction. There is no random loss-of-grip timer.

The reaction ports and plumes use two instanced draw calls per rover. Physics remains fixed at 120 Hz, with the existing interpolated presentation.

Validation: `npm test`, `npm run test:kick`, `npm run test:flight`, and the rendered expedition race. Focused tests cover key routing, force/moment sums, forward/reverse braking, downward thrust, finite gas, independent rotational coasting and counter-thrust, stabilization, actual wheel lift/recovery, and bounded small-rock reactions.
