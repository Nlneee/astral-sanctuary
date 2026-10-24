// Tests real difficulty policies against the game's actual character skill pools.
const assert = require('node:assert/strict');
const AI = require('./enemy-ai.js');
global.window = global;
require('./characters.js');

const fighter = id => {
  const c = CHARACTERS.find(c => c.id === id);
  return { ...c.stats, id, hp: c.stats.maxHp, shield: 0, energy: 3, maxEnergy: 3,
    resonance: 100, gptDeduction: 0, claudeSolar: 0, stacks: 1,
    skills: [c.skillPool.basics[0], ...c.skillPool.tacticals.slice(0, 2), c.skillPool.ultimates[0]],
    cooldowns: {}, statuses: { boost: 0, vuln: 0, burn: 0, regen: 0, insight: 0 } };
};
const estimate = (skill, ai) => Math.round(ai.atk * (skill.baseMult || 0));

// Difficulty never bypasses resource rules or mutates loadouts/fighters.
for (const difficulty of Object.keys(AI.levels)) {
  for (const c of CHARACTERS) {
    for (const energy of [0, 1, 3]) {
      const ai = fighter(c.id), foe = fighter('grok');
      ai.energy = energy;
      ai.cooldowns[ai.skills[1].id] = 2;
      const before = JSON.stringify([ai, foe]);
      for (const roll of [0, 0.3, 0.7, 0.999]) {
        const skill = AI.chooseSkill(ai, foe, difficulty, estimate, () => roll);
        assert.ok(ai.skills.includes(skill));
        assert.ok(skill.cost <= energy);
        assert.equal(ai.cooldowns[skill.id] || 0, 0);
      }
      assert.equal(JSON.stringify([ai, foe]), before);
    }
  }
}
const grok = fighter('grok'), foe = fighter('gpt');
assert.equal(AI.chooseSkill(grok, foe, 'easy', estimate, () => 0).type, 'basic');
assert.equal(AI.chooseSkill(grok, foe, 'easy', estimate, () => 0.999).type, 'ult');
assert.equal(AI.chooseSkill(grok, foe, 'normal', estimate).type, 'ult');

// Hard saves its ultimate when a free basic can finish; standard keeps its old scoring.
foe.hp = 50;
assert.equal(AI.chooseSkill(grok, foe, 'normal', estimate).type, 'ult');
assert.equal(AI.chooseSkill(grok, foe, 'hard', estimate).type, 'basic');

// Hard uses piercing to finish through a large shield instead of choosing a setup.
const qwen = fighter('qwen');
foe.hp = 90; foe.shield = 800;
assert.equal(AI.chooseSkill(qwen, foe, 'hard', estimate).id, 'qw_u1');

// Low-health AI still values a useful recovery skill when it cannot finish.
const gemini = fighter('gemini');
gemini.hp = 100;
gemini.skills = [CHARACTERS.find(c => c.id === 'gemini').skillPool.basics[0],
  CHARACTERS.find(c => c.id === 'gemini').skillPool.tacticals[1]];
foe.hp = 1060; foe.shield = 0;
assert.equal(AI.chooseSkill(gemini, foe, 'hard', estimate).id, 'gem_s2');

// Difficulty changes resource contests; all chances are tested without flakiness.
assert.equal(AI.shouldClaimOrb('easy', () => 0.3), false);
assert.equal(AI.shouldClaimOrb('normal', () => 0.3), true);
assert.equal(AI.shouldClaimOrb('normal', () => 0.8), false);
assert.equal(AI.shouldClaimOrb('hard', () => 0.999), true);
assert.equal(AI.shouldOverdrive(grok, 'easy', () => 0.8), false);
assert.equal(AI.shouldOverdrive(grok, 'normal', () => 0.999), true);
grok.resonance = 99;
assert.equal(AI.shouldOverdrive(grok, 'hard', () => 0), false);
grok.energy = 0; grok.cooldowns[grok.skills[0].id] = 1;
assert.equal(AI.chooseSkill(grok, foe, 'hard', estimate), null);
assert.equal(AI.getLevel('invalid'), AI.levels.normal);
assert.equal(AI.getLevel('__proto__'), AI.levels.normal);
console.log('PASS: difficulty choices, legal skills for all 7 characters, finishing/resource strategy, recovery and no state mutation.');
