/** Explicit boundary for pre-Chapter Ten fixtures; never derive this from the live catalog. */
export const FINAL_CHAPTER_MISSION_IDS = Object.freeze([
  'below-the-ramparts', 'the-last-granary', 'no-fires-tonight',
  'carry-the-crossing', 'the-last-engine',
]);
export const FINAL_CHAPTER_RULESET_IDS = Object.freeze([
  'frontier-campaign-ramparts', 'frontier-campaign-last-granary',
  'frontier-campaign-no-fires', 'frontier-campaign-last-crossing',
  'frontier-campaign-last-engine-r2',
]);
export const beforeFinalChapter = value => !FINAL_CHAPTER_MISSION_IDS.includes(value.id);
export const beforeFinalChapterRules = id => !FINAL_CHAPTER_RULESET_IDS.includes(id);
