import {createColdGasSystem,createOnboardDisplays,NOZZLE_IDS,LEAK_SOCKETS} from './thruster-fx.js';

export {createColdGasSystem,createOnboardDisplays,NOZZLE_IDS,LEAK_SOCKETS};
export const DURATION=16;

export const LIMITS={
  frontSteerDeg:[-34,34],
  auxSteerDeg:[-15,15],
  suspensionSwingDeg:[-16,14],
  suspensionTravelM:[-0.12,0.14],
  sensorYawDeg:[-180,180],
  sensorPitchDeg:[-38,28],
  ventralPitchDeg:[-28,28],
  ventralRollDeg:[-25,25],
  lateralLeftPitchDeg:[-35,35],
  lateralLeftRollDeg:[-42,18],
  lateralRightPitchDeg:[-35,35],
  lateralRightRollDeg:[-18,42]
};

export const ZONE_DEFS=[
  {id:'FRONT_BUMPER',label:'Front Bumper & Wedge Nose (+Z)',signedX:0,meshes:['ZONE_FRONT_BUMPER']},
  {id:'REAR_PANEL',label:'Rear Bulkhead & Payload Bay (-Z)',signedX:0,meshes:['ZONE_REAR_PANEL']},
  {id:'FLANK_NEG_X',label:'Left Flank (-X · Screen-Right from Rear)',signedX:-0.74,meshes:['ZONE_FLANK_NEG_X']},
  {id:'FLANK_POS_X',label:'Right Flank (+X · Screen-Left from Rear)',signedX:0.74,meshes:['ZONE_FLANK_POS_X']},
  {id:'SENSOR_MAST',label:'EO/IR + LiDAR Sensor Mast (+Y)',signedX:0,meshes:['SENSOR_MAST_HEAD']},
  {id:'WHEEL_FL',label:'Wheel & Suspension FL (-X · Screen-Right)',signedX:-0.98,meshes:['SUSP_ARM_FL','WHEEL_FL','DAMPER_BARREL_FL','DAMPER_ROD_FL']},
  {id:'WHEEL_FR',label:'Wheel & Suspension FR (+X · Screen-Left)',signedX:0.98,meshes:['SUSP_ARM_FR','WHEEL_FR','DAMPER_BARREL_FR','DAMPER_ROD_FR']},
  {id:'WHEEL_ML',label:'Wheel & Suspension ML (-X · Screen-Right)',signedX:-0.98,meshes:['SUSP_ARM_ML','WHEEL_ML','DAMPER_BARREL_ML','DAMPER_ROD_ML']},
  {id:'WHEEL_MR',label:'Wheel & Suspension MR (+X · Screen-Left)',signedX:0.98,meshes:['SUSP_ARM_MR','WHEEL_MR','DAMPER_BARREL_MR','DAMPER_ROD_MR']},
  {id:'WHEEL_RL',label:'Wheel & Suspension RL (-X · Screen-Right)',signedX:-0.98,meshes:['SUSP_ARM_RL','WHEEL_RL','DAMPER_BARREL_RL','DAMPER_ROD_RL']},
  {id:'WHEEL_RR',label:'Wheel & Suspension RR (+X · Screen-Left)',signedX:0.98,meshes:['SUSP_ARM_RR','WHEEL_RR','DAMPER_BARREL_RR','DAMPER_ROD_RR']},
  {id:'NOZZLE_V_FL',label:'Ventral Nozzle V_FL (-X)',signedX:-0.48,meshes:['THRUSTER_V_FL']},
  {id:'NOZZLE_V_FR',label:'Ventral Nozzle V_FR (+X)',signedX:0.48,meshes:['THRUSTER_V_FR']},
  {id:'NOZZLE_V_RL',label:'Ventral Nozzle V_RL (-X)',signedX:-0.48,meshes:['THRUSTER_V_RL']},
  {id:'NOZZLE_V_RR',label:'Ventral Nozzle V_RR (+X)',signedX:0.48,meshes:['THRUSTER_V_RR']},
  {id:'NOZZLE_L_FL',label:'Lateral Nozzle L_FL (-X)',signedX:-0.80,meshes:['THRUSTER_L_FL']},
  {id:'NOZZLE_L_FR',label:'Lateral Nozzle L_FR (+X)',signedX:0.80,meshes:['THRUSTER_L_FR']},
  {id:'NOZZLE_L_RL',label:'Lateral Nozzle L_RL (-X)',signedX:-0.80,meshes:['THRUSTER_L_RL']},
  {id:'NOZZLE_L_RR',label:'Lateral Nozzle L_RR (+X)',signedX:0.80,meshes:['THRUSTER_L_RR']}
];

export const DEBRIS_MAP=[
  {id:'DEBRIS_FRONT_BEAK',zone:'FRONT_BUMPER',minDamage:2},
  {id:'DEBRIS_FLANK_NEG_X',zone:'FLANK_NEG_X',minDamage:2},
  {id:'DEBRIS_WHEEL_RIM_FL',zone:'WHEEL_FL',minDamage:2},
  {id:'DEBRIS_SENSOR_VISOR',zone:'SENSOR_MAST',minDamage:2},
  {id:'DEBRIS_NOZZLE_BELL',zone:'NOZZLE_L_FL',minDamage:3}
];

export function buildPresetZoneStates(preset='d0'){
  const s={};
  for(const z of ZONE_DEFS)s[z.id]=0;
  if(preset==='d1'||preset==='d1_battered'){
    for(const z of ZONE_DEFS)s[z.id]=1;
  }else if(preset==='d2'||preset==='d2_component'){
    for(const z of ZONE_DEFS)s[z.id]=2;
  }else if(preset==='d3'||preset==='d3_wreck'){
    for(const z of ZONE_DEFS)s[z.id]=3;
  }else if(preset==='front_left_impact'){
    // Localized front-left (-X, screen-right from rear chase camera) impact
    s.FRONT_BUMPER=2;
    s.WHEEL_FL=3;
    s.NOZZLE_V_FL=2;
    s.NOZZLE_L_FL=2;
    s.FLANK_NEG_X=1;
    s.SENSOR_MAST=1;
  }else if(preset==='flank_gas_leak'){
    // Localized -X flank COPV breach & middle-left wheel hit
    s.FLANK_NEG_X=2;
    s.WHEEL_ML=2;
    s.NOZZLE_L_FL=2;
    s.NOZZLE_L_RL=3;
    s.SENSOR_MAST=2;
  }else if(preset==='rear_shunt'){
    s.REAR_PANEL=2;
    s.WHEEL_RL=2;
    s.WHEEL_RR=1;
    s.NOZZLE_V_RL=3;
    s.NOZZLE_V_RR=2;
  }
  return s;
}

/**
 * Swaps damaged/intact zone geometries in-place from a preloaded D0..D3 scene bank
 * without reloading GLBs or leaking BufferGeometry / Material instances.
 */
export function applyLocalizedDamage(root,variantBank,zoneStates={},options={}){
  if(!root||!variantBank)return;
  const showDebris=options.showDebris!==false;

  for(const z of ZONE_DEFS){
    const d=Math.max(0,Math.min(3,Number(zoneStates[z.id]??0)));
    const donorScene=variantBank[d]||variantBank[0];
    if(!donorScene)continue;
    for(const mName of z.meshes){
      const targetMesh=root.getObjectByName(mName);
      const donorMesh=donorScene.getObjectByName(mName);
      if(targetMesh?.isMesh&&donorMesh?.isMesh&&targetMesh.geometry!==donorMesh.geometry){
        targetMesh.geometry=donorMesh.geometry;
      }
    }
  }

  // Update core chassis & crack overlay from highest hull damage
  const maxZoneDmg=Math.max(
    0,
    ...ZONE_DEFS.map(z=>Math.max(0,Math.min(3,Number(zoneStates[z.id]??0))))
  );
  const hullDonor=variantBank[maxZoneDmg]||variantBank[0];
  if(hullDonor){
    for(const mName of ['CHASSIS_ARMOR_BODY','DISPLAY_CRACK_OVERLAY']){
      const targetMesh=root.getObjectByName(mName);
      const donorMesh=hullDonor.getObjectByName(mName);
      if(targetMesh?.isMesh&&donorMesh?.isMesh&&targetMesh.geometry!==donorMesh.geometry){
        targetMesh.geometry=donorMesh.geometry;
      }
      if(mName==='DISPLAY_CRACK_OVERLAY'&&targetMesh?.isMesh){
        targetMesh.visible=maxZoneDmg>0;
      }
    }
  }

  // Update detachable debris fragments visibility & geometry
  for(const deb of DEBRIS_MAP){
    const zd=Math.max(0,Math.min(3,Number(zoneStates[deb.zone]??0)));
    const detached=showDebris&&zd>=deb.minDamage;
    const dm=root.getObjectByName(deb.id);
    const donorScene=variantBank[Math.max(deb.minDamage,zd)]||variantBank[3];
    const donorMesh=donorScene?.getObjectByName(deb.id);
    if(dm?.isMesh){
      if(donorMesh?.isMesh&&dm.geometry!==donorMesh.geometry){
        dm.geometry=donorMesh.geometry;
      }
      dm.visible=detached;
    }
  }
}

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const deg2rad=d=>(d*Math.PI)/180;
const rad2deg=r=>(r*180)/Math.PI;

export function roverState(time,options={}){
  const {
    thrusters=true,
    jump=false,
    speedMps=4.2,
    steerDeg=null,
    suspBiasM=0,
    gimbalPitchDeg=0,
    gimbalRollDeg=0,
    nozzlePreset='auto',
    nozzleOverrides=null,
    mastYawDeg=null,
    mastPitchDeg=null,
    damageLevel=0,
    zoneStates=null,
    gasLeak=true,
    leakIntensity=0.75
  }=options;

  const getZoneDmg=id=>zoneStates&&zoneStates[id]!==undefined?Number(zoneStates[id]):Number(damageLevel);
  const maxDmg=Math.max(Number(damageLevel),...ZONE_DEFS.map(z=>getZoneDmg(z.id)));
  const allWreck=ZONE_DEFS.every(z=>getZoneDmg(z.id)>=3)||Number(damageLevel)===3;

  const t=(((time)%DURATION)+DURATION)%DURATION;
  const u=t/DURATION;

  // 1. Wheel spin & Ackermann front steering (degraded per-wheel in D2, disabled in D3)
  const autoSteerDeg=26*Math.sin(u*Math.PI*4);
  const cmdSteerDeg=clamp(steerDeg!==null?Number(steerDeg):autoSteerDeg,-34,34);

  const flDmg=getZoneDmg('WHEEL_FL');
  const frDmg=getZoneDmg('WHEEL_FR');
  const flLimit=flDmg<=1?34:flDmg===2?17:0;
  const frLimit=frDmg<=1?34:frDmg===2?17:0;

  const steerFLDeg=flDmg>=3?0:clamp(cmdSteerDeg>0?cmdSteerDeg*1.08:cmdSteerDeg*0.92,-flLimit,flLimit);
  const steerFRDeg=frDmg>=3?0:clamp(cmdSteerDeg<0?cmdSteerDeg*1.08:cmdSteerDeg*0.92,-frLimit,frLimit);

  const wheelRadius=0.48;
  const effSpeed=allWreck?0:speedMps;
  const omega=effSpeed/wheelRadius;
  const baseSpin=omega*t;
  const turnDiff=(cmdSteerDeg/34)*0.18;

  const wheelSpin={};
  for(const id of ['FL','FR','ML','MR','RL','RR']){
    const wd=getZoneDmg(`WHEEL_${id}`);
    const eff=wd===0?1.0:wd===1?0.96:wd===2?0.45:0.0;
    const sideSign=id.endsWith('L')?-1:1;
    const rankScale=id.startsWith('F')?1:id.startsWith('M')?0.85:0.75;
    wheelSpin[id]=baseSpin*(1+sideSign*turnDiff*rankScale)*eff;
  }

  // 2. Per-wheel independent suspension articulation
  const wave=(phase)=>allWreck?0:(0.045*Math.sin(u*Math.PI*6+phase)+Number(suspBiasM||0));
  let crouchM=0;
  let hopHeightM=0;
  let chassisPitch=allWreck?-0.08:0;
  let chassisRoll=allWreck?-0.11:0;
  let phase=allWreck
    ?'D3 disabled wreck — collapsed axle & propulsion offline'
    :'Grounded 6x6 drive, Ackermann steering & continuous 360° sensor scan';

  if(!allWreck){
    if(t>=2.5&&t<4.2){
      const s=Math.sin(((t-2.5)/1.7)*Math.PI);
      phase='Pre-burst suspension compression & 8-nozzle individual gimbal sweep';
      crouchM=0.07*s;
    }else if(t>=4.2&&t<9.6){
      const bu=(t-4.2)/5.4;
      const arc=Math.sin(bu*Math.PI);
      phase=bu<0.38
        ?'Ventral + lateral cold-gas ignition — upward & lateral thrust vectoring'
        :bu<0.74
          ?'Differential lateral nozzle trim & attitude rate stabilization'
          :'Retro-burn descent & suspension preparation';
      hopHeightM=1.42*Math.pow(arc,0.82);
      crouchM=-0.08*arc;
      chassisPitch=0.10*Math.cos(bu*Math.PI*2);
      chassisRoll=0.07*Math.sin(bu*Math.PI*2);
    }else if(t>=9.6&&t<11.6){
      const du=(t-9.6)/2.0;
      const damp=Math.sin(du*Math.PI)*Math.exp(-du*2.2);
      phase='Touchdown hydraulic shock absorption & COPV pressure stabilization';
      crouchM=0.09*damp;
      chassisPitch=-0.05*damp;
    }
  }

  const phases={FL:0.0,FR:1.1,ML:2.1,MR:3.2,RL:4.2,RR:5.3};
  const suspTravelM={};
  const suspSwingRad={};
  const armLength=0.50;
  for(const id of ['FL','FR','ML','MR','RL','RR']){
    const wd=getZoneDmg(`WHEEL_${id}`);
    const scale=wd<=1?1.0:wd===2?0.40:0.0;
    const collapseBias=wd===3?0.11:wd===2?0.04:0;
    suspTravelM[id]=clamp((wave(phases[id])+crouchM)*scale+collapseBias,-0.12,0.14);
    const side=id.endsWith('L')?-1:1;
    suspSwingRad[id]=-side*Math.asin(clamp(suspTravelM[id]/armLength,-0.28,0.28));
  }

  // 3. Top EO/IR + LiDAR sensor mast (D2 limits sector; D3 droops offline)
  const mastDmg=getZoneDmg('SENSOR_MAST');
  let rawYawDeg=mastYawDeg!==null?Number(mastYawDeg):((u*360*2)%360)-180;
  let rawPitchDeg=mastPitchDeg!==null?Number(mastPitchDeg):-6+24*Math.sin(u*Math.PI*6);
  if(mastDmg===2){
    rawYawDeg=clamp(rawYawDeg,-75,75);
    rawPitchDeg=clamp(rawPitchDeg,-15,12);
  }else if(mastDmg>=3){
    rawYawDeg=24;
    rawPitchDeg=26;
  }
  const clampedPitchDeg=clamp(rawPitchDeg,-38,28);
  const mastYaw=deg2rad(rawYawDeg);
  const opticsPitch=deg2rad(clampedPitchDeg);

  // 4. Individual 8-nozzle gimbal angles & per-nozzle thrust intensities (degraded in D2, 0 in D3)
  const gimbals={};
  const nozzleIntensities={};
  const basePitch=Number(gimbalPitchDeg||0);
  const baseRoll=Number(gimbalRollDeg||0);

  for(let i=0;i<NOZZLE_IDS.length;i++){
    const id=NOZZLE_IDS[i];
    const nd=getZoneDmg(`NOZZLE_${id}`);
    const isVentral=id.startsWith('V_');
    const isLeft=id.endsWith('L');
    const isFront=id.includes('_F');
    const phaseShift=i*0.75;

    const rangeScale=nd<=1?1.0:nd===2?0.35:0.0;
    const thrustScale=nd===0?1.0:nd===1?0.92:nd===2?0.48:0.0;

    const dynPitch=(isFront?1:-1)*14*Math.sin(u*Math.PI*4+phaseShift)*rangeScale;
    const dynRoll=(isLeft?-1:1)*12*Math.cos(u*Math.PI*4+phaseShift)*rangeScale;

    const pLim=isVentral?LIMITS.ventralPitchDeg:LIMITS.lateralLeftPitchDeg;
    const rLim=isVentral
      ?LIMITS.ventralRollDeg
      :(isLeft?LIMITS.lateralLeftRollDeg:LIMITS.lateralRightRollDeg);

    const pDeg=clamp(basePitch*rangeScale+dynPitch,pLim[0],pLim[1]);
    const rDeg=clamp(baseRoll*rangeScale+dynRoll,rLim[0],rLim[1]);
    gimbals[id]={
      pitchRad:deg2rad(pDeg),
      rollRad:deg2rad(rDeg),
      pitchDeg:pDeg,
      rollDeg:rDeg,
      damageLevel:nd,
      functional:nd<3
    };

    let val=0;
    if(thrusters&&nd<3){
      if(nozzleOverrides&&nozzleOverrides[id]!==undefined){
        val=clamp(Number(nozzleOverrides[id]),0,1);
      }else if(nozzlePreset==='all'){
        val=0.92;
      }else if(nozzlePreset==='ventral'){
        val=isVentral?0.95:0;
      }else if(nozzlePreset==='lateral_left'){
        val=(!isVentral&&isLeft)?0.95:(isVentral&&isLeft?0.35:0);
      }else if(nozzlePreset==='lateral_right'){
        val=(!isVentral&&!isLeft)?0.95:(isVentral&&!isLeft?0.35:0);
      }else if(nozzlePreset==='pitch_trim'){
        val=isFront?0.92:0.18;
      }else{
        if(t>=2.5&&t<4.2){
          val=((i%2===0)?0.55:0.25)*Math.sin(((t-2.5)/1.7)*Math.PI);
        }else if(t>=4.2&&t<9.6){
          const bu=(t-4.2)/5.4;
          if(bu<0.38)val=isVentral?0.95:0.75;
          else if(bu<0.72)val=isVentral?0.35:(isLeft?(0.5+0.4*Math.sin(t*6)):(0.5-0.4*Math.sin(t*6)));
          else val=isVentral?0.88:0.45;
        }else if(t>=9.6&&t<10.5){
          val=isVentral?0.35*(1-(t-9.6)/0.9):0;
        }else{
          const puff=Math.sin(t*3.2+i*1.7);
          val=puff>0.82?(puff-0.82)*3.2:0;
        }
      }
    }
    nozzleIntensities[id]=+clamp(val*thrustScale,0,1).toFixed(3);
  }

  // 5. Optional D2 Cold-Gas Leak intensities on ruptured COPV manifolds
  const leakIntensities={NEG_X:0,POS_X:0,REAR:0};
  const leakOn=options.leakEnabled!==undefined?Boolean(options.leakEnabled):Boolean(gasLeak);
  if(leakOn){
    const baseLeak=clamp(Number(leakIntensity??0.75),0,1);
    const pulse=0.72+0.28*Math.sin(t*9.5);
    if(getZoneDmg('FLANK_NEG_X')===2||getZoneDmg('NOZZLE_L_FL')===2||getZoneDmg('NOZZLE_L_RL')===2){
      leakIntensities.NEG_X=+(baseLeak*pulse).toFixed(3);
    }
    if(getZoneDmg('FLANK_POS_X')===2||getZoneDmg('NOZZLE_L_FR')===2||getZoneDmg('NOZZLE_L_RR')===2){
      leakIntensities.POS_X=+(baseLeak*pulse).toFixed(3);
    }
    if(getZoneDmg('REAR_PANEL')===2||getZoneDmg('NOZZLE_V_RL')===2||getZoneDmg('NOZZLE_V_RR')===2){
      leakIntensities.REAR=+(baseLeak*0.65*pulse).toFixed(3);
    }
  }

  const meanThrust=NOZZLE_IDS.reduce((acc,k)=>acc+nozzleIntensities[k],0)/NOZZLE_IDS.length;
  const wreckDrop=allWreck?-0.11:0;
  const chassisY=0.56+wreckDrop+(jump&&!allWreck?hopHeightM-crouchM:0);
  const gasReserve=allWreck?0.04:clamp((maxDmg>=2?0.58:0.92)-0.18*(t/DURATION),0.08,1.0);

  const yawRateDeg=allWreck?0:(cmdSteerDeg*0.65+12*Math.cos(u*Math.PI*4));
  const pitchRateDeg=allWreck?0:((nozzleIntensities.V_FL+nozzleIntensities.V_FR-nozzleIntensities.V_RL-nozzleIntensities.V_RR)*18+8*Math.sin(u*Math.PI*4));
  const rollRateDeg=allWreck?0:((nozzleIntensities.L_FL+nozzleIntensities.L_RL-nozzleIntensities.L_FR-nozzleIntensities.L_RR)*22+10*Math.cos(u*Math.PI*6));

  return {
    time:t,
    phase,
    damageLevel:maxDmg,
    thrusters:Boolean(thrusters),
    jump:Boolean(jump&&!allWreck),
    airborne:Boolean(jump&&!allWreck&&t>=4.2&&t<9.6),
    speedMps:effSpeed,
    steerDeg:cmdSteerDeg,
    steerFLRad:deg2rad(steerFLDeg),
    steerFRRad:deg2rad(steerFRDeg),
    wheelSpin,
    suspTravelM,
    suspSwingRad,
    chassisY,
    chassisPitch:allWreck?chassisPitch:(jump?chassisPitch:0),
    chassisRoll:allWreck?chassisRoll:(jump?chassisRoll:0),
    chassisZ:0,
    mastYaw,
    opticsPitch,
    mastYawDeg:rawYawDeg,
    mastPitchDeg:clampedPitchDeg,
    gimbals,
    nozzleIntensities,
    leakIntensities,
    plumeIntensity:meanThrust,
    telemetry:{
      damageLevel:maxDmg,
      statusText:phase,
      speedMps:effSpeed,
      verticalThrust:meanThrust,
      thrustPct:Math.round(meanThrust*100),
      gasReserve,
      heightM:jump&&!allWreck?hopHeightM:0,
      yawRateDeg,
      pitchRateDeg,
      rollRateDeg,
      pitchDeg:rad2deg(chassisPitch)+clampedPitchDeg*0.25,
      rollDeg:rad2deg(chassisRoll)+cmdSteerDeg*0.35,
      mastYawDeg:rawYawDeg,
      mastPitchDeg:clampedPitchDeg
    }
  };
}

export function applyRover(root,time,lod=1,options={}){
  const s=roverState(time,options);
  if(!root)return s;
  if(lod<2){
    const chassis=root.getObjectByName('ROVER_CHASSIS_JUMP');
    if(chassis){
      chassis.position.set(0,s.chassisY,s.chassisZ);
      chassis.rotation.set(s.chassisPitch,0,s.chassisRoll);
    }

    for(const id of ['FL','FR','ML','MR','RL','RR']){
      const sp=root.getObjectByName(`SUSP_PIVOT_${id}`);
      if(sp){
        sp.rotation.set(0,0,s.suspSwingRad[id]);
      }
      const steer=root.getObjectByName(`WHEEL_STEER_${id}`);
      if(steer){
        if(id==='FL')steer.rotation.set(0,s.steerFLRad,0);
        else if(id==='FR')steer.rotation.set(0,s.steerFRRad,0);
        else steer.rotation.set(0,0,0);
      }
      const spin=root.getObjectByName(`WHEEL_SPIN_${id}`);
      if(spin){
        spin.rotation.set(s.wheelSpin[id],0,0);
      }
    }

    const mast=root.getObjectByName('SENSOR_MAST_YAW');
    if(mast)mast.rotation.set(0,s.mastYaw,0);
    const optics=root.getObjectByName('OPTICS_HEAD_PITCH');
    if(optics)optics.rotation.set(s.opticsPitch,0,0);

    for(const id of NOZZLE_IDS){
      const g=root.getObjectByName(`GIMBAL_${id}`);
      const state=s.gimbals[id];
      if(g&&state){
        g.rotation.set(state.pitchRad,0,state.rollRad);
      }
    }
  }
  if(lod<2)solveDampers(root);
  return {...s,phase:lod===2?'Static distance pose':s.phase};
}

// XB-12-style endpoint solver. Translate the piston; never stretch its diameter.
export function solveDampers(root){
  root.updateMatrixWorld(true);
  for(const id of ['FL','FR','ML','MR','RL','RR']){
    const upper=root.getObjectByName(`SOCKET_DAMPER_UPPER_${id}`);
    const lower=root.getObjectByName(`SOCKET_DAMPER_LOWER_${id}`);
    const aim=root.getObjectByName(`DAMPER_AIM_${id}`);
    const rod=root.getObjectByName(`DAMPER_ROD_SLIDE_${id}`);
    if(!upper||!lower||!aim||!rod)continue;
    const top=aim.parent.worldToLocal(upper.getWorldPosition(upper.position.clone()));
    const bottom=aim.parent.worldToLocal(lower.getWorldPosition(lower.position.clone()));
    const delta=bottom.sub(top),length=delta.length();
    aim.position.copy(top);aim.quaternion.setFromUnitVectors(aim.up,delta.normalize());
    rod.position.y=length;
  }
  root.updateMatrixWorld(true);
}
