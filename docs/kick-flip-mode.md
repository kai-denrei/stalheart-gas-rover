# Kick-Flip practice

Open **http://localhost:8166/?mode=kickflip**, or choose **Trick lab · Kick-Flip** in the mode selector.

1. Hold **Space** to gain enough height for the rotation. Start with about a second of lift on open ground.
2. Briefly hold **Q** or **E** to fire a strong lateral roll burst. A roughly half-second to three-quarter-second burst is a starting point for experimentation.
3. Release the keys to coast. Watch the accumulated degrees and roll rate on the left.
4. Fire the **opposite roll key** before reaching 360° to arrest the spin. The faster you are rotating, the earlier you need to counter.
5. Correct the remaining attitude with the ordinary pitch/yaw/roll controls and soften the landing with Space.

There is no canned flip animation or automatic counter-burst. The original eight gimbals supply lift. Added opposed reaction jets supply directional corrections and balanced pitch/yaw/roll torque without parasitic lift. Q/E starts a manual roll; arrow keys start manual pitch/yaw. Release to coast or counter with the opposite key. Hold C to resume stabilization and level the rover. X slows translation without cancelling rotation, while Shift pushes toward the surface. All requests use the same finite gas reserve and shared thruster health.

Bursts and corrections spend the normal finite gas reserve. Existing refill pads, R reset and the lab's unlimited-refill toggle remain available. An empty reserve cannot start or brake a spin through thrusters; existing angular momentum continues.

A complete airborne 360° earns one **KICK-FLIP** credit immediately, accompanied by a brief scanline/chromatic arcade callout. A second continuous revolution advances the combo. Landing is still the player's responsibility. The tracker integrates signed quaternion rotation increments around the rover's longitudinal axis, so partial rocking does not earn credits. Terrain or solid-object contact ends the attempt. R clears the current winding; earned credits remain for this page session. Reloading begins a fresh score.

These controls work in the proving ground, both races and Kick-Flip practice. Pitch flips and flat spins earn 150 points for the first full turn in races; a face-up yaw spin earns 250. Repeated turns increase the award. Q/E retains the existing Kick-Flip awards and crossing bonuses.

Validation:

```sh
npm test
npm run test:kick
```

The unit tests cover both directions, stronger roll authority within nozzle limits, coasting, counter-thrust, complete rotations, partial rocking, empty gas and reset behavior. The browser test exercises real E keyboard events, verifies a full physical revolution and the disappearing CRT callout, and captures `artifacts/kick-flip.png` with a report in `artifacts/kick-browser-run.json`.
