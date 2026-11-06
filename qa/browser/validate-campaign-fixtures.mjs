import {campaignFixture} from './campaign-fixtures.mjs';
for (const kind of ['victory','failure','protected']) {
  campaignFixture(kind);
  console.log('Validated campaign fixture: '+kind);
}
