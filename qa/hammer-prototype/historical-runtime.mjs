import {readFileSync}from'node:fs';import{createHash}from'node:crypto';
export const manifest=JSON.parse(readFileSync(new URL('./history/salt-closure.json',import.meta.url)));
export const historicalRoot=new URL('./history/'+manifest.directory+'/',import.meta.url);
export function verifyHistoricalRuntime(){for(const[p,want]of Object.entries(manifest.files)){const b=readFileSync(new URL(p,historicalRoot));if(createHash('sha256').update(b).digest('hex')!==want)throw Error('Historical Salt closure changed: '+p);}return manifest;}
