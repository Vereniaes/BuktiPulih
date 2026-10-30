// Todo:
// -> Animate model wind on either map renderer.
// -> Pause work during camera movement and hidden tabs.
"use client";
import { useEffect, useRef } from "react";
import type { ExplorerMapApi } from "@/types/explorer-map";
// --- Wind canvas ---
import type { WindPoint } from "@/services/api";
import { interpolateWind, pixelsPerMeter, windBounds, windColor, type WindSample } from "../hazards/wind-field";

export { windColor, windVector } from "../hazards/wind-field";

type Particle={x:number;y:number;px:number;py:number};
const GRID_STEP=24, MAX_DELTA=100, FRAME_MS=1000/30;

class WindCanvas {
  private map:ExplorerMapApi;
  private canvas!:HTMLCanvasElement;
  private context!:CanvasRenderingContext2D;
  private points:WindPoint[];
  private opacity:number;
  private grid:(WindSample|null)[]=[];
  private cells:{x:number;y:number}[]=[];
  private columns=0;
  private rows=0;
  private width=0;
  private height=0;
  private particles:Particle[]=[];
  private frame=0;
  private lastFrame=0;
  private lastDraw=0;
  private paused=false;
  private reduced=false;
  private dpr=1;
  private pixelScale=10;
  private bounds:ReturnType<typeof windBounds>;
  private motionQuery:MediaQueryList|null=null;
  private cleanupMap=()=>{};
  private timer=0;
  private viewKey="";
  private readonly onCamera=()=>{
    const key=JSON.stringify([this.map.getView(),this.map.getSize()]);if(key===this.viewKey)return;
    this.viewKey=key;this.stop();this.context.clearRect(0,0,this.width,this.height);clearTimeout(this.timer);this.timer=window.setTimeout(()=>this.rebuild(),100);
  };
  private readonly onVisibility=()=>document.hidden?this.stop():this.rebuild();
  private readonly onMotionPreference=()=>{this.reduced=this.motionQuery?.matches??false;if(this.reduced)this.stop();else this.rebuild();};

  constructor(map:ExplorerMapApi,canvas:HTMLCanvasElement,points:WindPoint[],opacity:number) {
    this.map=map;this.canvas=canvas;this.points=points;this.opacity=Math.max(0,Math.min(1,opacity));this.bounds=windBounds(points);
    const context=canvas.getContext("2d");if(!context)throw new Error("Wind canvas unavailable");this.context=context;
    this.canvas.style.opacity=String(this.opacity);
    this.motionQuery=window.matchMedia("(prefers-reduced-motion: reduce)");this.reduced=this.motionQuery.matches;
    this.motionQuery.addEventListener("change",this.onMotionPreference);
    this.cleanupMap=map.subscribe(this.onCamera);document.addEventListener("visibilitychange",this.onVisibility);
    this.rebuild();
  }
  remove() {
    this.stop();clearTimeout(this.timer);this.cleanupMap();document.removeEventListener("visibilitychange",this.onVisibility);
    this.motionQuery?.removeEventListener("change",this.onMotionPreference);this.grid=[];this.cells=[];this.particles=[];
  }
  setOpacity(opacity:number):this {
    this.opacity=Math.max(0,Math.min(1,opacity));if(this.canvas)this.canvas.style.opacity=String(this.opacity);return this;
  }

  private stop() {
    this.paused=true;if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.lastFrame=0;
  }

  private resize() {
    const size=this.map.getSize();this.width=size.width;this.height=size.height;this.dpr=Math.min(window.devicePixelRatio||1,1.5);
    this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);
    this.canvas.style.width=`${this.width}px`;this.canvas.style.height=`${this.height}px`;
    this.context.setTransform(this.dpr,0,0,this.dpr,0,0);
  }

  private rebuild() {
    if(!this.map||!this.canvas||document.hidden)return;
    this.paused=true;if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;
    this.resize();this.pixelScale=Math.min(14,Math.max(7,pixelsPerMeter(this.map.getView().zoom,this.map.getView().center[1])*90000));this.context.clearRect(0,0,this.width,this.height);
    if(!this.bounds||this.width===0||this.height===0){this.grid=[];this.cells=[];this.particles=[];return;}
    this.columns=Math.ceil(this.width/GRID_STEP)+1;this.rows=Math.ceil(this.height/GRID_STEP)+1;
    this.grid=new Array(this.columns*this.rows);
    for(let gy=0;gy<this.rows;gy++)for(let gx=0;gx<this.columns;gx++) {
      const point=this.map.unproject({x:gx*GRID_STEP,y:gy*GRID_STEP});
      const sample=interpolateWind(this.points,point[1],point[0]);
      const bearing=this.map.getView().bearing*Math.PI/180;
      this.grid[gy*this.columns+gx]=sample?{...sample,u:sample.u*Math.cos(bearing)-sample.v*Math.sin(bearing),v:sample.u*Math.sin(bearing)+sample.v*Math.cos(bearing)}:null;
    }
    const coarse=window.matchMedia("(pointer: coarse)").matches,count=coarse?180:400;
    this.cells=this.validCells();this.particles=[];
    for(let i=0;i<count&&this.cells.length;i++) {
      const cell=this.cells[Math.floor(Math.random()*this.cells.length)];
      const x=(cell.x+Math.random())*GRID_STEP,y=(cell.y+Math.random())*GRID_STEP;
      this.particles.push({x,y,px:x,py:y});
    }
    this.paused=this.reduced||!this.particles.length;
    if(!this.paused&&!document.hidden)this.frame=requestAnimationFrame(this.animate);
  }

  private validCells() {
    const cells:{x:number;y:number}[]=[];
    for(let y=0;y<this.rows-1;y++)for(let x=0;x<this.columns-1;x++) {
      const i=y*this.columns+x;
      if(this.grid[i]&&this.grid[i+1]&&this.grid[i+this.columns]&&this.grid[i+this.columns+1])cells.push({x,y});
    }
    return cells;
  }

  private sampleAt(x:number,y:number):WindSample|null {
    const gx=x/GRID_STEP,gy=y/GRID_STEP,ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy;
    if(ix<0||iy<0||ix>=this.columns-1||iy>=this.rows-1)return null;
    const i=iy*this.columns+ix,a=this.grid[i],b=this.grid[i+1],c=this.grid[i+this.columns],d=this.grid[i+this.columns+1];
    if(!a||!b||!c||!d)return null;
    const mix=(key:"u"|"v"|"speedKmh")=>{
      const top=a[key]*(1-fx)+b[key]*fx,bottom=c[key]*(1-fx)+d[key]*fx;return top*(1-fy)+bottom*fy;
    };
    return {u:mix("u"),v:mix("v"),speedKmh:mix("speedKmh")};
  }

  private animate=(now:number) => {
    if(this.paused||document.hidden)return;
    if(now-this.lastDraw<FRAME_MS){this.frame=requestAnimationFrame(this.animate);return;}
    const dt=Math.min(MAX_DELTA,this.lastFrame?now-this.lastFrame:FRAME_MS);this.lastDraw=now;this.lastFrame=now;
    const context=this.context;context.save();context.globalCompositeOperation="destination-out";context.fillStyle="rgba(0,0,0,0.12)";context.fillRect(0,0,this.width,this.height);context.restore();
    for(const particle of this.particles) {
      const sample=this.sampleAt(particle.x,particle.y);
      if(!sample||sample.speedKmh<=0.1){this.reset(particle);continue;}
      const scale=this.pixelScale;
      const nextX=particle.x+sample.u*scale*dt/1000,nextY=particle.y-sample.v*scale*dt/1000;
      if(!this.sampleAt(nextX,nextY)){this.reset(particle);continue;}
      particle.px=particle.x;particle.py=particle.y;particle.x=nextX;particle.y=nextY;
      context.beginPath();context.moveTo(particle.px,particle.py);context.lineTo(particle.x,particle.y);
      context.lineCap="round";context.strokeStyle="#193f3d";context.globalAlpha=0.28;context.lineWidth=2.4;context.stroke();
      context.strokeStyle=windColor(sample.speedKmh);context.globalAlpha=0.8;context.lineWidth=1.2;context.stroke();
    }
    context.globalAlpha=1;this.frame=requestAnimationFrame(this.animate);
  };

  private reset(particle:Particle) {
    if(!this.cells.length)return;
    const cell=this.cells[Math.floor(Math.random()*this.cells.length)];particle.x=(cell.x+Math.random())*GRID_STEP;particle.y=(cell.y+Math.random())*GRID_STEP;particle.px=particle.x;particle.py=particle.y;
  }
}

/** Paint wind only while the active camera is still. Input: model samples. Output: bounded display trails. */
export function MapWindLayer({api,points,opacity}:{api:ExplorerMapApi|null;points:WindPoint[];opacity:number}) {
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{if(!api||!canvas.current)return;const layer=new WindCanvas(api,canvas.current,points,opacity);return()=>layer.remove();},[api,points,opacity]);
  return <canvas ref={canvas} aria-hidden="true" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:1}}/>;
}
// --- end of Wind canvas ---
