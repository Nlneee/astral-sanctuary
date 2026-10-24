// Shared enemy difficulty policies. Pure decisions; no fighter stats are modified.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EnemyAI = factory();
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const levels = Object.freeze({
    easy: Object.freeze({ name: '简单', description: '偏好普攻，偶尔使用战技与奥义，较少争夺星核和解放共鸣。', orbChance: 0.20, overdriveChance: 0.35 }),
    normal: Object.freeze({ name: '标准', description: '根据血量、护盾与角色机制选择技能，保持原有对战策略。', orbChance: 0.45, overdriveChance: 1 }),
    hard: Object.freeze({ name: '困难', description: '更重视斩杀、技能收益与灵力规划，主动争夺星核并解放共鸣。', orbChance: 1, overdriveChance: 1 })
  });

  function getLevel(id) {
    return Object.hasOwn(levels, id) ? levels[id] : levels.normal;
  }

  function roll(chance, random) {
    return chance >= 1 || (chance > 0 && random() < chance);
  }

  function shouldClaimOrb(difficulty, random = Math.random) {
    return roll(getLevel(difficulty).orbChance, random);
  }

  function shouldOverdrive(ai, difficulty, random = Math.random) {
    return ai.resonance >= 100 && roll(getLevel(difficulty).overdriveChance, random);
  }

  function scoreSkillForAI(skill, ai, foe, estimateDamage) {
    let score = 50;

    // 1) 斩杀检测
    const estDmg = estimateDamage(skill, ai, foe);
    if (estDmg >= (foe.hp + foe.shield)) {
      score += 1000;
    }

    // 2) 生存紧急救护检测
    const hpRatio = ai.hp / ai.maxHp;
    if (hpRatio < 0.35) {
      if (skill.healAmount || skill.desc.includes('恢复')) score += 420;
      if (skill.shieldAmount || skill.desc.includes('圣盾')) score += 360;
      if (skill.desc.includes('洞察')) score += 300;
    } else if (hpRatio >= 0.95 && (skill.healAmount && !skill.baseMult)) {
      // 满血不浪费纯治疗战技
      score -= 750;
    }

    // 3) 破盾与破绽连招检测
    if (foe.shield > 0) {
      if (skill.desc.includes('碎') || skill.pierce) score += 280;
      if (skill.id === 'gem_s3') score += 320; // Gemini 窃盾
      if (skill.id === 'qw_s1') score += 350; // Qwen 碎盾
    }

    if (foe.statuses.vuln > 0) {
      if (skill.baseMult >= 1.4) score += 240; // 破绽期全力爆发
    }

    // 4) 角色专属机制决策
    if (ai.id === 'gpt') {
      if ((ai.gptDeduction || 0) >= 100) {
        if (skill.type === 'ult' || skill.baseMult >= 1.3) score += 380; // 视界就绪，倾泻爆发
      } else {
        if (skill.id === 'gpt_s4' || skill.id === 'gpt_b2') score += 180; // 加速推演
      }
    }

    if (ai.id === 'deepseek') {
      const stacks = ai.stacks || 1;
      if (stacks >= 3) {
        if (skill.id === 'ds_s3' || skill.id === 'ds_u1') score += 460; // 满层/高层泄压海啸爆发
      } else {
        if (skill.id === 'ds_s1') score += 280; // 深潜快速蓄压
        if (skill.aiRole === 'stack_build') score += 150;
      }
    }

    if (ai.id === 'claude') {
      if ((ai.claudeSolar || 0) >= 3 && skill.baseMult > 0) score += 340; // 盛夏绽放触发
    }

    if (ai.id === 'qwen') {
      if (foe.statuses.vuln > 0) {
        if (skill.id === 'qw_b2' || skill.id === 'qw_u1') score += 350; // 破绽寻隙追击
      } else {
        if (skill.id === 'qw_b1' || skill.id === 'qw_s1' || skill.id === 'qw_s4') score += 220; // 施加破绽
      }
    }

    if (ai.id === 'glm') {
      if (ai.shield > 160 && skill.id === 'glm_s3') score += 340; // 冰晶引爆
      if (ai.shield === 0 && (skill.shieldAmount || skill.id === 'glm_b1')) score += 220; // 保持护盾增伤
    }

    if (ai.id === 'grok') {
      if (skill.id === 'gr_s3') {
        if (hpRatio > 0.40) score += 320; // 燃血狂攻
        else score -= 300; // 残血不自残
      }
    }

    // 5) 奥义与高阶技能偏好
    if (skill.type === 'ult') score += 220;
    if (skill.type === 'skill') score += 60;

    return score;
  }

  // Heuristic, non-critical damage reaching HP; used for decisions, not combat.
  function estimateHealthDamage(skill, ai, foe, estimateDamage) {
    let damage = estimateDamage(skill, ai, foe);
    if (foe.id === 'deepseek') damage *= 1 - (foe.stacks || 1) * 0.05;
    if (foe.statuses.insight > 0) damage *= 0.60;
    let pierce = skill.pierce || 0;
    if (ai.id === 'gpt' && ai.gptDeduction >= 100) pierce = Math.max(pierce, 0.40);
    const shieldDamage = damage * (1 - pierce);
    const absorbed = Math.min(foe.shield, shieldDamage);
    const shatter = foe.shield > 0 && shieldDamage >= foe.shield ? 65 : 0;
    return Math.max(0, damage - absorbed + shatter);
  }

  function scoreHardSkill(skill, ai, foe, estimateDamage) {
    let score = scoreSkillForAI(skill, ai, foe, estimateDamage);
    const healthDamage = estimateHealthDamage(skill, ai, foe, estimateDamage);
    score += Math.min(foe.hp, healthDamage) * 1.5;

    const missingHp = ai.maxHp - ai.hp;
    if (skill.healAmount) {
      score += Math.min(missingHp, skill.healAmount) * (ai.hp / ai.maxHp < 0.5 ? 2 : 1);
      // Claude can turn overflow healing into shields.
      if (ai.id !== 'claude') score -= Math.max(0, skill.healAmount - missingHp) * 0.8;
    }
    if (ai.statuses.boost >= 2 && ['buff_damage', 'buff_energy', 'shield_buff', 'heal_buff'].includes(skill.aiRole)) score -= 180;
    if (foe.statuses.vuln >= 2 && skill.aiRole === 'debuff_vuln') score -= 80;
    if (foe.statuses.burn >= 2 && skill.aiRole === 'damage_dot') score -= 100;
    if (skill.aiRole === 'stack_spend' && (ai.stacks || 1) < 3) score -= 300;
    if (!skill.baseMult && skill.shieldAmount && ai.shield > 200) score -= 180;
    // Store energy with basics when it is scarce; avoid wasting an ultimate into insight.
    if (skill.type === 'basic' && ai.energy < ai.maxEnergy) score += 70;
    score -= skill.cost * 20;
    if (skill.type === 'ult' && foe.statuses.insight > 0 && healthDamage < foe.hp) score -= 300;
    return score;
  }

  function chooseSkill(ai, foe, difficulty, estimateDamage, random = Math.random) {
    const available = ai.skills.filter(skill => (ai.cooldowns[skill.id] || 0) <= 0 && ai.energy >= skill.cost);
    if (!available.length) return null;
    if (difficulty === 'easy') {
      const basic = available.find(skill => skill.type === 'basic');
      if (basic && random() < 0.65) return basic;
      return available[Math.min(available.length - 1, Math.floor(random() * available.length))];
    }
    let candidates = available;
    if (difficulty === 'hard') {
      const finishers = available.filter(skill => estimateHealthDamage(skill, ai, foe, estimateDamage) >= foe.hp);
      if (finishers.length) {
        const lowestCost = Math.min(...finishers.map(skill => skill.cost));
        candidates = finishers.filter(skill => skill.cost === lowestCost);
      }
    }
    const score = difficulty === 'hard' ? scoreHardSkill : scoreSkillForAI;
    // Score once per candidate, preserve loadout order on ties, never reorder equipped skills.
    return candidates.map(skill => ({ skill, score: score(skill, ai, foe, estimateDamage) }))
      .reduce((best, candidate) => candidate.score > best.score ? candidate : best).skill;
  }

  return Object.freeze({ levels, getLevel, chooseSkill, shouldClaimOrb, shouldOverdrive });
});
