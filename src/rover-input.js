import {commands} from './simulation.js';
// The control set changes on actual supporting wheel contact, not the
// suspension's short grounded grace period. Rotation uses body-local planes.
export function roverInput(keys,wheelsTouching){const c=commands(),on=code=>Number(keys.has(code)),shift=on('ShiftLeft')||on('ShiftRight');
 c.lift=on('Space');
 if(wheelsTouching){c.drive=on('KeyW')-on('KeyS');c.steer=on('KeyD')-on('KeyA');c.brake=shift;}
 else {c.down=shift;c.kick=on('KeyE')-on('KeyQ');c.pitch=Math.sign(on('KeyW')-on('KeyS')+on('ArrowDown')-on('ArrowUp'));c.yaw=Math.sign(on('KeyA')-on('KeyD')+on('ArrowLeft')-on('ArrowRight'));c.airBrake=on('KeyX');c.stabilize=on('KeyC');c.acro=true;}
 return c;
}
