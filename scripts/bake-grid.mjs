import {generateSphereMesh} from '../upstream/stalheart/src/grid.js';
import {decodePlanetBake} from '../upstream/stalheart/src/core/planet-bake.js';
import {readFile,writeFile} from 'node:fs/promises';
const recipe={seed:7,points:16000,k:12,relaxIters:80,pullRate:.25,rooms:384,roomRadius:4,extraCorridors:192,corridorWidth:1};
const bake=decodePlanetBake(new Uint8Array(await readFile('upstream/stalheart/assets/story/planet.bin')),recipe);
const mesh=generateSphereMesh({seed:7,n:16000,k:12});
const vertices=bake.vertices,quads=Uint32Array.from(mesh.quads.flat());
const buffer=Buffer.alloc(8+vertices.byteLength+quads.byteLength);buffer.writeUInt32LE(vertices.length,0);buffer.writeUInt32LE(quads.length,4);Buffer.from(vertices.buffer,vertices.byteOffset,vertices.byteLength).copy(buffer,8);Buffer.from(quads.buffer).copy(buffer,8+vertices.byteLength);
await writeFile('assets/planet-grid.bin',buffer);console.log(`${mesh.quads.length} pinned organic cells, ${buffer.length} bytes`);
