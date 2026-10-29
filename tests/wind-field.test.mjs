import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
async function module(path){const text=ts.transpileModule(readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;return import(`data:text/javascript;base64,${Buffer.from(text).toString("base64")}`);}
const {windColor,windVector,interpolateWind}=await module("../src/components/hazards/wind-field.ts");
const points=[
 {id:"nw",coordinates:[5,95],speed_kmh:36,direction_deg:270,observed_at:""},
 {id:"ne",coordinates:[5,105],speed_kmh:36,direction_deg:270,observed_at:""},
 {id:"sw",coordinates:[-5,95],speed_kmh:36,direction_deg:270,observed_at:""},
 {id:"se",coordinates:[-5,105],speed_kmh:36,direction_deg:270,observed_at:""},
 {id:"far",coordinates:[-10,140],speed_kmh:8,direction_deg:0,observed_at:""},
];

test("wind vector uses m/s components pointing downwind",()=>{
 assert.ok(Math.abs(windVector(0,36).u)<1e-10);assert.equal(windVector(0,36).v,-10);
 assert.equal(windVector(90,36).u,-10);assert.ok(Math.abs(windVector(90,36).v)<1e-10);
 assert.ok(Math.abs(windVector(270,36).u-10)<1e-10);
 assert.deepEqual(windVector(90,0),{u:-0,v:-0});
});

test("wind colors follow speed thresholds in km/h",()=>{
 assert.equal(windColor(0),"#47d7c5");assert.equal(windColor(7.2),"#47d7c5");
 assert.equal(windColor(14.4),"#d4e650");assert.equal(windColor(21.6),"#ff9d43");assert.equal(windColor(28.8),"#f67948");assert.equal(windColor(36),"#ed554d");
});

test("interpolation uses nearby samples and stays inside the sampled bounds",()=>{
 const sample=interpolateWind(points,0,100);assert.ok(sample);assert.ok(Math.abs(sample.u-10)<1e-8);assert.ok(Math.abs(sample.v)<1e-8);
 assert.equal(sample.speedKmh,36);assert.equal(interpolateWind(points,6,100),null);assert.equal(interpolateWind(points,0,141),null);
 assert.equal(interpolateWind([],0,100),null);
});

