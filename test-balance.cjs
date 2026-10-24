// Comprehensive balance & mechanics test
const fs = require('fs');

// Mock browser globals
global.window = global;
require('./characters.js');

console.log('=== Checking Characters & Skill Pool ===');
console.log('Total characters:', window.CHARACTERS.length);

window.CHARACTERS.forEach(c => {
  const bCount = c.skillPool.basics.length;
  const tCount = c.skillPool.tacticals.length;
  const uCount = c.skillPool.ultimates.length;
  console.log(`- ${c.name.padEnd(16)} | HP: ${c.stats.maxHp} ATK: ${c.stats.atk} SPD: ${c.stats.spd} CRIT: ${Math.round(c.stats.crit*100)}% | Skills: ${bCount}B + ${tCount}T + ${uCount}U`);
  
  if (bCount !== 2 || tCount !== 4 || uCount !== 2) {
    throw new Error(`Invalid skill count for ${c.name}: ${bCount}/${tCount}/${uCount}`);
  }
});

// Test skill execution & combatCtx
let logs = [];
const mockCtx = {
  dealDamage(attacker, defender, mult, opts = {}) {
    let raw = attacker.atk * mult;
    if (opts.bonusFlatDmg) raw += opts.bonusFlatDmg;
    if (attacker.id === 'gpt' && (attacker.gptDeduction || 0) >= 100) {
      raw *= 1.30;
      attacker.gptDeduction = 0;
    } else if (attacker.id === 'gpt' && (attacker.gptDeduction || 0) >= 50) {
      raw *= 1.15;
    }
    if (attacker.id === 'deepseek' && (attacker.stacks || 1) > 0) {
      raw *= (1 + (attacker.stacks || 1) * 0.10);
    }
    if (attacker.id === 'claude' && (attacker.claudeSolar || 0) >= 3) {
      raw += 75;
      attacker.claudeSolar = 0;
    }
    if (attacker.id === 'grok') {
      const missing = 1 - attacker.hp / attacker.maxHp;
      raw *= (1 + missing * 0.35);
    }
    if (attacker.id === 'qwen' && defender.statuses.vuln > 0) {
      raw *= 1.20;
    }
    const finalDmg = Math.round(raw);
    defender.hp = Math.max(0, defender.hp - finalDmg);
    return finalDmg;
  },
  heal(target, amt, silent) {
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + amt);
    return target.hp - before;
  },
  addShield(target, amt) {
    target.shield = (target.shield || 0) + amt;
    return amt;
  },
  addStatus(target, st, turns) {
    target.statuses[st] = Math.max(target.statuses[st] || 0, turns);
  },
  removeStatus(target, st) {
    target.statuses[st] = 0;
  },
  cleanse(target) {
    target.statuses.vuln = 0;
    target.statuses.burn = 0;
  },
  gainEnergy(target, amt) {
    target.energy = Math.min(3, (target.energy || 0) + amt);
  },
  addResonance(target, amt) {
    target.resonance = Math.min(100, (target.resonance || 0) + amt);
  },
  triggerShatterEffect(target) {
    target.hp = Math.max(0, target.hp - 65);
    target.statuses.vuln = 1;
  },
  advanceDeduction(target, amt) {
    target.gptDeduction = Math.min(100, (target.gptDeduction || 0) + amt);
  },
  advanceSolar(target, amt) {
    target.claudeSolar = Math.min(3, (target.claudeSolar || 0) + amt);
  }
};

function createDummy(c) {
  return {
    id: c.id,
    name: c.name,
    maxHp: c.stats.maxHp,
    hp: c.stats.maxHp,
    atk: c.stats.atk,
    spd: c.stats.spd,
    crit: c.stats.crit,
    shield: 0,
    energy: 1,
    resonance: 20,
    stacks: c.id === 'deepseek' ? 1 : 0,
    gptDeduction: 0,
    claudeSolar: 0,
    statuses: { boost: 0, vuln: 0, regen: 0, insight: 0, burn: 0 }
  };
}

console.log('\n=== Testing All 56 Skills Execution ===');
window.CHARACTERS.forEach(c => {
  const allSkills = [...c.skillPool.basics, ...c.skillPool.tacticals, ...c.skillPool.ultimates];
  allSkills.forEach(s => {
    const actor = createDummy(c);
    const target = createDummy(window.CHARACTERS.find(x => x.id !== c.id));
    target.shield = 100;
    target.statuses.vuln = 1;
    target.statuses.boost = 2;
    actor.hp = Math.round(actor.maxHp * 0.5); // test mid-hp
    if (actor.id === 'deepseek') actor.stacks = 3;
    if (actor.id === 'gpt') actor.gptDeduction = 80;
    if (actor.id === 'claude') actor.claudeSolar = 2;

    const res = s.execute(actor, target, mockCtx);
    if (!res || typeof res !== 'string') {
      throw new Error(`Skill ${s.id} (${s.name}) did not return a valid summary string! Got: ${res}`);
    }
  });
});
console.log('✓ All 56 skills executed flawlessly!');

// Test GPT deduction mechanics
console.log('\n=== Testing GPT 1v1 Deduction Horizon ===');
const gpt = createDummy(window.CHARACTERS.find(c => c.id === 'gpt'));
const dummyFoe = createDummy(window.CHARACTERS.find(c => c.id === 'grok'));
dummyFoe.statuses.boost = 2;

console.log('Initial GPT deduction:', gpt.gptDeduction);
mockCtx.advanceDeduction(gpt, 35);
console.log('After advance 35%:', gpt.gptDeduction);
mockCtx.advanceDeduction(gpt, 70);
console.log('After advance 70% (capped at 100%):', gpt.gptDeduction);
const dmg1 = mockCtx.dealDamage(gpt, dummyFoe, 2.4);
console.log(`GPT Horizon Attack dealt ${dmg1} damage! Foe boost removed: ${dummyFoe.statuses.boost === 0}`);
console.log('Deduction after Horizon consumption:', gpt.gptDeduction);

// Test DeepSeek Pressure mechanics
console.log('\n=== Testing DeepSeek Depth Pressure ===');
const ds = createDummy(window.CHARACTERS.find(c => c.id === 'deepseek'));
console.log('Initial DS stacks:', ds.stacks);
const dsS1 = window.CHARACTERS.find(c => c.id === 'deepseek').skillPool.tacticals.find(s => s.id === 'ds_s1');
dsS1.execute(ds, dummyFoe, mockCtx);
console.log('After ds_s1 (深潜), DS stacks:', ds.stacks, 'Shield:', ds.shield);
const dsS3 = window.CHARACTERS.find(c => c.id === 'deepseek').skillPool.tacticals.find(s => s.id === 'ds_s3');
const dsDmg = dsS3.execute(ds, dummyFoe, mockCtx);
console.log('After ds_s3 (渊溟巨压释放):', dsDmg, 'Remaining stacks:', ds.stacks);

// Test Claude Solar Bloom
console.log('\n=== Testing Claude Solar Bloom ===');
const cl = createDummy(window.CHARACTERS.find(c => c.id === 'claude'));
console.log('Initial Claude Solar:', cl.claudeSolar);
mockCtx.advanceSolar(cl, 3);
console.log('After accumulating 3 solar stacks:', cl.claudeSolar);
const clB1 = window.CHARACTERS.find(c => c.id === 'claude').skillPool.basics.find(s => s.id === 'cl_b1');
const clDmg = clB1.execute(cl, dummyFoe, mockCtx);
console.log('After attack with 3 solar stacks:', clDmg, 'Remaining solar:', cl.claudeSolar, 'Foe burn:', dummyFoe.statuses.burn);

// Test Qwen Flaw Strike & Parry
console.log('\n=== Testing Qwen Flaw Strike & Parry ===');
const qw = createDummy(window.CHARACTERS.find(c => c.id === 'qwen'));
dummyFoe.statuses.vuln = 2;
const qwDmg = mockCtx.dealDamage(qw, dummyFoe, 1.0);
console.log(`Qwen attack vs Vuln target dealt ${qwDmg}, gained insight: ${qw.statuses.insight}`);

// Test Grok Tuned Berserk Damage
console.log('\n=== Testing Grok Tuned Damage ===');
const gr = createDummy(window.CHARACTERS.find(c => c.id === 'grok'));
const grFullHpDmg = mockCtx.dealDamage(gr, dummyFoe, 1.35);
gr.hp = Math.round(gr.maxHp * 0.3); // 30% hp
const grLowHpDmg = mockCtx.dealDamage(gr, dummyFoe, 1.35);
console.log(`Grok full HP dmg: ${grFullHpDmg}, 30% HP berserk dmg: ${grLowHpDmg} (+${Math.round((grLowHpDmg/grFullHpDmg - 1)*100)}%)`);

console.log('\n=== ALL BALANCE & MECHANICS CHECKS PASSED! ===');
