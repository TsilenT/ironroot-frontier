import {ROUTES,playOneSignal} from './one-signal-policies.mjs';
for(const route of Object.keys(ROUTES))for(const seed of [6201,123,719,51017])console.log(JSON.stringify(playOneSignal({route,seed,restore:process.argv.includes('--restore')&&seed===719}).summary));
