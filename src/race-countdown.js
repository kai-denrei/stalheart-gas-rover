export const START_STEPS=3;
export const startLightCount=race=>race.phase==='countdown'?Math.min(START_STEPS,1+Math.floor(START_STEPS-race.countdown+1e-8)):0;
