# Stage Maker proposal

A developer-only editor inside this standalone lab, using the same planet, objects, physics and race validation as play mode. Start by editing copies of The Last Leap and The Great Divide; keep the original presets available. This is a design proposal; the editor is not implemented yet.

## First usable version

Enter **Edit Stage** from Lab settings. Pause simulation and use an inspection camera. Click an object to select it, then drag translation/rotation handles. An inspector exposes position, heading, dimensions, appearance and gameplay properties. A palette places rocks, barriers, flags/gates, sinkholes, refill pads, city prefabs, sentry sockets, spawn points and finish/podium assemblies.

- **Move:** surface snapping follows the planet normal. Height is an explicit offset; a modifier disables snapping for bridges and elevated obstacles. Coordinates use the existing spherical world helpers, not a flat Y=0 plane.
- **Modify:** edit a selected object's properties; renderer and collision geometry update together. Show collision outlines and gate clearance volumes on demand.
- **Clone:** duplicate with a small offset, preserving settings but assigning fresh object IDs. Multi-select, delete and undo/redo apply to complete logical objects, not arbitrary GLB submeshes.
- **Create:** choose an existing stage as a template or an empty planet patch. Draw a route, place ordered mandatory gates, position five non-overlapping start slots and a finish assembly. Preview racing before saving.
- **Test:** one button starts a temporary play session at the selected spawn. Return to editing restores the authored scene, not the state of destroyed objects or opened holes.
- **Save:** named local drafts and autosave in IndexedDB; export/import versioned JSON. Export explicitly promotes a draft to a repository course file. Editing must never silently overwrite the bundled courses or the main Stalheart project.

## Data and runtime changes required first

Today, course routes live in `src/race-courses.js`, while obstacles, podiums and holes are constructed in `src/race-world.js`; cities and combat placements have separate builders. Extract these authored values into a serializable `StageDefinition` before building gizmos.

Each stage contains a schema version, stable ID/name, planet settings, route points, ordered gates, spawn slots, objects, finish assembly and encounter settings. Each object has a stable ID, prefab ID, spherical surface coordinates, altitude offset, local rotation and prefab-specific properties. Asset URLs and raw executable code are not part of imported stages.

A shared prefab registry creates the visible model, collision proxies, gameplay triggers and editor handles from that one definition. Changes to transforms rebuild only the selected object's proxies; moving articulated models keep their collision transforms synchronized. Existing `point`, `frameAt`, convex colliders, gate height validation and free respawn searches can be reused.

Import both current races into this format with a compatibility test before exposing editing. Keep physics bodies, resource budgets, AI tuning and runtime effects outside the saved authoring state. Editing a flag must move its poles, clearance volume and AI waypoint together. Editing a sinkhole must update terrain sampling, visible geometry, debris collision and avoidance consistently.

## Validation and performance

Before play/export, report overlapping starts, gates inside solids, unreachable or blocked podiums, unsupported structure heights, malformed values and missing prefabs. Warn about very long jump gaps and dense enemy/FX budgets; those are creative choices, not automatic blockers. Show route order and race direction, particularly in the reverse Base 1 section.

Batch edits while dragging; commit physics rebuilds on release or at a throttled preview rate. Keep rendering instancing and shared materials. Preserve spatial-index invalidation on add, remove **and move**, not just changes in object count. Include a visible FPS/draw-call/object-count panel in editing mode.

## Delivery sequence

1. Extract and round-trip existing course data with no changes in race behavior.
2. Add selection, surface-aware move/rotate, inspector, clone/delete, undo/redo and drafts.
3. Add prefab placement, empty stages, gate/route editing and play/return workflow.
4. Add validation, export/import and comparison against the original stage.
5. Later: reusable city assemblies, encounter timeline, multi-lap races and authorable celebration events.

The most useful first milestone is moving a rock and a gate in Great Divide, cloning a sinkhole, test-driving the result, then returning to exactly the same editable stage.
