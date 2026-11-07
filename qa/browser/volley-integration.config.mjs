// Same browser/input defaults; exercise merged restart routes at the shortest
// supported portrait size. Use only the explicitly selected integration slice.
import config from './playwright.config.mjs';
export default {
  ...config,
  projects:config.projects.map(project => project.name === 'narrow-phone'
    ? {...project,use:{...project.use,viewport:{width:320,height:430}}}
    : project),
};
