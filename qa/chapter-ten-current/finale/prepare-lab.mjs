/** Reconstructed wrapper; unchanged authoritative boss generator. */
import {cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareLab} from '../prepare-lab.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export async function prepareFinaleLab(destination){const output=await prepareLab(destination);await cp(path.join(here,'scenario.mjs'),path.join(output,'dist/finale-scenario.js'));return output;}
