import {commands} from './simulation.js';
export function roverInput(keys,grounded){const c=commands(),on=code=>Number(keys.has(code)),shift=on('ShiftLeft')||on('ShiftRight');
 c.drive=on('KeyW')-on('KeyS');c.steer=on('KeyD')-on('KeyA');c.lift=on('Space');
 if(grounded)c.brake=shift;
 else {c.down=shift;c.kick=on('KeyE')-on('KeyQ');c.pitch=on('ArrowDown')-on('ArrowUp');c.yaw=on('ArrowLeft')-on('ArrowRight');c.airBrake=on('KeyX');c.stabilize=on('KeyC');c.acro=true;}
 return c;
}
