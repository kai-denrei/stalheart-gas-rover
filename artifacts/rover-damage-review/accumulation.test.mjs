import test from 'node:test';
import assert from 'node:assert/strict';
import {GROUPS,HIT_COUNT,accumulatedDamage} from './accumulation-model.js';
import {ZONE_DEFS} from './runtime.js';
test('sequence covers all 19 asset zones exactly once per round',()=>{
 const zones=GROUPS.flatMap(g=>g.zones);assert.equal(zones.length,19);assert.equal(new Set(zones).size,19);assert.deepEqual(zones.toSorted(),ZONE_DEFS.map(z=>z.id).toSorted());
});
test('repeated hits accumulate without healing and advance only the struck group',()=>{
 let previous=accumulatedDamage(0);
 for(let i=1;i<=HIT_COUNT;i++){const next=accumulatedDamage(i);for(const [zone,level] of Object.entries(next.states)){assert.equal(level-previous.states[zone],next.last.zones.includes(zone)?1:0);}assert.ok(next.core>=previous.core);previous=next;}
});
test('each full round reaches its whole-rover stage and only the final hit is a wreck',()=>{
 for(let stage=0;stage<=3;stage++){const state=accumulatedDamage(stage*4);assert.equal(state.core,stage);assert.ok(Object.values(state.states).every(d=>d===stage));assert.equal(state.wreck,stage===3);}
 assert.equal(accumulatedDamage(11).wreck,false);
});
test('scrubbing is deterministic and clamps to sequence bounds',()=>{
 assert.deepEqual(accumulatedDamage(100),accumulatedDamage(12));assert.deepEqual(accumulatedDamage(-1),accumulatedDamage(0));const earlier=accumulatedDamage(5);accumulatedDamage(12);assert.deepEqual(accumulatedDamage(5),earlier);
});
