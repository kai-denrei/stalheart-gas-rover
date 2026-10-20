# Stage Maker

The first usable editor is implemented at **[stage-maker.html](../stage-maker.html)**. Open it directly or through **Tab → Open Stage Maker** in the lab. It creates editable copies; the built-in races and main Stalheart project remain separate.

## Workflow

1. Start with **The Last Leap**, **The Great Divide**, or **Empty stage → New**. An empty stage includes five starts, two gates and the finish so it can be driven immediately.
2. Select an object in the scene or the searchable list. **F** focuses it. Shift-click selects a group.
3. Drag on the planet surface, use the colored move handles, or edit exact values in the inspector. **G** selects move; **R** selects rotation. **Alt-drag** changes height for supported objects. Snap uses 1 m / 15° increments.
4. Use **Clone / Cmd/Ctrl+D**, Delete, **Cmd/Ctrl+Z** and **Cmd/Ctrl+Shift+Z**. The palette places rocks, barriers, gates, sinkholes/tremors, service pads, domes, sentries, starts and finish assemblies.
5. Order the gates in the inspector. The road follows start 0, ordered gates, then the finish. “Face along race route” aligns a gate with its approach. Gate height controls both the flags and the actual clearance volume.
6. Resolve red validation items, then press **Play test**. This runs an immutable snapshot in the normal five-rover race, with the edited physics and gameplay objects. **Return to Stage Maker** restores the draft and camera, not the damaged simulation state.

Right-drag orbits, middle-drag or Space-drag pans, and the wheel zooms. Top view, Fit stage, and Bounds help inspect the layout. The viewport reports FPS, draw calls, object count and pending asset loads.

## Saving and sharing

Drafts autosave to this browser's IndexedDB after each edit. **Save draft** flushes immediately. A different browser, browser profile, or origin has a separate draft library. **Export JSON** downloads a portable version-1 stage definition. **Import JSON** validates it and makes a new draft with a new identity. Export does not modify repository course files or publish a draft.

The five starts have unique slots 0–4; slot 0 is the human player. Validation blocks missing/overlapping starts, missing finish, gates inside solids, duplicate route orders, degenerate route segments, invalid prefab properties and unsupported transforms. Large gaps and heavier battle/scenery budgets are warnings requiring a drive-through, not guarantees of AI solvability.

## What is editable now

- Rocks and barriers: surface position, altitude, heading, dimensions and color. Play mode uses the same transforms for visuals and convex collisions.
- Gates: position, altitude, heading, height and race order. Their flag poles remain solid.
- Holes: position, radius and dormant/open state. Rendering, terrain collision, hazard triggers and enemy avoidance consume the same authored holes.
- Domes: position, heading, altitude, role, base palette and clear/opaque glazing. Optional row/column links create bridges between compatible neighboring domes **in play mode**.
- Sentries: weapon, position, altitude and heading. Battle activity can be disabled while retaining the models.
- Start poses, service pads, finish position/dimensions and gas capacity.

The runtime uses `stage-definition.js`, `stage-world.js` and the existing race builders. The editor uses the actual GLBs and sinkhole renderer, shared source asset caches, incremental object updates, and commit-on-release dragging. It holds up to 60 undo snapshots.

## Deliberate first-version limits

The finish faces north and needs at least 64 × 68 m of platform space. Put the final gate south of it for AI podium approaches. The gantry and three podiums move as one assembly. Dome sentries are independent objects; shift-select them with the dome to move them together. Bridges are generated during play, not individually editable or drawn in the editor preview. Bounds are visual object bounds, not a view of every convex physics hull.

Procedural wilderness is optional scenery rather than a list of editable objects. Orbital battle, scoreboards, recurring rocket traffic and celebration choreography still belong to the race systems. Custom elevated gates and extreme layouts are allowed but may exceed the current AI pilot's capabilities. Test driving is essential; validation cannot prove that a course is completable.

Later extensions can add reusable city assemblies, explicit bridge pieces, encounter timelines, multi-lap races and authorable celebration events.

## Celebration SH02

The third podium claim starts a separate arrival onto the connected front-right podium apron. The apron and receiving tower are visible from the start and included in the finish preview. The SH02 appears 320 m above its landing pad and 360 m behind it, ignites its boosters after 1.4 seconds, and descends over 14 seconds. It reuses Stalheart's animated landing legs, shock absorption, opening door, clustered plumes, dust and scorch. It stays docked for the celebration and resets with the race. Regular base traffic continues on its own schedule and audio source.

## Verification

`node --test test/stage-maker.test.mjs` checks both preset conversions, edited runtime geometry/gates, malformed stages, history isolation and the arrival timeline. `npm run test:stage` uses real browser pointer input to place and drag an object, edits/clones/undoes, reloads an autosaved draft, play-tests and returns, validates empty stages, and exercises podium-triggered arrival effects.
