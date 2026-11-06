import { BUILDINGS, buildSites } from './engine.js';
import { currentIncome } from './campaign.js';

// Presentation only: no technology locks or new fields in campaign/battle saves.
const INTRODUCED = {
  emberwatch: ['barracks', 'archery'],
  'three-roads': ['barracks', 'archery', 'watchtower'],
  'winter-stores': ['barracks', 'archery', 'watchtower', 'mint'],
  'wings-of-ash': ['barracks', 'archery', 'watchtower', 'mint'],
  stonegate: ['barracks', 'archery', 'watchtower', 'mint', 'foundry'],
  'long-vigil': ['barracks', 'archery', 'watchtower', 'mint', 'foundry', 'sanctum'],
};

export function campaignBuildChoices(id, { expanded = false, resumed = false } = {}) {
  return [...(!expanded && !resumed && Object.hasOwn(INTRODUCED, id) ? INTRODUCED[id] : Object.keys(BUILDINGS))];
}

/** Draw only a suggestion over the normal renderer; the engine stays unchanged. */
export function drawCampaignGuidance(renderer, game, ui) {
  const point = ui.coachSite || game.state.buildings.find(b => b.id === ui.coachBuilding && b.hp > 0);
  if (!point) return;
  const { c, dpr, width, height, scale, camera } = renderer;
  c.save();
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.strokeStyle = '#ffe2a0';
  c.lineWidth = Math.max(2, 4 * scale);
  c.beginPath();
  c.ellipse(width / 2 + (point.x - camera) * scale, height / 2 + (point.y + 18 - game.map.height / 2) * scale,
    67 * scale, 37 * scale, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

/** Infer hints from the real battle, including after a reload. Never mutate it. */
export function campaignCoach(game, id, choice = {}) {
  const own = game.state.buildings.filter(b => b.side === 0 && b.hp > 0);
  const build = (type, title, text) => {
    const middle = Math.floor(game.map.lanes.length / 2);
    const anchor = own.find(b => b.type === 'barracks' && b.lane === middle);
    const preferredX = (anchor?.x ?? game.map.siteColumns[3]) - 140;
    const site = buildSites(game.map, 0).filter(p => game.canBuild(type, p.x, p.y).ok)
      .sort((a, b) => Math.abs(a.lane - middle) - Math.abs(b.lane - middle) || Math.abs(a.x - preferredX) - Math.abs(b.x - preferredX))[0];
    return { key: `build-${type}`, title, text: choice.build === type
      ? `Tap a green site to build. The gold ring suggests one; any free site works. Drag to look around.`
      : text, control: `[data-type="${type}"]`, site: choice.build === type ? site : null };
  };
  if (id === 'emberwatch') {
    if (!own.some(b => b.type === 'barracks'))
      return build('barracks', 'Raise a barracks', 'Choose Barracks below, then a green site. Warriors spawn and march on their own.');
    if (!own.some(b => b.type === 'archery'))
      return build('archery', 'Add ranged support', 'Your barracks already sends warriors. Choose Archery below, then place it behind the barracks.');
    return { key: 'front', title: 'Follow your army', text: 'Troops march and fight on their own. Use Front to follow them toward the gold-marked target. Keep building while they advance.', control: '#front' };
  }
  if (id === 'three-roads') {
    if (!own.some(b => b.type === 'watchtower'))
      return build('watchtower', 'A new option: watchtower', 'A watchtower holds nearby ground. Choose it below to try one, then send troops down both outer roads.');
    return { key: 'roads', title: 'Check both roadblocks', text: 'Drag the battlefield or tap the minimap to look ahead. Build troops on each outer road to reach both marked barracks.', control: '#front' };
  }
  if (id === 'winter-stores') {
    if (own.filter(b => b.type === 'mint').length < 3)
      return build('mint', 'A new option: gold mine', 'Two marked mines are already working. Add a third mine, then upgrade mines to reach 15 gold/sec. Keep the marked mines alive.');
    if (currentIncome(game) < 15) {
      const mine = own.filter(b => b.type === 'mint' && b.level < 3).sort((a,b) => a.level - b.level)[0];
      if (mine) return { key: `upgrade-${mine.id}`, title: 'Grow your income', text: choice.selected === mine.id
        ? 'Choose Upgrade in the building details. It costs the displayed gold and increases this mine’s income.'
        : 'Tap the gold-ringed mine, then choose Upgrade. Aim for 15 gold/sec before the deadline.', control: choice.selected === mine.id ? '#upgrade' : '#gold', buildingId: mine.id };
    }
    return { key: 'protect', title: 'Keep the supply mines alive', text: 'Your income is ready. Defend both marked starting mines until the clock runs out.', control: '#front' };
  }
  if (id === 'stonegate' && !own.some(b => b.type === 'foundry'))
    return build('foundry', 'A new option: foundry', 'Siege engines outrange towers. Choose Foundry below and keep warriors ahead of its engines.');
  return null;
}

