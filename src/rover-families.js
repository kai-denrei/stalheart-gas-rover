// Keep the six simulation slots stable for damage, replays and interpolation.
// XB-12 has no middle axle: those two slots never participate in contacts.
export const PHYSICS_WHEEL_IDS=['RL','ML','FL','RR','MR','FR'];
// Dimensions below are authored asset units; scale converts them to world metres.
export const ROVER_FAMILIES={
 r47x:{label:'R-47X',scale:1,wheels:[0,1,2,3,4,5],track:.98,axle:1.44,radius:.48,arm:.5},
 r47xs:{label:'R-47X-S',scale:1,wheels:[0,1,2,3,4,5],track:.98,axle:1.44,radius:.48,arm:.5},
 xb12:{label:'XB-12',scale:.5,wheels:[0,2,3,5],track:1.20,axle:1.475,radius:.5,arm:.7}
};
export const FLEETS={
 mixed:{label:'All three types',types:['r47xs','xb12','r47x','xb12','r47xs']},
 new:{label:'Two new types',types:['r47xs','xb12','r47xs','xb12','r47xs']},
 r47xs:{label:'R-47X-S only',types:Array(5).fill('r47xs')},
 original:{label:'Original R-47X · comparison',types:Array(5).fill('r47x')}
};
export function fleetSelection(params,racing=true){
 const fleet=Object.hasOwn(FLEETS,params.get('fleet'))?params.get('fleet'):'mixed';
 const types=[...FLEETS[fleet].types],requested=params.get('rover');
 if(Object.hasOwn(ROVER_FAMILIES,requested)&&(!racing||types.includes(requested)))types[0]=requested;
 // The original remains the default in the existing proving ground.
 else if(!racing&&!params.has('fleet'))types[0]='r47x';
 return {fleet,types:racing?types:[types[0]]};
}
