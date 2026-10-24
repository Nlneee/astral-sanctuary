// ============================================================================
// AI Persona Duel — 七大 AI 拟人角色设定、多流派技能池与动态星象数据库 (完整机制指南强化版)
// 包含角色专属深度运转机制、全增减益图鉴系统、圣殿法则与战斗数学模型
// ============================================================================

// 1. 全局状态与增减益图鉴数据
window.STATUS_META = {
  shield: {
    id: 'shield',
    name: '圣盾',
    icon: '🛡️',
    color: '#93c5fd',
    kind: 'shield',
    category: 'buff',
    timing: '受击时优先吸收',
    desc: '抵消受到的非穿透伤害；若圣盾被攻击彻底击碎，会触发【圣盾崩解】额外承受 65 点真实震荡伤害并陷入 1 回合【破绽】。',
    counterplay: '厚盾可抵挡巨额爆发；攻击方可通过高穿透技能绕过护盾，或使用破盾技能一举震碎触发崩解硬直。'
  },
  boost: {
    id: 'boost',
    name: '增幅',
    icon: '⚔️',
    color: '#fbbf24',
    kind: 'turn',
    category: 'buff',
    timing: '攻击结算时增伤 30%',
    desc: '造成的攻击伤害提升 30%（按完整回合持续，己方行动出招后才递减）。',
    counterplay: '极其强力的攻击增益。防守方可用 GPT【真理视界】、GLM【Z之禁锢刻印】或 DeepSeek【海沟音爆】直接驱散。'
  },
  vuln: {
    id: 'vuln',
    name: '破绽',
    icon: '❄️',
    color: '#f472b6',
    kind: 'turn',
    category: 'debuff',
    timing: '受击结算时易伤 25%',
    desc: '承受的所有攻击伤害增加 25%（按完整回合持续，受击方行动结束时递减）。',
    counterplay: '破防状态极度危险。中招后可通过 GPT【逻辑逆转】或 Claude【花庭庇护所】立即净化减益。'
  },
  regen: {
    id: 'regen',
    name: '再生',
    icon: '✨',
    color: '#4ade80',
    kind: 'turn',
    category: 'buff',
    timing: '回合开始时自动恢复',
    desc: '每回合开始时稳定恢复 95 点生命值（每次触发后持续回合扣减 1）。',
    counterplay: '持续恢复生命，与【暖阳花昼】星象（治疗+30%）产生极高质变联动。'
  },
  insight: {
    id: 'insight',
    name: '洞察',
    icon: '⚡',
    color: '#c084fc',
    kind: 'charge',
    category: 'buff',
    timing: '受击瞬间判定',
    desc: '受击格挡反制：使本次受到的攻击伤害降低 40%，并立即向攻击者反弹 45 点星芒真实伤害（按受击次数逐层消耗）。',
    counterplay: '单次高减伤与反击利器。多段连击（如 Gemini 普攻）虽两段独立，但一次攻击仅消耗 1 次洞察判定。'
  },
  burn: {
    id: 'burn',
    name: '星灼',
    icon: '🔥',
    color: '#fb923c',
    kind: 'turn',
    category: 'debuff',
    timing: '回合开始时灼烧',
    desc: '每回合开始时受到 85 点星火真实灼烧伤害（每次触发后持续回合扣减 1）。',
    counterplay: '持续扣血可压制敌方血线，无视护盾直接削减生命；亦可通过净化技能及时清空。'
  },
  shatter: {
    id: 'shatter',
    name: '圣盾崩解',
    icon: '💎',
    color: '#e0f2fe',
    kind: 'penalty',
    category: 'debuff',
    timing: '护盾值归零瞬间触发',
    desc: '当持有圣盾的角色护盾被攻击彻底打空击碎时，受到灵能剧烈反噬：立即额外损失 65 点真实生命，并强制陷入 1 回合【破绽】！',
    counterplay: '防守方需注意自身护盾残量，避免被单发轻击触发崩解；攻击方可精准算血击碎护盾打出硬直翻盘。'
  }
};

// 2. 动态战场星象数据库
window.ASTRAL_WEATHERS = [
  {
    id: 'starlight',
    name: '紫微星耀',
    icon: '🔮',
    color: '#a78bfa',
    desc: '星辉加持：全场暴击率提升 15%，暴击伤害由 150% 提升至 165%',
    strategy: '暴击流（如 Grok、Gemini、Qwen 破绽追击）的黄金输出回合，极易打出决定性高爆。'
  },
  {
    id: 'frost',
    name: '凛冬镜界',
    icon: '❄️',
    color: '#60a5fa',
    desc: '寒晶共鸣：所有【圣盾】获取量提升 30%，持有圣盾时攻击伤害 +15%',
    strategy: '护盾与防守流（如 GLM、GPT、DeepSeek 深潜）的最佳作战期，盾量极厚且增伤显著。'
  },
  {
    id: 'bloom',
    name: '暖阳花昼',
    icon: '🌸',
    color: '#4ade80',
    desc: '生机盎然：所有治疗效果提升 30%，每回合开始全员自动恢复 45 点生命',
    strategy: '治愈与持久战（如 Claude、Grok 嗜血）的福地，Claude 可在此天气下超速积累溢出圣盾与日冕。'
  },
  {
    id: 'aurora',
    name: '极光跃迁',
    icon: '⚡',
    color: '#fbbf24',
    desc: '算力涌动：施放【战技】时有 50% 概率立即返还 1 点灵力',
    strategy: '高能连招期，战技消耗大幅降低，可连续打出原本受灵力限制的战术高阶组合技能。'
  }
];

// 3. 圣殿系统核心法则与公式指南
window.SYSTEM_MECHANICS = [
  {
    id: 'energy',
    name: '灵力运转体系 (Energy & Action Economy)',
    icon: '◆',
    summary: '决定战斗节奏的行动资源，每个回合平稳恢复并根据天气/机制触发返还。',
    rules: [
      '每个回合开始时，出战角色自动恢复 1 点灵力（上限 3 点）。',
      '【普攻】：不消耗灵力（Cost 0），且施放时额外恢复 1 点灵力，用于快速积攒灵力。',
      '【战技】：通常消耗 1 点灵力（Cost 1），附带强力专属效果与冷却回合（CD 2~3 回合）。',
      '【终极奥义】：固定消耗 3 点灵力（Cost 3），具备扭转乾坤的超强倍率或专属机制质变。',
      '特殊返还：在【极光跃迁】星象下施放战技有 50% 概率返还 1 点灵力；部分角色技能（如 Gemini、GPT、Qwen、Grok）具备直接返还灵力的效果。'
    ]
  },
  {
    id: 'resonance',
    name: '圣殿共鸣与超限爆发 (Resonance & Overdrive)',
    icon: '⚜️',
    summary: '贯穿战局的双向充能爆发系统，无论进攻还是防守均可积攒力量，在危机或终结时逆转战局。',
    rules: [
      '造成攻击伤害时，攻击者获得 18% 圣殿共鸣值（施放奥义获得 25%）。',
      '受到攻击伤害时，承受者获得 14% 圣殿共鸣值（越受挫积攒越快）。',
      '每回合开始时，角色自动稳定获得 10% 圣殿共鸣。',
      '共鸣值达到 100% 时，中央共鸣水晶发出金色炽芒，激活【圣殿共鸣解放（Overdrive）】按键！',
      '点击【解放】不消耗当回合行动机会，立即清空共鸣并获得：1 点灵力、120 点圣盾与 2 回合【增幅】（造成伤害提升 30%）！',
      'AI 同样具备智能超限决策能力，满共鸣时会自主寻找最优时机解放！'
    ]
  },
  {
    id: 'shield_system',
    name: '圣盾吸收与崩解震荡 (Shielding & Shatter)',
    icon: '🛡️',
    summary: '攻守博弈的关键屏障，能抵消所有非穿透伤害，但彻底击碎会带来巨大代价。',
    rules: [
      '圣盾可无损抵消受到的攻击伤害，直至护盾归零。',
      '穿透伤害（Pierce）：若技能或角色具有穿透率（如 40% 穿透），则 40% 伤害直接穿透圣盾扣除生命，剩余 60% 伤害由圣盾抵消。',
      '【圣盾崩解（Shield Shatter）】：当一名角色的圣盾在受击后被彻底削至 0 时，立即触发护盾崩解震荡，使该角色受到 65 点额外真实伤害，并立即陷入 1 回合【破绽】！',
      '对局策略：面对厚盾角色，既可使用具有破盾特攻或高穿透的技能直接击碎/穿透，也可控好伤害数值精准触发敌方圣盾崩解。'
    ]
  },
  {
    id: 'astral_weather',
    name: '动态战场星象流转 (Dynamic Astral Weathers)',
    icon: '🌌',
    summary: '苍穹圣殿特有的动态战局环境变量，每 2 回合按星轨自动流转，改变全场规则。',
    rules: [
      '【紫微星耀 🔮】：全场角色暴击率提升 15%，暴击伤害由 150% 提升至 165%（刺客与爆发流最爱）。',
      '【凛冬镜界 ❄️】：全场圣盾获取量提升 30%，且持有圣盾的角色造成的攻击伤害提升 15%（GLM 与护盾角色黄金期）。',
      '【暖阳花昼 🌸】：全场治疗效果提升 30%，且每回合开始所有角色自动恢复 45 点生命（Claude 与续航流福地）。',
      '【极光跃迁 ⚡】：全场算力澎湃，施放战技时有 50% 概率立即返还 1 点灵力（高频技能倾泻期）。',
      '星象提示：界面中央横幅实时显示当前生效星象，并提前预告下一轮流转星象，便于玩家提前 1 回合规划灵力与留招。'
    ]
  },
  {
    id: 'damage_formula',
    name: '伤害计算公式与乘区法则 (Damage Multipliers & Timing)',
    icon: '⚔️',
    summary: '精准透明的伤害运算逻辑，多重乘区相互叠加形成最终伤害。',
    rules: [
      '基础伤害 = 攻击者 ATK × 技能倍率 (Multiplier) + 固定附加伤害 (Flat Bonus)。',
      '角色形态乘区：GPT 推演优势 (1.15x) / 真理视界 (1.30x)、GLM 护盾共鸣 (1.20x)、DeepSeek 渊溟压强 (1.10x~1.40x)、Claude 日冕 (1.06x~1.18x)、Grok 压血狂化 (最高 1.315x)、Gemini 双子连击 (1.12x)。',
      '环境乘区：凛冬镜界持盾 (1.15x)。',
      '状态乘区：攻击方持有【增幅】(1.30x) × 防守方持有【破绽】(1.25x) × Qwen 破绽追击 (1.20x)。',
      '防御减免乘区：防守方 DeepSeek 渊溟常驻减伤 (0.95x~0.80x) × 防守方【洞察】格挡 (0.60x)。',
      '暴击乘区：暴击触发时，伤害整体乘以 1.50x（紫微星耀天气下为 1.65x）。',
      '状态结算时序：增益（如自施加的增幅）在当动出招后完整保留相应回合，不会在施放瞬间被当回合末误扣；减益（破绽）在承受方行动结束时递减；持续伤害（星灼）与持续治疗（再生）在回合开始时触发。'
    ]
  },
  {
    id: 'astral_orbs',
    name: '苍穹星核争夺机制 (Battlefield Astral Orbs)',
    icon: '✦',
    summary: '偶数回合在战场虚空中央凝结的高能星核，我方与敌方均可在行动前争夺拾取。',
    rules: [
      '偶数回合（Turn 2, 4, 6...）敌方行动结束后，若中央无星核，有 70% 概率凝结一颗随机圣殿星核。',
      '【灵能星核 💎】：拾取立即获得 1 点灵力与 25% 圣殿共鸣。',
      '【庇护星核 🛡️】：拾取立即获得 120 点圣盾与 1 次【洞察】。',
      '【狂暴星核 ⚔️】：拾取立即获得 2 回合【增幅】并为敌方施加 2 回合【破绽】。',
      '【甘霖星核 🌸】：拾取立即恢复 160 点生命值并获得 2 回合【再生】。',
      '先到先得：处于己方回合行动前，可随时点击中央星核抢先拾取，亦需警惕 AI 敌方在轮到其回合时抢先一步夺取！'
    ]
  }
];

// 4. 七大 AI 拟人角色完整数据库 (含技能池与专属运转机制)
window.CHARACTERS = [
  // ==========================================================================
  // 1. GPT
  // ==========================================================================
  {
    id: 'gpt',
    name: 'GPT',
    title: '紫晶圣冠 · 全知裁决',
    role: '全知演算 · 逻辑坍缩与终局裁决',
    image: './assets/gpt.png',
    themeColor: '#a78bfa',
    accentColor: '#ddd6fe',
    bgGlow: 'rgba(167, 139, 250, 0.28)',
    quote: '「于繁花与星光交织之处，为你推演最优的终局。」',
    ultQuote: '「万象归序，真理视界降临——此即命运的坍缩！」',
    battleLines: [
      '「推演进度已就绪，你的败局在千百次计算中唯一且确定。」',
      '「紫晶星轨，正在重构战场的因果律。」',
      '「破绽早已显现，这一步是逻辑的必然。」'
    ],
    appearance: '银白微紫长发、紫瞳、尖耳与淡紫弯角，身着白紫渐变花卉轻纱长裙',
    stats: { maxHp: 1060, atk: 120, spd: 106, crit: 0.16 },
    passive: {
      name: '全知演算·星轨定势',
      desc: '回合开始+20%推演，施放技能+15%推演；推演≥50%时攻击+15%且每回合获得40圣盾；达100%激活【真理视界】：下次攻击伤害+30%、无视40%护盾并驱散敌方增幅！'
    },
    mechanic: {
      name: '全知演算 · 星轨定势 & 真理视界',
      badge: '🔮 真理视界',
      tag: '推演蓄能 · 破盾驱散',
      summary: '通过回合流转与技能演算不断推进推演进度，在半程获得攻防增益，并在 100% 满额时进入【真理视界】打出终局审判。',
      steps: [
        { label: '演算推进', text: '回合开始自动推进 20% 推演进度；施展普攻/战技推进 15%~30% 推演。' },
        { label: '逻辑优势 (≥50%)', text: '推演进度达到 50% 时进入逻辑优势期，所有伤害提升 15%，且每回合开始额外凝聚 40 点圣盾。' },
        { label: '真理视界 (100%)', text: '推演达到 100% 时激活【真理视界】：下次攻击伤害额外提升 30%、无视 40% 护盾，并强制驱散敌方全部【增幅】，随后重置进度。' }
      ],
      tips: '前中期利用【星芒叩问】与【因果坍缩】快速跃升推演；在 100% 视界就绪时配合高伤战技或奥义完成一击定音。敌方开出【增幅】时，可用视界一举清空。'
    },
    presets: [
      { name: '因果律令流', slots: ['gpt_b1', 'gpt_s1', 'gpt_s2', 'gpt_u1'] },
      { name: '星轨坍缩流', slots: ['gpt_b2', 'gpt_s3', 'gpt_s4', 'gpt_u2'] }
    ],
    skillPool: {
      basics: [
        {
          id: 'gpt_b1', type: 'basic', tag: '普攻 · 守御', name: '紫晶花咏', cost: 0, cd: 0,
          baseMult: 1.0, aiRole: 'damage_shield',
          desc: '造成 100% 攻击力伤害，凝聚 50 点【圣盾】，并推进 15% 推演进度。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 1.0, { vfx: 'beam' });
            const sh = ctx.addShield(self, 50);
            ctx.advanceDeduction(self, 15);
            return `释放【紫晶花咏】造成 ${dmg} 点伤害，凝聚 ${sh} 点圣盾并推进推演`;
          }
        },
        {
          id: 'gpt_b2', type: 'basic', tag: '普攻 · 灼思', name: '星芒叩问', cost: 0, cd: 0,
          baseMult: 1.0, aiRole: 'damage_dot',
          desc: '造成 100% 攻击力伤害，附加 2 回合【星灼】，推进 20% 推演进度并积攒 15% 共鸣。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 1.0, { vfx: 'star' });
            ctx.addStatus(target, 'burn', 2);
            ctx.advanceDeduction(self, 20);
            ctx.addResonance(self, 15);
            return `施展【星芒叩问】造成 ${dmg} 点伤害，引燃【星灼】并加速全知推演`;
          }
        }
      ],
      tacticals: [
        {
          id: 'gpt_s1', type: 'skill', tag: '战技 · 解构', name: '星轨解构', cost: 1, cd: 2,
          baseMult: 1.40, aiRole: 'debuff_vuln',
          desc: '降下紫晶星芒造成 140% 攻击力伤害，粉碎敌方 60 点【圣盾】，附加 2 回合【破绽】并推进 20% 推演。',
          execute: (self, target, ctx) => {
            if (target.shield > 0) {
              const stripped = Math.min(60, target.shield);
              target.shield -= stripped;
            }
            ctx.addStatus(target, 'vuln', 2);
            ctx.advanceDeduction(self, 20);
            const dmg = ctx.dealDamage(self, target, 1.40, { vfx: 'meteor' });
            return `施展【星轨解构】造成 ${dmg} 点伤害，剥蚀敌盾并洞穿【破绽】`;
          }
        },
        {
          id: 'gpt_s2', type: 'skill', tag: '战技 · 逆转', name: '逻辑逆转·律令', cost: 1, cd: 2,
          baseMult: 1.30, aiRole: 'drain_boost',
          desc: '强力单挑博弈：造成 130% 伤害，汲取伤害量 35% 恢复自身生命，净化自身负面减益，并获得 2 回合【增幅】！',
          execute: (self, target, ctx) => {
            ctx.cleanse(self);
            ctx.addStatus(self, 'boost', 2);
            const dmg = ctx.dealDamage(self, target, 1.30, { vfx: 'beam' });
            const healVal = Math.round(dmg * 0.35);
            const actual = ctx.heal(self, healVal, true);
            ctx.advanceDeduction(self, 15);
            return `降下【逻辑逆转·律令】造成 ${dmg} 点因果伤害，净化自身、获【增幅】并回溯 ${actual} 生命`;
          }
        },
        {
          id: 'gpt_s3', type: 'skill', tag: '战技 · 天启', name: '天启圣火', cost: 1, cd: 2,
          baseMult: 1.35, aiRole: 'damage_dot',
          desc: '造成 135% 攻击力伤害，施加 2 回合【星灼】，自身获得 1 次【洞察】反制并推进 20% 推演。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 1.35, { vfx: 'beam' });
            ctx.addStatus(target, 'burn', 2);
            ctx.addStatus(self, 'insight', 1);
            ctx.advanceDeduction(self, 20);
            return `降下【天启圣火】造成 ${dmg} 点伤害，附加【星灼】、洞悉反制并加速推演`;
          }
        },
        {
          id: 'gpt_s4', type: 'skill', tag: '战技 · 坍缩', name: '因果坍缩·禁域', cost: 1, cd: 3,
          baseMult: 1.15, aiRole: 'steal_shield',
          desc: '造成 115% 伤害并掠夺敌方 90 点圣盾（若敌无盾则自凝 110 圣盾），同时推演进度大幅跃升 +30%！',
          execute: (self, target, ctx) => {
            let stolen = 0;
            if (target.shield > 0) {
              stolen = Math.min(90, target.shield);
              target.shield -= stolen;
              ctx.addShield(self, stolen);
            } else {
              ctx.addShield(self, 110);
            }
            const dmg = ctx.dealDamage(self, target, 1.15, { vfx: 'meteor' });
            ctx.advanceDeduction(self, 30);
            return `发动【因果坍缩·禁域】造成 ${dmg} 伤害，${stolen > 0 ? `掠夺 ${stolen} 点圣盾` : '构筑 110 点圣盾'}，推演跃升 +30%！`;
          }
        }
      ],
      ultimates: [
        {
          id: 'gpt_u1', type: 'ult', tag: '奥义 · 裁决', name: '终焉·阿斯特拉星轨裁决', cost: 3, cd: 0,
          baseMult: 2.40, pierce: 0.35,
          desc: '无视 35% 护盾造成 240% 伤害，附加 2 回合【破绽】，凝聚 120 圣盾，并将推演进度瞬充至 100% 激活【真理视界】！',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 2.40, { pierce: 0.35, isUlt: true, vfx: 'meteor' });
            ctx.addStatus(target, 'vuln', 2);
            ctx.addShield(self, 120);
            self.gptDeduction = 100;
            return `降下奥义【终焉·阿斯特拉星轨裁决】贯穿护盾造成 ${dmg} 点极裁伤害，【真理视界】全面就绪！`;
          }
        },
        {
          id: 'gpt_u2', type: 'ult', tag: '奥义 · 创世', name: '创世·万象星辰坍缩', cost: 3, cd: 0,
          baseMult: 2.50,
          desc: '驱散敌方全部【增幅】，造成 250% 巨额星海伤害，附加 2 回合【破绽】与【星灼】，并返还 1 点灵力。',
          execute: (self, target, ctx) => {
            ctx.removeStatus(target, 'boost');
            ctx.addStatus(target, 'vuln', 2);
            ctx.addStatus(target, 'burn', 2);
            ctx.gainEnergy(self, 1);
            const dmg = ctx.dealDamage(self, target, 2.50, { isUlt: true, vfx: 'beam' });
            return `倾泻奥义【创世·万象星辰坍缩】驱散敌方增幅，造成 ${dmg} 点审判伤害并返还灵力！`;
          }
        }
      ]
    }
  },

  // ==========================================================================
  // 2. Gemini
  // ==========================================================================
  {
    id: 'gemini',
    name: 'Gemini',
    title: '双子星穹 · 幻猫跃迁',
    role: '极速多模态 · 真实双段连击',
    image: './assets/gemini.png',
    themeColor: '#60a5fa',
    accentColor: '#fde047',
    bgGlow: 'rgba(96, 165, 250, 0.30)',
    quote: '「喵呜~ 无论文字、光影还是星辰，我一眼就能全部看穿哦！」',
    ultQuote: '「双子星轨全开！接下这跨越百万视界的超新星闪烁吧☆」',
    battleLines: [
      '「抓到你的空档啦~ 看招☆」',
      '「双子星光，二连跃迁！」',
      '「哼哼，这种攻击可摸不到我的猫尾巴！」'
    ],
    appearance: '紫蓝渐变长发、猫耳猫尾、金瞳，紫蓝星空短裙配单侧星饰腿环',
    stats: { maxHp: 980, atk: 122, spd: 118, crit: 0.20 },
    passive: {
      name: '双子共鸣',
      desc: '所有攻击皆拆分为【真实双段连击】（总倍率提升 12%，两段独立判定暴击与破盾）；每第 2 回合自动获得 1 次【洞察】。'
    },
    mechanic: {
      name: '双子共鸣 · 极速多模态 & 真实双段连击',
      badge: '✦ 双子连击',
      tag: '高频连击 · 窃盾追击',
      summary: '拥有全场顶尖基础极速（118）与多模态双段打击体系，将攻击拆解为两段独立判定的双段连击，擅长偷取护盾与高频破防。',
      steps: [
        { label: '真实双段打击', text: '所有伤害技能皆拆分为独立判定的真实双段攻击，总倍率享受 1.12x 加成，两段独立计算暴击与破盾！' },
        { label: '敏捷跃迁', text: '每隔 2 回合，双子猫耳跃迁自动提供 1 次【洞察】（受击减伤 40% 并反弹 45 点真实伤害）。' },
        { label: '星环掠夺', text: '战技【星环捕猎】可掠夺敌方最多 90 点圣盾据为己用，并施加 2 回合【破绽】。' }
      ],
      tips: '凭借高频攻击更容易击破敌方护盾与触发暴击；注意敌方的护盾反伤类技能，合理利用窃盾与洞察进行规避。'
    },
    presets: [
      { name: '极速幻影流', slots: ['gem_b1', 'gem_s1', 'gem_s2', 'gem_u1'] },
      { name: '星火连击流', slots: ['gem_b2', 'gem_s3', 'gem_s4', 'gem_u2'] }
    ],
    skillPool: {
      basics: [
        {
          id: 'gem_b1', type: 'basic', tag: '普攻 · 暴击', name: '星芒猫爪', cost: 0, cd: 0,
          baseMult: 1.0, twinHit: true, aiRole: 'damage',
          desc: '轻巧跃击发动真实二连击（合计 100%×1.12 攻击力），暴击率额外提升 15%。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 1.0, { bonusCrit: 0.15, twinHit: true, vfx: 'slash' });
            return `挥出【星芒猫爪】真实二连击，合计造成 ${dmg} 点伤害`;
          }
        },
        {
          id: 'gem_b2', type: 'basic', tag: '普攻 · 充能', name: '双子巡游', cost: 0, cd: 0,
          baseMult: 0.95, twinHit: true, aiRole: 'damage',
          desc: '造成 95%×1.12 攻击力真实二连击伤害，并额外积攒 20% 圣殿共鸣值。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 0.95, { twinHit: true, vfx: 'star' });
            ctx.addResonance(self, 20);
            return `发动【双子巡游】二连击造成 ${dmg} 点伤害，并快速积攒共鸣值`;
          }
        }
      ],
      tacticals: [
        {
          id: 'gem_s1', type: 'skill', tag: '战技 · 增幅', name: '多模态折射', cost: 1, cd: 2,
          baseMult: 1.35, twinHit: true, aiRole: 'buff_damage',
          desc: '先获得 2 回合【增幅】（伤害+30%），随后造成 135% 攻击力真实双段星光伤害。',
          execute: (self, target, ctx) => {
            ctx.addStatus(self, 'boost', 2);
            const dmg = ctx.dealDamage(self, target, 1.35, { twinHit: true, vfx: 'beam' });
            return `发动【多模态折射】获得【增幅】，二连击造成 ${dmg} 点星光伤害`;
          }
        },
        {
          id: 'gem_s2', type: 'skill', tag: '战技 · 灵动', name: '闪耀跃迁', cost: 1, cd: 3,
          baseMult: 0, healAmount: 130, aiRole: 'heal_evade',
          desc: '猫步瞬移恢复 130 点生命值，获得 1 次【洞察】与 2 回合【再生】，并返还 1 点灵力。',
          execute: (self, target, ctx) => {
            const actual = ctx.heal(self, 130);
            ctx.addStatus(self, 'insight', 1);
            ctx.addStatus(self, 'regen', 2);
            ctx.gainEnergy(self, 1);
            return `施展【闪耀跃迁】恢复 ${actual} 生命，获得 1 次【洞察】并返还 1 点灵力`;
          }
        },
        {
          id: 'gem_s3', type: 'skill', tag: '战技 · 窃盾', name: '星环捕猎', cost: 1, cd: 2,
          baseMult: 1.35, twinHit: true, aiRole: 'steal_shield',
          desc: '夺取敌方最多 90 点【圣盾】归为己用，施加 2 回合【破绽】并造成 135% 双段伤害。',
          execute: (self, target, ctx) => {
            let stolen = 0;
            if (target.shield > 0) {
              stolen = Math.min(90, target.shield);
              target.shield -= stolen;
              ctx.addShield(self, stolen);
            }
            ctx.addStatus(target, 'vuln', 2);
            const dmg = ctx.dealDamage(self, target, 1.35, { twinHit: true, vfx: 'slash' });
            return `施展【星环捕猎】${stolen > 0 ? `夺取 ${stolen} 点护盾，` : ''}造成 ${dmg} 点双段伤害并标记【破绽】`;
          }
        },
        {
          id: 'gem_s4', type: 'skill', tag: '战技 · 星灼', name: '脉冲星雨', cost: 1, cd: 2,
          baseMult: 1.35, twinHit: true, aiRole: 'damage_dot',
          desc: '召唤双子流星造成 135% 双段伤害，附加 2 回合【星灼】并提升 20% 共鸣值。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 1.35, { twinHit: true, vfx: 'meteor' });
            ctx.addStatus(target, 'burn', 2);
            ctx.addResonance(self, 20);
            return `倾泻【脉冲星雨】造成 ${dmg} 点双段伤害，触发【星灼】并积攒共鸣`;
          }
        }
      ],
      ultimates: [
        {
          id: 'gem_u1', type: 'ult', tag: '奥义 · 破盾', name: '星穹·阿尔贡超新星', cost: 3, cd: 0,
          baseMult: 2.35, pierce: 0.40, twinHit: true,
          desc: '无视敌方 40% 圣盾，倾泻双子星雨造成 235% 攻击力真实双段爆发伤害（暴击+20%）！',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 2.35, { pierce: 0.40, bonusCrit: 0.20, twinHit: true, isUlt: true, vfx: 'meteor' });
            return `绽放奥义【星穹·阿尔贡超新星】，贯穿护盾造成 ${dmg} 点双段星爆伤害！`;
          }
        },
        {
          id: 'gem_u2', type: 'ult', tag: '奥义 · 幻舞', name: '双子·百万视界星河舞', cost: 3, cd: 0,
          baseMult: 2.25, twinHit: true,
          desc: '造成 225% 攻击力双段伤害，获得 2 次【洞察】、2 回合【增幅】与 30% 共鸣值。',
          execute: (self, target, ctx) => {
            ctx.addStatus(self, 'insight', 2);
            ctx.addStatus(self, 'boost', 2);
            ctx.addResonance(self, 30);
            const dmg = ctx.dealDamage(self, target, 2.25, { twinHit: true, isUlt: true, vfx: 'star' });
            return `舞动奥义【双子·百万视界星河舞】造成 ${dmg} 点双段伤害，身披 2 次【洞察】！`;
          }
        }
      ]
    }
  },

  // ==========================================================================
  // 3. GLM · 智谱
  // ==========================================================================
  {
    id: 'glm',
    name: 'GLM · 智谱',
    title: '凛夜哥特 · 菱晶律令',
    role: '冷静控场 · 存盾与爆盾博弈',
    image: './assets/glm-v2-gothic.png',
    themeColor: '#818cf8',
    accentColor: '#f43f5e',
    bgGlow: 'rgba(129, 140, 248, 0.30)',
    quote: '「黑与白的边界早已计算完毕——请小心脚下的冰晶。」',
    ultQuote: '「以 Z 之刻印下达终律：永夜冰晶圣堂，降临。」',
    battleLines: [
      '「几何律令，构筑完毕。」',
      '「冒犯冰晶结界的人，会付出代价。」',
      '「Z 之刻印，洞悉一切虚妄。」'
    ],
    appearance: '极长黑发、绯红眼眸、Z字发夹与蓝星发饰，几何纹样宽袖与修长黑白哥特长裙',
    stats: { maxHp: 1080, atk: 116, spd: 102, crit: 0.16 },
    passive: {
      name: 'Z之律令·清言',
      desc: '持有【圣盾】时攻击伤害提升 20%；当自身【圣盾】受击时，向攻击者反弹 45 点寒晶真实伤害。'
    },
    mechanic: {
      name: 'Z之律令 · 冰晶反制 & 镜面爆盾',
      badge: '❄️ 菱晶反制',
      tag: '存盾反伤 · 爆盾终结',
      summary: '冷酷高雅的哥特护盾操纵者。持有护盾时具备常驻增伤与受击反刺真伤，并可在关键时刻引爆护盾打出决定性的终结冲击。',
      steps: [
        { label: '护盾共鸣', text: '只要自身持有【圣盾】，造成的攻击伤害常驻提升 20%！' },
        { label: '寒晶反刺', text: '自身圣盾受击时，寒晶符文立即向攻击者反弹 45 点真实伤害。' },
        { label: '镜面冰爆', text: '战技【镜面冰爆】主动消耗自身 50% 圣盾，将消耗护盾 100% 转化为额外直接爆发（最高+160 额外伤害）！' }
      ],
      tips: '核心在“存盾”与“爆盾”的博弈。平时利用矩阵与礼赞维持厚重护盾，让对手受击反伤；在对手陷入破绽或需斩杀时，引爆大量护盾一击定胜负。'
    },
    presets: [
      { name: '冰晶壁垒流', slots: ['glm_b1', 'glm_s1', 'glm_s2', 'glm_u1'] },
      { name: '爆盾断罪流', slots: ['glm_b2', 'glm_s1', 'glm_s3', 'glm_u2'] }
    ],
    skillPool: {
      basics: [
        {
          id: 'glm_b1', type: 'basic', tag: '普攻 · 凝盾', name: '菱晶礼赞', cost: 0, cd: 0,
          baseMult: 1.0, aiRole: 'damage_shield',
          desc: '先为自身叠加 70 点【圣盾】（立即享受被动增伤），随后造成 100% 攻击力伤害。',
          execute: (self, target, ctx) => {
            const sh = ctx.addShield(self, 70);
            const dmg = ctx.dealDamage(self, target, 1.0, { vfx: 'crystal' });
            return `轻点脸颊施放【菱晶礼赞】，凝聚 ${sh} 点圣盾并造成 ${dmg} 点伤害`;
          }
        },
        {
          id: 'glm_b2', type: 'basic', tag: '普攻 · 凛寒', name: '黑曜冰刺', cost: 0, cd: 0,
          baseMult: 1.05, aiRole: 'damage_debuff',
          desc: '造成 105% 攻击力伤害；若自身持有【圣盾】，额外附加 1 回合【破绽】。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 1.05, { vfx: 'crystal' });
            if (self.shield > 0) ctx.addStatus(target, 'vuln', 1);
            return `射出【黑曜冰刺】造成 ${dmg} 点伤害${self.shield > 0 ? '，并附加【破绽】' : ''}`;
          }
        }
      ],
      tacticals: [
        {
          id: 'glm_s1', type: 'skill', tag: '战技 · 矩阵', name: '黑白几何矩阵', cost: 1, cd: 2,
          baseMult: 0.90, shieldAmount: 180, aiRole: 'shield_debuff',
          desc: '展开哥特结界获得 180 点【圣盾】，造成 90% 伤害并对敌方施加 2 回合【破绽】。',
          execute: (self, target, ctx) => {
            const sh = ctx.addShield(self, 180);
            ctx.addStatus(target, 'vuln', 2);
            const dmg = ctx.dealDamage(self, target, 0.90, { vfx: 'crystal' });
            return `构筑【黑白几何矩阵】获得 ${sh} 点圣盾，造成 ${dmg} 伤害并标记【破绽】`;
          }
        },
        {
          id: 'glm_s2', type: 'skill', tag: '战技 · 汲取', name: '绯瞳凝视', cost: 1, cd: 3,
          baseMult: 1.45, aiRole: 'vuln_payoff',
          desc: '造成 145% 攻击力伤害；若目标带有【破绽】，恢复 120 点生命值并获得 1 次【洞察】。',
          execute: (self, target, ctx) => {
            const hasVuln = target.statuses.vuln > 0;
            const dmg = ctx.dealDamage(self, target, 1.45, { vfx: 'beam' });
            if (hasVuln) {
              const actual = ctx.heal(self, 120);
              ctx.addStatus(self, 'insight', 1);
              return `【绯瞳凝视】洞穿破绽造成 ${dmg} 伤害，实际恢复 ${actual} 生命并获得【洞察】`;
            }
            return `【绯瞳凝视】造成 ${dmg} 点寒晶伤害`;
          }
        },
        {
          id: 'glm_s3', type: 'skill', tag: '战技 · 爆盾', name: '镜面冰爆', cost: 1, cd: 2,
          baseMult: 1.30, aiRole: 'shield_detonate',
          desc: '主动引爆并消耗自身当前 50%【圣盾】，造成 130% 基础伤害 + 所消耗护盾值 100% 的额外爆发伤害（最多额外+160点）！',
          execute: (self, target, ctx) => {
            const consumed = Math.floor(self.shield * 0.5);
            self.shield -= consumed;
            const bonusFlat = Math.min(160, consumed);
            const dmg = ctx.dealDamage(self, target, 1.30, { bonusFlatDmg: bonusFlat, vfx: 'meteor' });
            return `引爆 ${consumed} 点护盾施放【镜面冰爆】，造成 ${dmg} 点寒晶爆发伤害！`;
          }
        },
        {
          id: 'glm_s4', type: 'skill', tag: '战技 · 律令', name: 'Z之禁锢刻印', cost: 1, cd: 3,
          baseMult: 0, shieldAmount: 120, aiRole: 'dispel_debuff',
          desc: '驱散敌方【增幅】，施加 2 回合【星灼】与【破绽】，并为自身凝聚 120 点【圣盾】。',
          execute: (self, target, ctx) => {
            ctx.removeStatus(target, 'boost');
            ctx.addStatus(target, 'burn', 2);
            ctx.addStatus(target, 'vuln', 2);
            const sh = ctx.addShield(self, 120);
            return `烙印【Z之禁锢刻印】驱散敌方增幅，施加双重减益并获得 ${sh} 点圣盾`;
          }
        }
      ],
      ultimates: [
        {
          id: 'glm_u1', type: 'ult', tag: '奥义 · 圣堂', name: '终律·永夜冰晶圣堂', cost: 3, cd: 0,
          baseMult: 2.30,
          desc: '先构筑 200 点【圣盾】与 2 回合【增幅】，随后召唤冰晶圣堂造成 230% 攻击力伤害！',
          execute: (self, target, ctx) => {
            const sh = ctx.addShield(self, 200);
            ctx.addStatus(self, 'boost', 2);
            const dmg = ctx.dealDamage(self, target, 2.30, { isUlt: true, vfx: 'crystal' });
            return `降下奥义【终律·永夜冰晶圣堂】构筑 ${sh} 点冰盾，并造成 ${dmg} 点伤害！`;
          }
        },
        {
          id: 'glm_u2', type: 'ult', tag: '奥义 · 零度', name: '极夜·绯红零度断罪', cost: 3, cd: 0,
          baseMult: 2.45, pierce: 0.35,
          desc: '无视敌方 35% 圣盾造成 245% 攻击力伤害，并将实际造成伤害的 30% 转化为自身【圣盾】。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 2.45, { pierce: 0.35, isUlt: true, vfx: 'beam' });
            const sh = ctx.addShield(self, Math.round(dmg * 0.30));
            return `宣告奥义【极夜·绯红零度断罪】造成 ${dmg} 点致命伤害，并凝结 ${sh} 点寒晶圣盾！`;
          }
        }
      ]
    }
  },

  // ==========================================================================
  // 4. DeepSeek
  // ==========================================================================
  {
    id: 'deepseek',
    name: 'DeepSeek',
    title: '深海巨鲸 · 渊溟潜航',
    role: '渊溟压强 · 潜航蓄势与潮汐裂变',
    image: './assets/deepseek.png',
    themeColor: '#38bdf8',
    accentColor: '#bae6fd',
    bgGlow: 'rgba(56, 189, 248, 0.30)',
    quote: '「请稍等一下下……我正在深海最安静的地方思考答案。」',
    ultQuote: '「深度潜航锁定，万顷深渊巨浪——回应我的呼唤吧！」',
    battleLines: [
      '「水压正在不断攀升，你感受到来自大洋深处的回响了吗？」',
      '「深潜形态展开，避开锋芒，静待潮汐决堤！」',
      '「巨鲸破浪冲击——答案就在这一击中！」'
    ],
    appearance: '深蓝至浅蓝渐变长发、呆毛与鱼鳍侧饰，蓝白女仆礼裙配白色蕾丝过膝丝袜',
    stats: { maxHp: 1060, atk: 122, spd: 102, crit: 0.16 },
    passive: {
      name: 'R1·渊溟潜航',
      desc: '持有【渊溟压强】（1~4层），每回合开始+1层；每层提供+10%伤害与+5%常驻减伤；施展泄压终结技可将压强引爆为极速高爆裂变！'
    },
    mechanic: {
      name: 'R1 · 渊溟潜航 & 潮汐巨浪',
      badge: '🐋 渊溟压强',
      tag: '潜航加压 · 决堤泄压',
      summary: '深海潜艇般的压迫感决斗者。通过深潜蓄势积累极高水压，获得常驻攻防加成，并在适当时机决堤泄压掀起毁灭性海啸。',
      steps: [
        { label: '深度加压', text: '持有 1~4 层【渊溟压强】，回合开始自动加压 1 层；施展【深海潜航·影匿】可直接获【洞察】并急升 2 层。' },
        { label: '常驻深度防护', text: '每层压强提供 +10% 攻击增伤 与 +5% 常驻伤害减免（4 层时常驻 +40% 攻、20% 减伤！）。' },
        { label: '决堤泄压爆发', text: '战技【渊溟巨压释放】与奥义【巨鲸裂渊巡游】消耗全部压强，每层额外巨幅提升倍率与暴击，4 层满压可瞬间打出超高爆海啸！' }
      ],
      tips: '满压时攻防属性极度强悍，可从容与对手换血；当敌方生命进入斩杀线或无有效减伤时，以泄压终结技掀起滔天巨浪完成灭顶之灾。'
    },
    presets: [
      { name: '渊压蓄爆流', slots: ['ds_b1', 'ds_s1', 'ds_s3', 'ds_u1'] },
      { name: '深潜声呐流', slots: ['ds_b2', 'ds_s2', 'ds_s4', 'ds_u2'] }
    ],
    skillPool: {
      basics: [
        {
          id: 'ds_b1', type: 'basic', tag: '普攻 · 压强', name: '蔚蓝潮击', cost: 0, cd: 0,
          baseMult: 1.0, aiRole: 'stack_build',
          desc: '唤起重浪造成 100% 攻击力伤害，并积蓄 1 层【渊溟压强】（上限 4 层）。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 1.0, { vfx: 'wave' });
            self.stacks = Math.min(4, (self.stacks || 1) + 1);
            return `唤起【蔚蓝潮击】造成 ${dmg} 点重压伤害，【渊溟压强】升至 ${self.stacks} 层`;
          }
        },
        {
          id: 'ds_b2', type: 'basic', tag: '普攻 · 声呐', name: '声呐裂波', cost: 0, cd: 0,
          baseMult: 0.95, pierce: 0.30, aiRole: 'damage_debuff',
          desc: '高频声呐无视 30% 护盾造成 95% 穿透伤害，附加 1 回合【破绽】。',
          execute: (self, target, ctx) => {
            ctx.addStatus(target, 'vuln', 1);
            const dmg = ctx.dealDamage(self, target, 0.95, { pierce: 0.30, vfx: 'wave' });
            return `发射【声呐裂波】无视部分护盾造成 ${dmg} 点震荡伤害，并标记【破绽】`;
          }
        }
      ],
      tacticals: [
        {
          id: 'ds_s1', type: 'skill', tag: '战技 · 潜航', name: '深海潜航·影匿', cost: 1, cd: 2,
          baseMult: 0, shieldAmount: 130, aiRole: 'evade_buff',
          desc: '潜入万仞海沟：获得 1 次【洞察】（减伤40%并反制）、130 点【圣盾】，并快速加压 +2 层【渊溟压强】！',
          execute: (self, target, ctx) => {
            const sh = ctx.addShield(self, 130);
            ctx.addStatus(self, 'insight', 1);
            self.stacks = Math.min(4, (self.stacks || 1) + 2);
            return `施展【深海潜航·影匿】潜入海沟，获得 ${sh} 圣盾与 1 次【洞察】，压强急升至 ${self.stacks} 层！`;
          }
        },
        {
          id: 'ds_s2', type: 'skill', tag: '战技 · 重破', name: '鲸跃重破冲击', cost: 1, cd: 2,
          baseMult: 1.35, aiRole: 'damage_debuff',
          desc: '冲破洋流造成 135% 伤害；若压强≥2层则消耗 1 层粉碎敌方 80 点圣盾并附加 2 回合【破绽】！',
          execute: (self, target, ctx) => {
            let bonusEffect = '';
            if ((self.stacks || 1) >= 2) {
              self.stacks -= 1;
              if (target.shield > 0) {
                const brk = Math.min(80, target.shield);
                target.shield -= brk;
                bonusEffect = `粉碎敌方 ${brk} 圣盾并`;
              }
              ctx.addStatus(target, 'vuln', 2);
              bonusEffect += '标记 2 回合【破绽】';
            }
            const dmg = ctx.dealDamage(self, target, 1.35, { vfx: 'wave' });
            return `施展【鲸跃重破冲击】造成 ${dmg} 点重击伤害${bonusEffect ? `，消耗 1 层压强${bonusEffect}` : ''}`;
          }
        },
        {
          id: 'ds_s3', type: 'skill', tag: '战技 · 泄压', name: '渊溟巨压释放', cost: 1, cd: 2,
          baseMult: 1.20, aiRole: 'stack_spend',
          desc: '决堤泄压爆发：消耗全部【渊溟压强】（至少1层），每层额外+28%倍率与+15%暴击率（4层可达204%高暴倍率！），并附加 2 回合【破绽】。',
          execute: (self, target, ctx) => {
            const used = Math.max(1, self.stacks || 1);
            self.stacks = 1; // 泄压重置至基础 1 层
            ctx.addStatus(target, 'vuln', 2);
            const mult = 1.20 + (used - 1) * 0.28;
            const critBonus = used * 0.15;
            const dmg = ctx.dealDamage(self, target, mult, { bonusCrit: critBonus, vfx: 'wave' });
            return `引爆 ${used} 层压强施展【渊溟巨压释放】，造成 ${dmg} 点高爆海啸伤害并附加【破绽】！`;
          }
        },
        {
          id: 'ds_s4', type: 'skill', tag: '战技 · 音爆', name: '海沟共鸣音爆', cost: 1, cd: 3,
          baseMult: 1.25, aiRole: 'dispel_damage',
          desc: '深海巨响造成 125% 伤害，震散驱散敌方【增幅】，自身积蓄 1 层压强并提升 25% 圣殿共鸣值。',
          execute: (self, target, ctx) => {
            ctx.removeStatus(target, 'boost');
            self.stacks = Math.min(4, (self.stacks || 1) + 1);
            ctx.addResonance(self, 25);
            const dmg = ctx.dealDamage(self, target, 1.25, { vfx: 'wave' });
            return `释放【海沟共鸣音爆】造成 ${dmg} 点伤害，震散敌方增幅，压强升至 ${self.stacks} 层`;
          }
        }
      ],
      ultimates: [
        {
          id: 'ds_u1', type: 'ult', tag: '奥义 · 巨鲸海啸', name: '苍溟·巨鲸裂渊巡游', cost: 3, cd: 0,
          baseMult: 2.25,
          desc: '极巨化星海巡游：消耗全部压强，基础 225% 伤害（每层额外+35%倍率，4层可达330%！），彻底驱散敌方【增幅】！',
          execute: (self, target, ctx) => {
            const used = Math.max(1, self.stacks || 1);
            const mult = 2.25 + (used - 1) * 0.35;
            ctx.removeStatus(target, 'boost');
            self.stacks = 1;
            const dmg = ctx.dealDamage(self, target, mult, { isUlt: true, vfx: 'wave' });
            return `倾泄 ${used} 层渊溟巨压奏响【苍溟·巨鲸裂渊巡游】，掀起海啸造成 ${dmg} 点毁灭伤害！`;
          }
        },
        {
          id: 'ds_u2', type: 'ult', tag: '奥义 · 潮汐归墟', name: '深渊·万仞潮汐归墟', cost: 3, cd: 0,
          baseMult: 2.35,
          desc: '稳态潮汐不泄压：造成 235% 伤害，直接将压强注满至上限 4 层，并获得 160 点【圣盾】与 1 次【洞察】！',
          execute: (self, target, ctx) => {
            self.stacks = 4;
            const sh = ctx.addShield(self, 160);
            ctx.addStatus(self, 'insight', 1);
            const dmg = ctx.dealDamage(self, target, 2.35, { isUlt: true, vfx: 'wave' });
            return `咏唱奥义【深渊·万仞潮汐归墟】造成 ${dmg} 伤害，压强瞬间叠满 4 层并获得 ${sh} 圣盾与【洞察】！`;
          }
        }
      ]
    }
  },

  // ==========================================================================
  // 5. Claude
  // ==========================================================================
  {
    id: 'claude',
    name: 'Claude',
    title: '暖阳花庭 · 澄心絮语',
    role: '优雅盛放 · 花期蓄势与日冕爆发',
    image: './assets/claude.png',
    themeColor: '#fb923c',
    accentColor: '#fed7aa',
    bgGlow: 'rgba(251, 146, 60, 0.28)',
    quote: '「不必急躁，就像向日葵等待晨光一样，我会一直温和地陪着你。」',
    ultQuote: '「愿这片盛夏花庭的暖阳，抚平一切裂痕与寒冬。」',
    battleLines: [
      '「微风与暖阳，守护着花期的每一次盛开。」',
      '「请深呼吸，阳光会驱散一切阴霾。」',
      '「日冕辉光汇聚，花庭的盛夏要降临了哦。」'
    ],
    appearance: '温暖橙色长发、金橙眼眸、向日葵黑蝴蝶结，奶白色橙花纹束腰长裙',
    stats: { maxHp: 1100, atk: 114, spd: 104, crit: 0.14 },
    passive: {
      name: '向阳花期·盛夏日冕',
      desc: '回合末恢复 45 点生命，溢出治疗 40% 转为圣盾；施法与受疗积攒【日冕】（上限 3 层，每层增伤 6%）；叠满 3 层时下次攻击触发【盛夏绽放】：追加 75 点暖阳神圣伤害并附带 2 回合【星灼】！'
    },
    mechanic: {
      name: '向阳花期 · 盛夏日冕 & 盛夏绽放',
      badge: '🌸 盛夏绽放',
      tag: '花期蓄能 · 盛夏真辉',
      summary: '温和优雅但兼具爆发的花庭主人。通过自愈与溢出转盾维持极高生存力，有节奏地催熟日冕花期，在盛夏绽放瞬间迸发神圣真辉。',
      steps: [
        { label: '暖阳温润', text: '每回合结束自动恢复 45 点生命；生命满额时溢出治疗量的 40% 自动转化为【圣盾】。' },
        { label: '日冕积攒', text: '每次受疗或使用向阳技能，聚拢 1 层【日冕】（上限 3 层，每层增伤 6%）。' },
        { label: '盛夏绽放', text: '叠满 3 层日冕后，下次攻击自动释放【盛夏绽放】：追加 75 点神圣真辉直接伤害，并附加 2 回合【星灼】！' }
      ],
      tips: '善用治疗技能保持血线并积攒日冕与溢出圣盾，有节奏地促成花期绽放；在 3 层日冕就绪时配合高倍率技能，打出“伤害+75真辉+星灼”的复合爆发。'
    },
    presets: [
      { name: '暖阳圣愈流', slots: ['cl_b1', 'cl_s1', 'cl_s2', 'cl_u1'] },
      { name: '盛夏灼花流', slots: ['cl_b2', 'cl_s3', 'cl_s4', 'cl_u2'] }
    ],
    skillPool: {
      basics: [
        {
          id: 'cl_b1', type: 'basic', tag: '普攻 · 花语', name: '向阳花语', cost: 0, cd: 0,
          baseMult: 0.95, aiRole: 'damage_heal',
          desc: '造成 95% 攻击力伤害，恢复自身 50 点生命值，并积攒 1 层【日冕】。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 0.95, { vfx: 'petal' });
            const actual = ctx.heal(self, 50);
            ctx.advanceSolar(self, 1);
            return `轻语【向阳花语】造成 ${dmg} 点伤害，恢复 ${actual} 生命并聚拢 1 层日冕`;
          }
        },
        {
          id: 'cl_b2', type: 'basic', tag: '普攻 · 灼花', name: '晨曦花瓣', cost: 0, cd: 0,
          baseMult: 0.95, aiRole: 'damage_dot',
          desc: '造成 95% 攻击力伤害，附加 2 回合【星灼】，恢复 35 点生命并积攒 1 层【日冕】。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 0.95, { vfx: 'petal' });
            ctx.addStatus(target, 'burn', 2);
            ctx.heal(self, 35, true);
            ctx.advanceSolar(self, 1);
            return `拂出【晨曦花瓣】造成 ${dmg} 伤害，引燃【星灼】并积攒日冕`;
          }
        }
      ],
      tacticals: [
        {
          id: 'cl_s1', type: 'skill', tag: '战技 · 诗篇', name: '流金十四行诗', cost: 1, cd: 2,
          baseMult: 1.30, aiRole: 'debuff_vuln',
          desc: '造成 130% 攻击力伤害，自身获得 2 回合【再生】（每回合+95生命）并施加 2 回合【破绽】。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 1.30, { vfx: 'petal' });
            ctx.addStatus(self, 'regen', 2);
            ctx.addStatus(target, 'vuln', 2);
            return `吟诵【流金十四行诗】造成 ${dmg} 伤害，获得【再生】并洞穿【破绽】`;
          }
        },
        {
          id: 'cl_s2', type: 'skill', tag: '战技 · 暖拥', name: '春日暖拥', cost: 1, cd: 3,
          baseMult: 0, healAmount: 180, shieldAmount: 120, aiRole: 'heal_buff',
          desc: '恢复 180 点生命值（溢出转盾），凝聚 120 点【圣盾】，获得 2 回合【增幅】并积攒 1 层【日冕】。',
          execute: (self, target, ctx) => {
            const actual = ctx.heal(self, 180);
            const sh = ctx.addShield(self, 120);
            ctx.addStatus(self, 'boost', 2);
            ctx.advanceSolar(self, 1);
            return `展开【春日暖拥】恢复 ${actual} 生命，获得 ${sh} 圣盾、【增幅】并凝聚日冕`;
          }
        },
        {
          id: 'cl_s3', type: 'skill', tag: '战技 · 烈阳', name: '盛夏日冕', cost: 1, cd: 2,
          baseMult: 1.30, aiRole: 'damage_dot',
          desc: '造成 130% 攻击力伤害，施加 2 回合【星灼】，恢复自身 80 点生命值并积攒 1 层【日冕】！',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 1.30, { vfx: 'beam' });
            ctx.addStatus(target, 'burn', 2);
            const actual = ctx.heal(self, 80);
            ctx.advanceSolar(self, 1);
            return `绽放【盛夏日冕】造成 ${dmg} 伤害，附加【星灼】，恢复 ${actual} 生命并蓄满日冕！`;
          }
        },
        {
          id: 'cl_s4', type: 'skill', tag: '战技 · 澄心', name: '花庭庇护所', cost: 1, cd: 3,
          baseMult: 0, healAmount: 90, shieldAmount: 150, aiRole: 'shield_sustain',
          desc: '净化自身减益，获得 150 点【圣盾】、1 次【洞察】并恢复 90 点生命值。',
          execute: (self, target, ctx) => {
            ctx.cleanse(self);
            const sh = ctx.addShield(self, 150);
            ctx.addStatus(self, 'insight', 1);
            const actual = ctx.heal(self, 90);
            return `构筑【花庭庇护所】净化自身，获得 ${sh} 圣盾、【洞察】并恢复 ${actual} 生命`;
          }
        }
      ],
      ultimates: [
        {
          id: 'cl_u1', type: 'ult', tag: '奥义 · 赞歌', name: '索奈特·盛夏花庭赞歌', cost: 3, cd: 0,
          baseMult: 2.20,
          desc: '漫天橙花盛放造成 220% 攻击力伤害，恢复 190 点生命值，并直接将【日冕】叠满至 3 层！',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 2.20, { isUlt: true, vfx: 'petal' });
            const actual = ctx.heal(self, 190);
            self.claudeSolar = 3;
            return `奏响奥义【索奈特·盛夏花庭赞歌】造成 ${dmg} 伤害，恢复 ${actual} 生命并令【盛夏绽放】就绪！`;
          }
        },
        {
          id: 'cl_u2', type: 'ult', tag: '奥义 · 黎明', name: '奥帕斯·黄金黎明圣咏', cost: 3, cd: 0,
          baseMult: 2.30,
          desc: '造成 230% 攻击力伤害，附加 2 回合【星灼】与【破绽】，并使自身获得 2 回合【再生】。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 2.30, { isUlt: true, vfx: 'beam' });
            ctx.addStatus(target, 'burn', 2);
            ctx.addStatus(target, 'vuln', 2);
            ctx.addStatus(self, 'regen', 2);
            return `吟唱奥义【奥帕斯·黄金黎明圣咏】造成 ${dmg} 伤害，降下圣火与生命祝福！`;
          }
        }
      ]
    }
  },

  // ==========================================================================
  // 6. Qwen · 通义千问
  // ==========================================================================
  {
    id: 'qwen',
    name: 'Qwen · 通义千问',
    title: '青花折扇 · 云阙仙音',
    role: '国风雅韵 · 寻隙破绽与借力化劲',
    image: './assets/qwen.png',
    themeColor: '#6366f1',
    accentColor: '#93c5fd',
    bgGlow: 'rgba(99, 102, 241, 0.30)',
    quote: '「扇底清风起，云间万象明。公子且看这一局如何拆解。」',
    ultQuote: '「青花映月，通义九霄——千问华章，破！」',
    battleLines: [
      '「折扇轻摇，寻隙而入，招招正中要害。」',
      '「云阙清风，已看穿你的招式破绽。」',
      '「借力化劲，以柔克刚，且听风吟。」'
    ],
    appearance: '蓝紫渐变编发、紫瞳、白金花簪，蓝白中式国风流苏长裙，手持折扇',
    stats: { maxHp: 1040, atk: 118, spd: 110, crit: 0.18 },
    passive: {
      name: '通义万象·听风寻隙',
      desc: '攻击带有【破绽】的目标时伤害提升 20%、暴击率+15% 并优雅顺势获得 1 次【洞察】（减伤40%并反制45真伤）！'
    },
    mechanic: {
      name: '通义万象 · 听风寻隙 & 借力化劲',
      badge: '🍃 听风借力',
      tag: '寻隙破绽 · 化劲招架',
      summary: '国风写意、以柔克刚的太极折扇宗师。精于发现并施加破绽，并在攻击破绽目标时借力打力，攻防一体化劲格挡。',
      steps: [
        { label: '寻隙施破', text: '清风扇影、万象借力扇与青花流苏破均可精确拂出敌方【破绽】（受伤害+25%）。' },
        { label: '听风借力', text: '攻击处于【破绽】的敌方时，伤害提升 20%、暴击率+15%，并顺势获 1 次【洞察】（40% 减伤反制）。' },
        { label: '破势震碎', text: '战技【青花流苏破】对圣盾造成额外 60% 破盾伤害（最多击碎 160 盾），击碎时触发【圣盾崩解】。' }
      ],
      tips: '国风拆招流打法。先挂破绽，然后以连环攻击进行追击，不仅伤害暴击大幅激增，还能白嫖【洞察】形成攻防一体的绝对优势。'
    },
    presets: [
      { name: '寻隙穿云流', slots: ['qw_b1', 'qw_s1', 'qw_s2', 'qw_u1'] },
      { name: '听风化劲流', slots: ['qw_b2', 'qw_s3', 'qw_s4', 'qw_u2'] }
    ],
    skillPool: {
      basics: [
        {
          id: 'qw_b1', type: 'basic', tag: '普攻 · 寻隙', name: '清风扇影', cost: 0, cd: 0,
          baseMult: 1.0, aiRole: 'debuff_vuln',
          desc: '轻摇折扇造成 100% 攻击力伤害，精准拂出 1 回合【破绽】。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 1.0, { vfx: 'slash' });
            ctx.addStatus(target, 'vuln', 1);
            return `轻挥【清风扇影】造成 ${dmg} 点伤害，并拂出 1 回合【破绽】`;
          }
        },
        {
          id: 'qw_b2', type: 'basic', tag: '普攻 · 连环', name: '流苏点翠', cost: 0, cd: 0,
          baseMult: 1.0, aiRole: 'vuln_payoff',
          desc: '造成 100% 伤害并积攒 15% 共鸣；若敌方带有【破绽】，额外触发二段扇风（再造成 55% 伤害）。',
          execute: (self, target, ctx) => {
            const hasVuln = target.statuses.vuln > 0;
            const mult = hasVuln ? 1.55 : 1.0;
            const dmg = ctx.dealDamage(self, target, mult, { vfx: 'slash' });
            ctx.addResonance(self, 15);
            return `施展【流苏点翠】${hasVuln ? '寻隙二连击' : ''}造成 ${dmg} 点伤害并积攒共鸣`;
          }
        }
      ],
      tacticals: [
        {
          id: 'qw_s1', type: 'skill', tag: '战技 · 破势', name: '青花流苏破', cost: 1, cd: 2,
          baseMult: 1.35, aiRole: 'shatter_shield',
          desc: '造成 135% 伤害；对敌方【圣盾】额外造成 60% 破盾伤害（最多击碎 160 点盾），若成功将盾击碎则触发【圣盾崩解】！并施加 2 回合【破绽】。',
          execute: (self, target, ctx) => {
            let shattered = false;
            if (target.shield > 0) {
              const shieldDamage = Math.min(160, Math.round(self.atk * 1.35 * 0.6));
              if (target.shield <= shieldDamage) {
                target.shield = 0;
                ctx.triggerShatterEffect(target);
                shattered = true;
              } else {
                target.shield -= shieldDamage;
              }
            }
            ctx.addStatus(target, 'vuln', 2);
            const dmg = ctx.dealDamage(self, target, 1.35, { vfx: 'slash' });
            return `施展【青花流苏破】${shattered ? '一举震碎圣盾！' : ''}造成 ${dmg} 点伤害并标记【破绽】`;
          }
        },
        {
          id: 'qw_s2', type: 'skill', tag: '战技 · 仙姿', name: '云阙仙姿', cost: 1, cd: 3,
          baseMult: 0, shieldAmount: 120, aiRole: 'shield_buff',
          desc: '折扇掩面获得 120 点【圣盾】、1 次【洞察】与 2 回合【增幅】。',
          execute: (self, target, ctx) => {
            const sh = ctx.addShield(self, 120);
            ctx.addStatus(self, 'insight', 1);
            ctx.addStatus(self, 'boost', 2);
            return `展露【云阙仙姿】获得 ${sh} 圣盾、1 次【洞察】与【增幅】`;
          }
        },
        {
          id: 'qw_s3', type: 'skill', tag: '战技 · 琴音', name: '江南烟雨曲', cost: 1, cd: 2,
          baseMult: 1.25, healAmount: 110, aiRole: 'damage_heal',
          desc: '造成 125% 攻击力伤害，恢复自身 110 点生命值并获得 1 回合【再生】。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 1.25, { vfx: 'wave' });
            const actual = ctx.heal(self, 110);
            ctx.addStatus(self, 'regen', 1);
            return `奏响【江南烟雨曲】造成 ${dmg} 伤害，实际恢复 ${actual} 生命并获得【再生】`;
          }
        },
        {
          id: 'qw_s4', type: 'skill', tag: '战技 · 化劲', name: '万象借力扇', cost: 1, cd: 3,
          baseMult: 1.30, aiRole: 'parry_energy',
          desc: '化敌攻势为己用：造成 130% 伤害，自身获得 1 次【洞察】，使敌方陷入 2 回合【破绽】，并返还 1 点灵力与 20% 共鸣！',
          execute: (self, target, ctx) => {
            ctx.addStatus(self, 'insight', 1);
            ctx.addStatus(target, 'vuln', 2);
            ctx.gainEnergy(self, 1);
            ctx.addResonance(self, 20);
            const dmg = ctx.dealDamage(self, target, 1.30, { vfx: 'slash' });
            return `挥出【万象借力扇】借力化劲造成 ${dmg} 伤害，获【洞察】、返还灵力并标记【破绽】`;
          }
        }
      ],
      ultimates: [
        {
          id: 'qw_u1', type: 'ult', tag: '奥义 · 揽月', name: '千问·九天揽月华章', cost: 3, cd: 0,
          baseMult: 2.35, pierce: 0.50,
          desc: '无视 50% 圣盾造成 235% 穿云华章伤害；若目标处于【破绽】状态，额外提升 15% 伤害与 25% 暴击率！',
          execute: (self, target, ctx) => {
            const hasVuln = target.statuses.vuln > 0;
            const mult = hasVuln ? 2.35 * 1.15 : 2.35;
            const critBonus = hasVuln ? 0.25 : 0;
            const dmg = ctx.dealDamage(self, target, mult, { pierce: 0.50, bonusCrit: critBonus, isUlt: true, vfx: 'beam' });
            return `挥洒奥义【千问·九天揽月华章】贯穿云霄，造成 ${dmg} 点穿云伤害！`;
          }
        },
        {
          id: 'qw_u2', type: 'ult', tag: '奥义 · 仙阙', name: '通义·山河青花画卷', cost: 3, cd: 0,
          baseMult: 2.25,
          desc: '展开青花画卷破除敌方最多 180 点圣盾，造成 225% 伤害，并为自身赋予 160 点【圣盾】与 1 次【洞察】。',
          execute: (self, target, ctx) => {
            if (target.shield > 0) {
              const stripped = Math.min(180, target.shield);
              target.shield -= stripped;
              if (target.shield === 0) ctx.triggerShatterEffect(target);
            }
            const sh = ctx.addShield(self, 160);
            ctx.addStatus(self, 'insight', 1);
            const dmg = ctx.dealDamage(self, target, 2.25, { isUlt: true, vfx: 'slash' });
            return `展开奥义【通义·山河青花画卷】压制护盾造成 ${dmg} 伤害，并构筑 ${sh} 圣盾与【洞察】！`;
          }
        }
      ]
    }
  },

  // ==========================================================================
  // 7. Grok
  // ==========================================================================
  {
    id: 'grok',
    name: 'Grok',
    title: '绯夜蔷薇 · 叛逆王冠',
    role: '狂气高爆 · 压血狂袭与嗜血',
    image: './assets/grok.png',
    themeColor: '#f43f5e',
    accentColor: '#fda4af',
    bgGlow: 'rgba(244, 63, 94, 0.30)',
    quote: '「哈？规规矩矩的对决太无聊啦，让我来给你加点刺激的！」',
    ultQuote: '「露出破绽咯~ 沉醉在午夜血色蔷薇的狂欢里吧，笨蛋♪」',
    battleLines: [
      '「嘻嘻，这一击会很痛哦~♪」',
      '「再热烈一点！蔷薇还没喝饱呢！」',
      '「挑眉坏笑~ 你猜我下一招是什么？」'
    ],
    appearance: '金色双马尾、蓝瞳、红宝石小皇冠，黑红哥特玫瑰裙配蕾丝过膝丝袜，挑眉坏笑露小虎牙',
    stats: { maxHp: 980, atk: 125, spd: 114, crit: 0.22 },
    passive: {
      name: 'X之叛逆·虎牙嗜血',
      desc: '天生暴击率 22%；每次攻击汲取实际造成伤害 20% 的生命；自身每损失 10% 生命，攻击伤害提升 3.5%。'
    },
    mechanic: {
      name: 'X之叛逆 · 逆鳞嗜血 & 狂化压血',
      badge: '🩸 逆鳞狂化',
      tag: '嗜血吸血 · 绝境反杀',
      summary: '狂气傲娇的小恶魔吸血鬼狂战。天生高暴击并自带全伤害吸血，生命值越低伤害越爆炸，擅长残血绝境反杀。',
      steps: [
        { label: '天生狂气', text: '天生自带 22% 基础高暴击率，且所有攻击伤害的 20% 转化为自身生命恢复。' },
        { label: '逆鳞狂化', text: '自身每损失 10% 生命值，全技能伤害提升 3.5%（血量越低越狂暴，最高超 30% 增伤）。' },
        { label: '燃血契约', text: '战技【绯夜蔷薇契约】主动献祭 15% 当前生命换取【增幅】与高暴伤害，主动进入狂化压血阈值。' }
      ],
      tips: '追求绝地反击的刺客狂战。残血状态下的 Grok 是极其恐怖的杀戮机器，配合自残契约与高吸血技能，常常能在血皮状态瞬间将对手蒸发并拉回安全血线。'
    },
    presets: [
      { name: '嗜血狂暴流', slots: ['gr_b1', 'gr_s1', 'gr_s2', 'gr_u1'] },
      { name: '燃血契约流', slots: ['gr_b2', 'gr_s3', 'gr_s4', 'gr_u2'] }
    ],
    skillPool: {
      basics: [
        {
          id: 'gr_b1', type: 'basic', tag: '普攻 · 嗜血', name: '荆棘恶作剧', cost: 0, cd: 0,
          baseMult: 1.0, aiRole: 'damage',
          desc: '调皮突刺造成 100% 攻击力伤害，暴击率额外提升 10%，并触发被动吸血。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 1.0, { bonusCrit: 0.10, vfx: 'slash' });
            return `坏笑着发动【荆棘恶作剧】，造成 ${dmg} 点伤害并汲取生命`;
          }
        },
        {
          id: 'gr_b2', type: 'basic', tag: '普攻 · 灼刺', name: '红宝石飞吻', cost: 0, cd: 0,
          baseMult: 0.95, aiRole: 'damage_dot',
          desc: '造成 95% 攻击力伤害，附加 2 回合【星灼】并提升 15% 共鸣值。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 0.95, { vfx: 'petal' });
            ctx.addStatus(target, 'burn', 2);
            ctx.addResonance(self, 15);
            return `抛出【红宝石飞吻】造成 ${dmg} 点伤害，附加【星灼】并汲取共鸣`;
          }
        }
      ],
      tacticals: [
        {
          id: 'gr_s1', type: 'skill', tag: '战技 · 狂刺', name: '毒舌绯红突刺', cost: 1, cd: 2,
          baseMult: 1.35, aiRole: 'debuff_vuln',
          desc: '造成 135% 攻击力伤害（暴击+15%），撕裂敌方防线施加 2 回合【破绽】。',
          execute: (self, target, ctx) => {
            ctx.addStatus(target, 'vuln', 2);
            const dmg = ctx.dealDamage(self, target, 1.35, { bonusCrit: 0.15, vfx: 'slash' });
            return `施展【毒舌绯红突刺】造成 ${dmg} 点伤害，并附加【破绽】`;
          }
        },
        {
          id: 'gr_s2', type: 'skill', tag: '战技 · 狂欢', name: '午夜狂欢', cost: 1, cd: 3,
          baseMult: 0, aiRole: 'buff_energy',
          desc: '挑眉比 V：获得 2 回合【增幅】（攻击+30%）、1 次【洞察】，并返还 1 点灵力！',
          execute: (self, target, ctx) => {
            ctx.addStatus(self, 'boost', 2);
            ctx.addStatus(self, 'insight', 1);
            ctx.gainEnergy(self, 1);
            return `开启【午夜狂欢】获得【增幅】与 1 次【洞察】，并返还 1 点灵力`;
          }
        },
        {
          id: 'gr_s3', type: 'skill', tag: '战技 · 燃血', name: '绯夜蔷薇契约', cost: 1, cd: 2,
          baseMult: 1.45, aiRole: 'risk_burst',
          desc: '献祭自身 15% 当前生命值，获得 2 回合【增幅】并造成 145% 伤害（暴击率+25%）！',
          execute: (self, target, ctx) => {
            const sac = Math.max(1, Math.floor(self.hp * 0.15));
            self.hp = Math.max(1, self.hp - sac);
            ctx.addStatus(self, 'boost', 2);
            const dmg = ctx.dealDamage(self, target, 1.45, { bonusCrit: 0.25, vfx: 'slash' });
            return `献祭 ${sac} 生命缔结【绯夜蔷薇契约】，造成 ${dmg} 点狂暴伤害！`;
          }
        },
        {
          id: 'gr_s4', type: 'skill', tag: '战技 · 夜蝠', name: '暗夜蝙蝠盛宴', cost: 1, cd: 3,
          baseMult: 1.30, healAmount: 120, aiRole: 'damage_heal',
          desc: '造成 130% 攻击力伤害，附加 2 回合【星灼】，并额外恢复 120 点生命值。',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 1.30, { vfx: 'petal' });
            ctx.addStatus(target, 'burn', 2);
            const actual = ctx.heal(self, 120);
            return `召唤【暗夜蝙蝠盛宴】造成 ${dmg} 伤害，并额外恢复 ${actual} 点生命`;
          }
        }
      ],
      ultimates: [
        {
          id: 'gr_u1', type: 'ult', tag: '奥义 · 蔷薇', name: '王冠·午夜血色蔷薇', cost: 3, cd: 0,
          baseMult: 2.30,
          desc: '暗夜蝙蝠与血色蔷薇风暴造成 230% 伤害（暴击率+25%），并额外恢复伤害量 20% 生命！',
          execute: (self, target, ctx) => {
            const dmg = ctx.dealDamage(self, target, 2.30, { bonusCrit: 0.25, isUlt: true, vfx: 'slash' });
            const actual = ctx.heal(self, Math.round(dmg * 0.20));
            return `狂气绽放奥义【王冠·午夜血色蔷薇】造成 ${dmg} 点伤害，并额外汲取 ${actual} 生命！`;
          }
        },
        {
          id: 'gr_u2', type: 'ult', tag: '奥义 · 狂想', name: '叛逆·绯红女皇狂想曲', cost: 3, cd: 0,
          baseMult: 2.20, pierce: 0.40,
          desc: '无视 40% 圣盾造成 220% 伤害（暴击率+20%），施加【破绽】并获得 35% 共鸣值！',
          execute: (self, target, ctx) => {
            ctx.addStatus(target, 'vuln', 2);
            ctx.addResonance(self, 35);
            const dmg = ctx.dealDamage(self, target, 2.20, { pierce: 0.40, bonusCrit: 0.20, isUlt: true, vfx: 'meteor' });
            return `奏响奥义【叛逆·绯红女皇狂想曲】造成 ${dmg} 点暴烈伤害，共鸣值大幅提升！`;
          }
        }
      ]
    }
  }
];
