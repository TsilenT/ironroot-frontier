import test from 'node:test';
import assert from 'node:assert/strict';
import {trainingVisualPreferences} from '../dist/training-app.js';

test('entry handoff applies both visual choices, including explicit full motion',()=>{
  assert.deepEqual(trainingVisualPreferences('#motion=reduce&detail=low'),{reducedMotion:true,quality:'low'});
  assert.deepEqual(trainingVisualPreferences('#motion=full&detail=high',{reducedMotion:true,quality:'low'}),{reducedMotion:false,quality:'high'});
});

test('direct entry retains the operating-system motion default without profile access',()=>{
  assert.deepEqual(trainingVisualPreferences('',{reducedMotion:true}),{reducedMotion:true,quality:'high'});
  assert.deepEqual(trainingVisualPreferences('#practice'),{reducedMotion:false,quality:'high'});
  assert.deepEqual(trainingVisualPreferences(null,{reducedMotion:true}),{reducedMotion:true,quality:'high'});
});

test('malformed and duplicate fields fall back independently to safe renderer defaults',()=>{
  for(const fragment of ['#motion=0&detail=ultra','#motion=full&motion=reduce&detail=low&detail=high','#motion=&detail='])
    assert.deepEqual(trainingVisualPreferences(fragment,{reducedMotion:true}),{reducedMotion:true,quality:'high'});
  assert.deepEqual(trainingVisualPreferences('#motion=wrong&detail=low',{reducedMotion:true}),{reducedMotion:true,quality:'low'});
  assert.deepEqual(trainingVisualPreferences('#motion=reduce&detail=wrong'),{reducedMotion:true,quality:'high'});
});

test('unknown fields cannot add profile or renderer state and defaults are not mutated',()=>{
  const defaults={reducedMotion:true,quality:'low'};
  const visual=trainingVisualPreferences('#lesson=5&gold=9999&__proto__=x',defaults);
  assert.deepEqual(visual,{reducedMotion:true,quality:'low'});
  assert.deepEqual(defaults,{reducedMotion:true,quality:'low'});
  assert.notEqual(visual,defaults);
});
