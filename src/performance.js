// Bounded frame telemetry. GPU queries are polled asynchronously; never gl.finish/readPixels.
export class PerformanceMonitor {
 constructor(renderer){this.renderer=renderer;this.samples=[];this.gpuSamples=[];this.pending=[];this.gl=renderer.getContext();this.ext=renderer.capabilities.isWebGL2?this.gl.getExtension('EXT_disjoint_timer_query_webgl2'):null;this.longTasks=0;this.resizeCalls=0;this.lastPublish=0;this.result={fps:0,frame:0,p95:0,sim:0,render:0,hud:0,gpu:null};
  if(typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes?.includes('longtask')){this.observer=new PerformanceObserver(list=>{this.longTasks+=list.getEntries().length;});this.observer.observe({entryTypes:['longtask']});}
 }
 beginGpu(){if(!this.ext)return;const gl=this.gl;if(gl.getParameter(this.ext.GPU_DISJOINT_EXT)){for(const q of this.pending)gl.deleteQuery(q);this.pending.length=0;this.gpuSamples.length=0;return;}
  while(this.pending.length&&gl.getQueryParameter(this.pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=this.pending.shift(),ms=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;gl.deleteQuery(q);this.gpuSamples.push(ms);if(this.gpuSamples.length>90)this.gpuSamples.shift();}
  if(this.pending.length>=4)return;this.query=gl.createQuery();gl.beginQuery(this.ext.TIME_ELAPSED_EXT,this.query);
 }
 endGpu(){if(!this.query)return;this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);this.pending.push(this.query);this.query=null;}
 record(frame,sim,render,hud,steps){if(frame>250||frame<=0){this.samples.length=0;return;}this.samples.push({frame,sim,render,hud,steps});if(this.samples.length>120)this.samples.shift();const now=performance.now();if(now-this.lastPublish<250)return;this.lastPublish=now;const mean=key=>this.samples.reduce((s,v)=>s+v[key],0)/this.samples.length;const intervals=this.samples.map(s=>s.frame).sort((a,b)=>a-b);const gpu=this.gpuSamples.length?this.gpuSamples.reduce((a,b)=>a+b,0)/this.gpuSamples.length:null;
  this.result={fps:1000/mean('frame'),frame:mean('frame'),p95:intervals[Math.floor(intervals.length*.95)],sim:mean('sim'),render:mean('render'),hud:mean('hud'),steps:mean('steps'),gpu,longTasks:this.longTasks,resizes:this.resizeCalls,dpr:this.renderer.getPixelRatio(),resolution:[this.renderer.domElement.width,this.renderer.domElement.height],calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};
 }
 snapshot(){return {...this.result};}
}
