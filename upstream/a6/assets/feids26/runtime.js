export const SHELL_DURATION=4,CENTER_Y=3.8;
// Symmetric spindle: a continuous lens taper, without a cylindrical middle or domed caps.
export const AXIAL_STRETCH=1.4;
export const PROFILE=[[-7.2,.04],[-5.76,1.35],[-4.32,2.4],[-2.88,3.15],[-1.44,3.6],[0,3.75],[1.44,3.6],[2.88,3.15],[4.32,2.4],[5.76,1.35],[7.2,.04]].map(([z,r])=>[z*AXIAL_STRETCH,r]);
export function radiusAt(z){for(let i=1;i<PROFILE.length;i++)if(z<=PROFILE[i][0]){const [a,r]=PROFILE[i-1],[b,s]=PROFILE[i];return r+(s-r)*(z-a)/(b-a);}return .08;}
export const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// Seeded debris variation: stable while scrubbing; the viewer chooses a new seed per replay.
export function randomFor(seed,k){let n=(seed^Math.imul(k+1,2654435761))>>>0;n=Math.imul(n^(n>>>16),2246822507);n=Math.imul(n^(n>>>13),3266489909);return ((n^(n>>>16))>>>0)/4294967296;}
export function applyShell(root,time=0,seed=26){const t=Math.max(0,Math.min(SHELL_DURATION,time)),u=1-Math.exp(-t*18),asset=root.getObjectByName('FEIDS26_ROOT');if(asset?.userData.static)return u;
 for(let k=0;k<4;k++){const r=n=>randomFor(seed,k*7+n),n=root.getObjectByName('SHELL_QUADRANT_'+(k+1)),a=(k+.5)*Math.PI/2+(r(0)-.5)*.35,dist=u*(4+r(1)*3)+t*(8+r(2)*10);n.position.set(Math.cos(a)*dist,CENTER_Y+Math.sin(a)*dist,-u*(2+r(3)*3)-t*(7+r(4)*10));n.rotation.set((r(5)-.5)*(u*.8+t*3),(r(6)-.5)*(u*.8+t*3),(k%2?1:-1)*(u*.35+t*(.7+r(0)*2)));}root.updateMatrixWorld(true);return u;}
