import {commands} from './simulation.js';
// The control set changes on actual supporting wheel contact, not the
// suspension's short grounded grace period. Rotation uses body-local planes.
export function roverInput(keys,wheelsTouching){const c=commands(),on=code=>Number(keys.has(code)),shift=on('ShiftLeft')||on('ShiftRight'),boostChord=shift&&(on('KeyW')||on('KeyS')),longitudinal=on('KeyW')-on('KeyS');
 c.lift=shift?0:on('Space');
 c.down=shift?on('Space'):0;
 c.boost=boostChord?longitudinal:0;
 if(wheelsTouching){c.drive=longitudinal;c.steer=on('KeyD')-on('KeyA');c.brake=on('KeyX');}
 else {c.kick=on('KeyE')-on('KeyQ');c.pitch=Math.sign((boostChord?0:longitudinal)+on('ArrowDown')-on('ArrowUp'));c.yaw=Math.sign(on('KeyA')-on('KeyD')+on('ArrowLeft')-on('ArrowRight'));c.airBrake=on('KeyX');c.stabilize=on('KeyC');c.acro=true;}
 return c;
}
