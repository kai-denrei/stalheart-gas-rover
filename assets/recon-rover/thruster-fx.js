export const NOZZLE_IDS=[
  'V_FL','V_FR','V_RL','V_RR',
  'L_FL','L_FR','L_RL','L_RR'
];

function makeFallbackMistTexture(T){
  const size=64;
  const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++){
    const ny=(y-31.5)/31.5;
    for(let x=0;x<size;x++){
      const nx=(x-31.5)/31.5;
      const r2=nx*nx+ny*ny;
      const a=r2>=1?0:Math.round(Math.pow(1-r2,2.2)*255);
      const idx=(y*size+x)*4;
      data[idx]=238;
      data[idx+1]=250;
      data[idx+2]=255;
      data[idx+3]=a;
    }
  }
  const tex=new T.DataTexture(data,size,size,T.RGBAFormat);
  tex.needsUpdate=true;
  return tex;
}

/**
 * Reusable Three.js cold-gas mist particle system + optional ground dust ring.
 * Immediate ignition, pale short-lived nitrogen mist (0.18s–0.36s lifetime),
 * bounded particle pool, zero per-frame allocations, and per-nozzle intensity (0..1).
 */
export function createColdGasSystem(T,root,options={}){
  const maxPlume=Math.max(32,Math.min(640,options.maxPlumeParticles||320));
  const maxDust=Math.max(16,Math.min(256,options.maxDustParticles||96));
  const groundY=options.groundY??0;
  let enabled=options.enabled!==false;
  let dustEnabled=options.dust!==false;

  let spriteTex=options.texture||makeFallbackMistTexture(T);
  if(!options.texture&&typeof Image!=='undefined'&&options.textureUrl){
    const loader=new T.TextureLoader();
    loader.load(options.textureUrl,t=>{
      spriteTex=t;
      plumeMat.map=t;
      dustMat.map=t;
      plumeMat.needsUpdate=true;
      dustMat.needsUpdate=true;
    });
  }

  const group=new T.Group();
  group.name='R47X_COLD_GAS_FX_GROUP';

  // Bounded Plume Pool
  const plumePos=new Float32Array(maxPlume*3);
  const plumeCol=new Float32Array(maxPlume*3);
  const plumeVel=new Float32Array(maxPlume*3);
  const plumeAge=new Float32Array(maxPlume);
  const plumeLife=new Float32Array(maxPlume);
  for(let i=0;i<maxPlume;i++)plumeAge[i]=999;

  const plumeGeo=new T.BufferGeometry();
  plumeGeo.setAttribute('position',new T.BufferAttribute(plumePos,3));
  plumeGeo.setAttribute('color',new T.BufferAttribute(plumeCol,3));

  const plumeMat=new T.PointsMaterial({
    name:'COLD_GAS_MIST_POINTS_MAT',
    size:options.plumePointSize||0.26,
    map:spriteTex,
    vertexColors:true,
    transparent:true,
    opacity:0.62,
    depthWrite:false,
    blending:T.NormalBlending
  });
  const plumePoints=new T.Points(plumeGeo,plumeMat);
  plumePoints.name='COLD_GAS_MIST_POINTS';
  plumePoints.frustumCulled=false;
  group.add(plumePoints);

  // Bounded Ground Dust Pool (separate from nozzle mist plume)
  const dustPos=new Float32Array(maxDust*3);
  const dustCol=new Float32Array(maxDust*3);
  const dustVel=new Float32Array(maxDust*3);
  const dustAge=new Float32Array(maxDust);
  const dustLife=new Float32Array(maxDust);
  for(let i=0;i<maxDust;i++)dustAge[i]=999;

  const dustGeo=new T.BufferGeometry();
  dustGeo.setAttribute('position',new T.BufferAttribute(dustPos,3));
  dustGeo.setAttribute('color',new T.BufferAttribute(dustCol,3));

  const dustMat=new T.PointsMaterial({
    name:'COLD_GAS_GROUND_DUST_MAT',
    size:options.dustPointSize||0.34,
    map:spriteTex,
    vertexColors:true,
    transparent:true,
    opacity:0.38,
    depthWrite:false
  });
  const dustPoints=new T.Points(dustGeo,dustMat);
  dustPoints.name='COLD_GAS_GROUND_DUST';
  dustPoints.frustumCulled=false;
  group.add(dustPoints);

  let plumeCursor=0;
  let dustCursor=0;
  let prng=1337;
  const rand=()=>{
    prng=(prng*16807)%2147483647;
    return (prng-1)/2147483646;
  };

  const tmpOrigin=new T.Vector3();
  const tmpDir=new T.Vector3();
  const tmpRight=new T.Vector3();
  const tmpForward=new T.Vector3();

  function clearParticles(){
    for(let i=0;i<maxPlume;i++){
      plumeAge[i]=999;
      plumePos[i*3+1]=-999;
    }
    for(let i=0;i<maxDust;i++){
      dustAge[i]=999;
      dustPos[i*3+1]=-999;
    }
    plumeGeo.attributes.position.needsUpdate=true;
    dustGeo.attributes.position.needsUpdate=true;
  }

  function spawnPlumeParticle(origin,dir,intensity){
    const i=plumeCursor;
    plumeCursor=(plumeCursor+1)%maxPlume;
    plumeAge[i]=0;
    // Short-lived cold-gas mist: 0.16s to 0.34s
    plumeLife[i]=0.16+rand()*0.18*(0.5+0.5*intensity);

    // Build orthonormal tangent basis for slight cone spread
    if(Math.abs(dir.y)<0.9)tmpRight.set(0,1,0).cross(dir).normalize();
    else tmpRight.set(1,0,0).cross(dir).normalize();
    tmpForward.copy(dir).cross(tmpRight).normalize();

    const angle=rand()*Math.PI*2;
    const spread=(0.12+0.18*rand())*(0.65+0.35*intensity);
    const rx=Math.cos(angle)*spread;
    const rz=Math.sin(angle)*spread;

    const speed=(3.2+2.8*intensity)*(0.82+0.36*rand());
    const vx=(dir.x+tmpRight.x*rx+tmpForward.x*rz)*speed;
    const vy=(dir.y+tmpRight.y*rx+tmpForward.y*rz)*speed;
    const vz=(dir.z+tmpRight.z*rx+tmpForward.z*rz)*speed;

    // Immediate ignition at nozzle exit lip
    plumePos[i*3]=origin.x+dir.x*0.03;
    plumePos[i*3+1]=origin.y+dir.y*0.03;
    plumePos[i*3+2]=origin.z+dir.z*0.03;

    plumeVel[i*3]=vx;
    plumeVel[i*3+1]=vy;
    plumeVel[i*3+2]=vz;

    const b=0.88+0.12*intensity;
    plumeCol[i*3]=0.82*b;
    plumeCol[i*3+1]=0.95*b;
    plumeCol[i*3+2]=1.0*b;
  }

  function spawnDustParticle(hitX,hitZ,intensity){
    const i=dustCursor;
    dustCursor=(dustCursor+1)%maxDust;
    dustAge[i]=0;
    dustLife[i]=0.32+rand()*0.30;
    const a=rand()*Math.PI*2;
    const r=0.10+rand()*0.22;
    const spd=(0.9+1.4*intensity)*(0.7+0.6*rand());
    dustPos[i*3]=hitX+Math.cos(a)*r;
    dustPos[i*3+1]=groundY+0.04+rand()*0.05;
    dustPos[i*3+2]=hitZ+Math.sin(a)*r;
    dustVel[i*3]=Math.cos(a)*spd;
    dustVel[i*3+1]=0.18+rand()*0.25;
    dustVel[i*3+2]=Math.sin(a)*spd;
    dustCol[i*3]=0.58;
    dustCol[i*3+1]=0.64;
    dustCol[i*3+2]=0.68;
  }

  function step(dt=0.016,intensities={},targetRoot=root){
    group.visible=Boolean(enabled);
    dustPoints.visible=Boolean(enabled&&dustEnabled);
    if(!enabled){
      clearParticles();
      return {activePlumeCount:0,activeDustCount:0};
    }
    const clampedDt=Math.max(0.001,Math.min(0.08,dt));

    // 1. Spawn new mist particles at each active nozzle socket
    if(targetRoot){
      targetRoot.updateMatrixWorld(true);
      for(const id of NOZZLE_IDS){
        const thrust=Math.max(0,Math.min(1,Number(intensities[id]??0)));
        if(thrust<=0.01)continue;
        const sock=targetRoot.getObjectByName(`SOCKET_THRUSTER_${id}`);
        if(!sock)continue;
        sock.getWorldPosition(tmpOrigin);
        // Socket local -Y is the physical nozzle exhaust axis
        tmpDir.set(0,-1,0).transformDirection(sock.matrixWorld).normalize();

        const count=Math.max(1,Math.ceil(thrust*5));
        for(let k=0;k<count;k++){
          spawnPlumeParticle(tmpOrigin,tmpDir,thrust);
        }

        // Optional surface dust when exhaust ray points toward nearby ground
        if(dustEnabled&&tmpDir.y<-0.25){
          const distToGround=(tmpOrigin.y-groundY)/(-tmpDir.y);
          if(distToGround>0&&distToGround<2.4&&rand()<thrust*0.85){
            const hx=tmpOrigin.x+tmpDir.x*distToGround;
            const hz=tmpOrigin.z+tmpDir.z*distToGround;
            spawnDustParticle(hx,hz,thrust);
          }
        }
      }
    }

    // 2. Integrate & dissipate mist particles
    let activePlumeCount=0;
    const drag=Math.pow(0.18,clampedDt);
    for(let i=0;i<maxPlume;i++){
      if(plumeAge[i]>=plumeLife[i]){
        plumePos[i*3+1]=-999;
        continue;
      }
      plumeAge[i]+=clampedDt;
      if(plumeAge[i]>=plumeLife[i]){
        plumePos[i*3+1]=-999;
        continue;
      }
      activePlumeCount++;
      const lifeRatio=plumeAge[i]/plumeLife[i];
      plumeVel[i*3]*=drag;
      plumeVel[i*3+1]=plumeVel[i*3+1]*drag+0.35*clampedDt; // Slight buoyant mist curl
      plumeVel[i*3+2]*=drag;

      plumePos[i*3]+=plumeVel[i*3]*clampedDt;
      plumePos[i*3+1]=Math.max(groundY+0.02,plumePos[i*3+1]+plumeVel[i*3+1]*clampedDt);
      plumePos[i*3+2]+=plumeVel[i*3+2]*clampedDt;

      // Rapid pale dissipation tail
      const fade=Math.pow(1-lifeRatio,1.5);
      plumeCol[i*3]=0.80*fade;
      plumeCol[i*3+1]=0.93*fade;
      plumeCol[i*3+2]=1.00*fade;
    }

    // 3. Integrate ground dust particles
    let activeDustCount=0;
    for(let i=0;i<maxDust;i++){
      if(dustAge[i]>=dustLife[i]){
        dustPos[i*3+1]=-999;
        continue;
      }
      dustAge[i]+=clampedDt;
      if(dustAge[i]>=dustLife[i]){
        dustPos[i*3+1]=-999;
        continue;
      }
      activeDustCount++;
      const u=dustAge[i]/dustLife[i];
      dustVel[i*3]*=0.92;
      dustVel[i*3+1]*=0.90;
      dustVel[i*3+2]*=0.92;
      dustPos[i*3]+=dustVel[i*3]*clampedDt;
      dustPos[i*3+1]+=dustVel[i*3+1]*clampedDt;
      dustPos[i*3+2]+=dustVel[i*3+2]*clampedDt;
      const fade=(1-u)*0.65;
      dustCol[i*3]=0.55*fade;
      dustCol[i*3+1]=0.62*fade;
      dustCol[i*3+2]=0.66*fade;
    }

    plumeGeo.attributes.position.needsUpdate=true;
    plumeGeo.attributes.color.needsUpdate=true;
    dustGeo.attributes.position.needsUpdate=true;
    dustGeo.attributes.color.needsUpdate=true;
    return {activePlumeCount,activeDustCount};
  }

  return {
    group,
    maxPlumeParticles:maxPlume,
    maxDustParticles:maxDust,
    get enabled(){return enabled;},
    setEnabled(v){enabled=Boolean(v);if(!enabled)clearParticles();},
    get dustEnabled(){return dustEnabled;},
    setDustEnabled(v){dustEnabled=Boolean(v);},
    clear:clearParticles,
    step
  };
}

/**
 * Binds live procedural canvas textures (or headless material emissive states)
 * to the 4 UV-mapped onboard displays:
 *  - DISPLAY_SPEED_LEFT (orange speed on left rear wheel cover)
 *  - DISPLAY_THRUST_RIGHT (cyan vertical thrust on right rear wheel cover)
 *  - DISPLAY_GAS_RESERVE_REAR (N2 COPV gas reserve on rear panel)
 *  - DISPLAY_FDAI_TELEMETRY_PANEL (NASM Apollo FDAI-inspired codified yaw/pitch/roll rate & height/level cluster on rear black panel)
 */
export function createOnboardDisplays(T,root){
  const hasDOM=typeof document!=='undefined'&&typeof document.createElement==='function';

  function makeCanvasSlot(w,h){
    if(!hasDOM)return null;
    const canvas=document.createElement('canvas');
    canvas.width=w;
    canvas.height=h;
    const ctx=canvas.getContext('2d');
    const tex=new T.CanvasTexture(canvas);
    tex.colorSpace=T.SRGBColorSpace;
    return {canvas,ctx,tex};
  }

  const speedSlot=makeCanvasSlot(256,128);
  const thrustSlot=makeCanvasSlot(256,128);
  const gasSlot=makeCanvasSlot(384,128);
  const fdaiSlot=makeCanvasSlot(512,512);

  function bindSlot(meshName,slot,emissiveHex){
    const m=root?.getObjectByName(meshName);
    if(!m||!m.isMesh)return null;
    if(slot){
      m.material=m.material.clone();
      m.material.vertexColors=false;
      m.material.color.setHex(0xffffff);
      m.material.map=slot.tex;
      m.material.emissive.setHex(0xffffff);
      m.material.emissiveMap=slot.tex;
      m.material.emissiveIntensity=0.92;
      m.material.needsUpdate=true;
    }else{
      m.material.emissive.setHex(emissiveHex);
    }
    return m;
  }

  function attach(targetRoot=root){
    bindSlot('DISPLAY_SPEED_LEFT',speedSlot,0xff8a24);
    bindSlot('DISPLAY_THRUST_RIGHT',thrustSlot,0x38e8ff);
    bindSlot('DISPLAY_GAS_RESERVE_REAR',gasSlot,0x46f09a);
    bindSlot('DISPLAY_FDAI_TELEMETRY_PANEL',fdaiSlot,0xe6eef2);
  }
  if(root)attach(root);

  function update(telemetry={},targetRoot=root){
    const speed=Number(telemetry.speedMps??4.2);
    const maxSpeed=12.0;
    const speedNorm=Math.max(0,Math.min(1,Math.abs(speed)/maxSpeed));
    const thrustNorm=Math.max(0,Math.min(1,Number(telemetry.verticalThrust??0.0)));
    const gasReserve=Math.max(0,Math.min(1,Number(telemetry.gasReserve??0.84)));
    const heightM=Math.max(0,Number(telemetry.heightM??0.0));
    const yawRateDeg=Number(telemetry.yawRateDeg??0);
    const pitchRateDeg=Number(telemetry.pitchRateDeg??0);
    const rollRateDeg=Number(telemetry.rollRateDeg??0);
    const pitchDeg=Number(telemetry.pitchDeg??0);
    const rollDeg=Number(telemetry.rollDeg??0);
    const mastYawDeg=Number(telemetry.mastYawDeg??0);
    const mastPitchDeg=Number(telemetry.mastPitchDeg??0);

    if(targetRoot){
      const sMesh=targetRoot.getObjectByName('DISPLAY_SPEED_LEFT');
      if(sMesh?.isMesh&&!speedSlot)sMesh.material.emissiveIntensity=0.35+0.95*speedNorm;
      const tMesh=targetRoot.getObjectByName('DISPLAY_THRUST_RIGHT');
      if(tMesh?.isMesh&&!thrustSlot)tMesh.material.emissiveIntensity=0.35+1.15*thrustNorm;
      const gMesh=targetRoot.getObjectByName('DISPLAY_GAS_RESERVE_REAR');
      if(gMesh?.isMesh&&!gasSlot)gMesh.material.emissiveIntensity=0.35+0.85*gasReserve;
    }

    // 1. Orange Speed Display (Left Rear Wheel Cover)
    if(speedSlot){
      const {ctx,tex}=speedSlot;
      ctx.fillStyle='#0d1216';
      ctx.fillRect(0,0,256,128);
      ctx.strokeStyle='#ff8a24';
      ctx.lineWidth=3;
      ctx.strokeRect(6,6,244,116);
      ctx.fillStyle='#ff9d3b';
      ctx.font='bold 18px monospace';
      ctx.fillText('SPD / WHEEL VEL',16,28);
      ctx.font='bold 28px monospace';
      ctx.fillText(`${speed>=0?'+':''}${speed.toFixed(1)} m/s`,16,62);
      // Segmented bar
      const segs=12,active=Math.round(speedNorm*segs);
      for(let i=0;i<segs;i++){
        ctx.fillStyle=i<active?'#ff8a24':'#2a221b';
        ctx.fillRect(16+i*18.5,78,14,30);
      }
      tex.needsUpdate=true;
    }

    // 2. Cyan Vertical Thrust Display (Right Rear Wheel Cover)
    if(thrustSlot){
      const {ctx,tex}=thrustSlot;
      ctx.fillStyle='#0b141a';
      ctx.fillRect(0,0,256,128);
      ctx.strokeStyle='#38e8ff';
      ctx.lineWidth=3;
      ctx.strokeRect(6,6,244,116);
      ctx.fillStyle='#5ce8ff';
      ctx.font='bold 18px monospace';
      ctx.fillText('VERT THRUST / RCS',16,28);
      ctx.font='bold 28px monospace';
      ctx.fillText(`${Math.round(thrustNorm*100)}% LIFT`,16,62);
      const segs=12,active=Math.round(thrustNorm*segs);
      for(let i=0;i<segs;i++){
        ctx.fillStyle=i<active?'#38e8ff':'#162a33';
        ctx.fillRect(16+i*18.5,78,14,30);
      }
      tex.needsUpdate=true;
    }

    // 3. Rear Panel COPV Gas Reserve Display
    if(gasSlot){
      const {ctx,tex}=gasSlot;
      ctx.fillStyle='#0c1414';
      ctx.fillRect(0,0,384,128);
      ctx.strokeStyle='#46f09a';
      ctx.lineWidth=3;
      ctx.strokeRect(6,6,372,116);
      const psia=Math.round(gasReserve*3600);
      ctx.fillStyle='#72ffb8';
      ctx.font='bold 18px monospace';
      ctx.fillText(`N2 COPV RESERVE · ${psia} PSIA`,18,30);
      ctx.font='bold 26px monospace';
      ctx.fillText(`${Math.round(gasReserve*100)}%`,300,32);
      // Graduated Apollo-style edgewise scale
      ctx.strokeStyle='#88b8a0';
      ctx.lineWidth=2;
      for(let i=0;i<=10;i++){
        const x=20+i*34;
        ctx.beginPath();
        ctx.moveTo(x,52);
        ctx.lineTo(x,i%2===0?68:62);
        ctx.stroke();
      }
      ctx.fillStyle='#192b22';
      ctx.fillRect(20,74,340,30);
      ctx.fillStyle=gasReserve>0.25?'#46f09a':'#ff9d3b';
      ctx.fillRect(20,74,Math.round(340*gasReserve),30);
      tex.needsUpdate=true;
    }

    // 4. NASM Apollo FDAI-inspired Codified Attitude / Rate / Height Panel on Rear Black Panel
    if(fdaiSlot){
      const {ctx,tex}=fdaiSlot;
      ctx.fillStyle='#14181c';
      ctx.fillRect(0,0,512,512);
      // Outer metallic instrument frame
      ctx.strokeStyle='#6e7880';
      ctx.lineWidth=6;
      ctx.strokeRect(8,8,496,496);

      // Left column: Dual Apollo edgewise vertical ribbon gauges (ALT / HEIGHT & N2 PSIA LEVEL)
      const drawVerticalGauge=(gx,gy,gw,gh,label,unit,norm,barColor,valText)=>{
        ctx.fillStyle='#0c0f12';
        ctx.fillRect(gx,gy,gw,gh);
        ctx.strokeStyle='#7a848c';
        ctx.lineWidth=2;
        ctx.strokeRect(gx,gy,gw,gh);
        ctx.fillStyle='#d8e0e6';
        ctx.font='bold 13px monospace';
        ctx.fillText(label,gx+6,gy-8);
        ctx.font='11px monospace';
        ctx.fillText(unit,gx+8,gy+16);
        const top=gy+26,bot=gy+gh-18,span=bot-top;
        ctx.strokeStyle='#bbc4cc';
        for(let t=0;t<=10;t++){
          const y=bot-(t/10)*span;
          ctx.beginPath();
          ctx.moveTo(gx+10,y);
          ctx.lineTo(gx+(t%2===0?28:20),y);
          ctx.stroke();
        }
        const barH=Math.max(4,Math.min(1,norm)*span);
        ctx.fillStyle=barColor;
        ctx.fillRect(gx+gw-24,bot-barH,14,barH);
        // Horizontal pointer tick
        ctx.fillStyle='#ffd24c';
        ctx.fillRect(gx+26,bot-barH-2,gw-32,5);
        ctx.fillStyle='#e8f0f5';
        ctx.font='bold 12px monospace';
        ctx.fillText(valText,gx+6,gy+gh-3);
      };

      drawVerticalGauge(24,38,76,200,'HEIGHT','ALT m',Math.min(1,heightM/1.8),'#46f09a',`${heightM.toFixed(2)}m`);
      drawVerticalGauge(112,38,76,200,'RESERVE','PSIA',gasReserve,'#ffd24c',`${Math.round(gasReserve*100)}%`);

      // Top-right X-Y Radar / Mast Vector Cross-Pointer Scope (from NASM panel upper-right)
      const sx=214,sy=28,sw=268,sh=150;
      ctx.fillStyle='#dce4e8';
      ctx.fillRect(sx,sy,sw,sh);
      ctx.strokeStyle='#4e5860';
      ctx.lineWidth=4;
      ctx.strokeRect(sx,sy,sw,sh);
      ctx.strokeStyle='#353d44';
      ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(sx+sw/2,sy);ctx.lineTo(sx+sw/2,sy+sh);
      ctx.moveTo(sx,sy+sh/2);ctx.lineTo(sx+sw,sy+sh/2);
      ctx.stroke();
      // Live cross-pointer bars for sensor mast yaw/pitch
      const px=sx+sw/2+Math.max(-1,Math.min(1,mastYawDeg/90))*(sw*0.42);
      const py=sy+sh/2-Math.max(-1,Math.min(1,mastPitchDeg/38))*(sh*0.40);
      ctx.strokeStyle='#14181c';
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(px,sy+4);ctx.lineTo(px,sy+sh-4);
      ctx.moveTo(sx+4,py);ctx.lineTo(sx+sw-4,py);
      ctx.stroke();
      ctx.fillStyle='#1f262b';
      ctx.font='bold 12px monospace';
      ctx.fillText(`MAST Y:${Math.round(mastYawDeg)}° P:${Math.round(mastPitchDeg)}°`,sx+10,sy+sh-8);

      // Center-bottom Octagonal FDAI (ROLL RATE, PITCH RATE, YAW RATE + 8-ball horizon)
      const cx=276,cy=348,r=112;
      // Octagonal recessed bezel
      ctx.fillStyle='#0b0e11';
      ctx.beginPath();
      for(let i=0;i<8;i++){
        const a=(i+0.5)*Math.PI/4;
        const ox=cx+Math.cos(a)*(r+42);
        const oy=cy+Math.sin(a)*(r+42);
        if(i===0)ctx.moveTo(ox,oy);else ctx.lineTo(ox,oy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle='#7a848c';
      ctx.lineWidth=4;
      ctx.stroke();

      // Circular 8-ball split hemisphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.clip();
      ctx.translate(cx,cy);
      ctx.rotate((rollDeg*Math.PI)/180);
      const pitchShift=(pitchDeg/35)*r;
      ctx.fillStyle='#dde5ea';
      ctx.fillRect(-r*1.5,-r*1.5+pitchShift,r*3,r*1.5);
      ctx.fillStyle='#181d22';
      ctx.fillRect(-r*1.5,pitchShift,r*3,r*1.5);
      // Latitude & longitude grid lines
      ctx.strokeStyle='#606a72';
      ctx.lineWidth=1.5;
      for(let g=-3;g<=3;g++){
        ctx.beginPath();
        ctx.moveTo(-r,pitchShift+g*26);
        ctx.lineTo(r,pitchShift+g*26);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(g*26,-r);
        ctx.lineTo(g*26,r);
        ctx.stroke();
      }
      ctx.restore();

      // Gold FDAI attitude reference needles
      ctx.strokeStyle='#f0b840';
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(cx-r*0.75,cy);ctx.lineTo(cx+r*0.75,cy);
      ctx.moveTo(cx,cy-r*0.75);ctx.lineTo(cx,cy+r*0.75);
      ctx.stroke();

      // Top ROLL RATE scale
      const drawHorizRate=(y,label,rateDeg)=>{
        ctx.fillStyle='#e6eef2';
        ctx.font='bold 12px monospace';
        ctx.fillText(label,cx-38,y-10);
        ctx.strokeStyle='#d8e2e8';
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(cx-80,y);ctx.lineTo(cx+80,y);
        ctx.stroke();
        for(let t=-4;t<=4;t++){
          const tx=cx+t*20;
          ctx.beginPath();
          ctx.moveTo(tx,y-5);ctx.lineTo(tx,y+5);
          ctx.stroke();
        }
        const px=cx+Math.max(-1,Math.min(1,rateDeg/30))*76;
        ctx.fillStyle='#ffd24c';
        ctx.fillRect(px-3,y-8,6,16);
      };
      drawHorizRate(cy-r-18,'ROLL RATE',rollRateDeg);
      drawHorizRate(cy+r+26,'YAW RATE',yawRateDeg);

      // Right PITCH RATE vertical scale
      const rx=cx+r+20;
      ctx.strokeStyle='#d8e2e8';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(rx,cy-76);ctx.lineTo(rx,cy+76);
      ctx.stroke();
      for(let t=-4;t<=4;t++){
        const ty=cy+t*19;
        ctx.beginPath();
        ctx.moveTo(rx-5,ty);ctx.lineTo(rx+5,ty);
        ctx.stroke();
      }
      const ppy=cy-Math.max(-1,Math.min(1,pitchRateDeg/30))*72;
      ctx.fillStyle='#ffd24c';
      ctx.fillRect(rx-8,ppy-3,16,6);

      // Left lower telemetry summary box
      ctx.fillStyle='#0c1014';
      ctx.fillRect(24,258,110,224);
      ctx.strokeStyle='#5a6670';
      ctx.lineWidth=2;
      ctx.strokeRect(24,258,110,224);
      ctx.fillStyle='#9ad8ff';
      ctx.font='bold 12px monospace';
      ctx.fillText('RATE MON',34,280);
      ctx.fillStyle='#e6eef2';
      ctx.font='12px monospace';
      ctx.fillText(`YAW:${yawRateDeg.toFixed(1)}°/s`,32,310);
      ctx.fillText(`PIT:${pitchRateDeg.toFixed(1)}°/s`,32,336);
      ctx.fillText(`ROL:${rollRateDeg.toFixed(1)}°/s`,32,362);
      ctx.fillStyle='#ff9d3b';
      ctx.fillText(`SPD:${speed.toFixed(1)}m/s`,32,398);
      ctx.fillStyle='#38e8ff';
      ctx.fillText(`THR:${Math.round(thrustNorm*100)}%`,32,424);
      ctx.fillStyle='#46f09a';
      ctx.fillText(`ALT:${heightM.toFixed(2)}m`,32,450);

      tex.needsUpdate=true;
    }
  }

  return {attach,update};
}
