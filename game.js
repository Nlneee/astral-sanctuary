// ============================================================================
// AI Persona Duel — 自由技能构筑、角色专属音画特效与动态星象回合战斗引擎 (深度精校版)
// ============================================================================

(() => {
  const CHARS = window.CHARACTERS;
  const STATUS_META = window.STATUS_META;
  const WEATHERS = window.ASTRAL_WEATHERS;
  const sfx = window.soundFX;

  function readDifficulty() {
    try {
      const saved = localStorage.getItem('ai_persona_difficulty_v1');
      if (Object.hasOwn(window.EnemyAI.levels, saved)) return saved;
    } catch (_) {}
    return 'normal';
  }

  function renderDifficultySetting() {
    document.getElementById('enemy-difficulty').value = state.aiDifficulty;
    document.getElementById('difficulty-desc').textContent = window.EnemyAI.getLevel(state.aiDifficulty).description;
  }

  // 默认装配生成器
  function createDefaultLoadout(char) {
    return {
      basicId: char.skillPool.basics[0].id,
      tacticalIds: [char.skillPool.tacticals[0].id, char.skillPool.tacticals[1].id],
      ultId: char.skillPool.ultimates[0].id
    };
  }

  // 本地存储支持：读取或初始化每位角色的独立搭配（分 player 与 enemy）
  function initLoadouts() {
    const defaultPlayer = {};
    const defaultEnemy = {};
    CHARS.forEach(c => {
      defaultPlayer[c.id] = createDefaultLoadout(c);
      defaultEnemy[c.id] = createDefaultLoadout(c);
    });

    try {
      const saved = localStorage.getItem('ai_persona_loadouts_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.player) Object.assign(defaultPlayer, parsed.player);
        if (parsed.enemy) Object.assign(defaultEnemy, parsed.enemy);
      }
    } catch (_) {}

    return { player: defaultPlayer, enemy: defaultEnemy };
  }

  function saveLoadouts() {
    try {
      localStorage.setItem('ai_persona_loadouts_v2', JSON.stringify(state.loadouts));
    } catch (_) {}
  }

  // 战场星核类型定义
  const ORB_TYPES = [
    {
      id: 'power',
      icon: '⚔️',
      name: '烈曜星核 · 点击赐福',
      color: '#fbbf24',
      apply: (actor, ctx) => {
        ctx.addStatus(actor, 'boost', 2);
        ctx.addResonance(actor, 20);
        return '拾取【烈曜星核】，获得 2 回合【增幅】与 20% 共鸣！';
      }
    },
    {
      id: 'shield',
      icon: '🛡️',
      name: '寒晶星核 · 点击赐福',
      color: '#60a5fa',
      apply: (actor, ctx) => {
        const sh = ctx.addShield(actor, 145);
        ctx.addResonance(actor, 20);
        return `拾取【寒晶星核】，凝聚 ${sh} 点【圣盾】与 20% 共鸣！`;
      }
    },
    {
      id: 'heal',
      icon: '✨',
      name: '翠生星核 · 点击赐福',
      color: '#4ade80',
      apply: (actor, ctx) => {
        const h = ctx.heal(actor, 155);
        ctx.addResonance(actor, 20);
        return `拾取【翠生星核】，实际恢复 ${h} 点生命值与 20% 共鸣！`;
      }
    },
    {
      id: 'energy',
      icon: '⚡',
      name: '灵脉星核 · 点击赐福',
      color: '#c084fc',
      apply: (actor, ctx) => {
        ctx.gainEnergy(actor, 1);
        ctx.addStatus(actor, 'insight', 1);
        ctx.addResonance(actor, 25);
        return '拾取【灵脉星核】，立即获得 1 点灵力、【洞察】与 25% 共鸣！';
      }
    }
  ];

  // 圣殿巡礼赐福池（三连战模式使用）
  const GAUNTLET_BLESSINGS = [
    {
      id: 'hp_bless',
      name: '✦ 苍穹圣冕',
      desc: '生命上限提升 180 点，并立即回满全部生命值',
      apply: (p) => {
        p.maxHp += 180;
        p.hp = p.maxHp;
      }
    },
    {
      id: 'atk_bless',
      name: '✦ 裁决之锋',
      desc: '基础攻击力提升 18 点，且开局自带 2 回合【增幅】',
      apply: (p) => {
        p.atk += 18;
        p.statuses.boost = Math.max(p.statuses.boost || 0, 2);
      }
    },
    {
      id: 'energy_bless',
      name: '✦ 灵脉涌动',
      desc: '开局灵力上限+1、初始灵力+1，且共鸣值增加 35%',
      apply: (p) => {
        p.maxEnergy = Math.min(4, p.maxEnergy + 1);
        p.energy = Math.min(p.maxEnergy, p.energy + 1);
        p.resonance = Math.min(100, p.resonance + 35);
      }
    },
    {
      id: 'shield_bless',
      name: '✦ 星芒守护',
      desc: '开局立即获得 180 点【圣盾】与 1 次【洞察】',
      apply: (p, ctx) => {
        ctx.addShield(p, 180);
        ctx.addStatus(p, 'insight', 1);
      }
    }
  ];

  // 核心全局状态
  let state = {
    selectingTarget: 'player', // 'player' | 'enemy'
    inspectedId: 'glm',
    playerId: 'glm',
    enemyId: 'gpt',
    loadouts: initLoadouts(),
    aiDifficulty: readDifficulty(),
    battleDifficulty: 'normal', // Snapshot for the current match, rematch and gauntlet stages.
    activeTacticalSlotIndex: 0, // 0 对应槽位 2，1 对应槽位 3
    turn: 1,
    weatherIdx: 0,
    activeOrb: null,
    activeSide: 'player',
    busy: false,
    player: null,
    enemy: null,
    battleId: 0, // 用于彻底杜绝过往比赛或退回选人时的异步计时器穿透
    speedFast: false, // 动画极速开关
    gameMode: 'free', // 'free' | 'gauntlet'
    gauntletStage: 1,
    appliedBlessings: [],
    // 战后统计数据
    stats: {
      playerDamage: 0,
      enemyDamage: 0,
      playerHealing: 0,
      enemyHealing: 0,
      playerShields: 0,
      enemyShields: 0,
      playerCrits: 0,
      enemyCrits: 0
    }
  };

  // 计时器生命周期管控器（杜绝废弃计时器穿透执行）
  const activeTimerIds = new Set();
  function safeSetTimeout(fn, ms) {
    const curBattleId = state.battleId;
    const effectiveMs = state.speedFast ? Math.floor(ms * 0.35) : ms;
    const tid = setTimeout(() => {
      activeTimerIds.delete(tid);
      if (state.battleId !== curBattleId) return;
      fn();
    }, effectiveMs);
    activeTimerIds.add(tid);
    return tid;
  }

  function clearAllBattleTimers() {
    state.battleId += 1;
    for (const tid of activeTimerIds) {
      if (typeof clearTimeout === 'function') {
        clearTimeout(tid);
      } else if (typeof window !== 'undefined' && typeof window.clearTimeout === 'function') {
        window.clearTimeout(tid);
      }
    }
    activeTimerIds.clear();
  }

  // ==========================================================================
  // 1. 高阶 Canvas 粒子与法术特效引擎
  // ==========================================================================
  const canvas = document.getElementById('fx-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let shockwaves = [];
  let beams = [];
  let slashes = [];
  let sigils = [];
  let lightnings = [];
  let ambientMotes = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  for (let i = 0; i < 48; i++) {
    ambientMotes.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2.1 + 0.6,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -Math.random() * 0.55 - 0.15,
      alpha: Math.random() * 0.55 + 0.15
    });
  }

  function triggerScreenShake() {
    document.body.classList.remove('screen-shake');
    void document.body.offsetWidth;
    document.body.classList.add('screen-shake');
  }

  function spawnBurst(x, y, color = '#dfc082', count = 28, shape = 'circle') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7.2 + 1.8;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        r: Math.random() * 4.2 + 1.8,
        color, shape,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.16,
        alpha: 1,
        decay: Math.random() * 0.022 + 0.014
      });
    }
  }

  function spawnShockwave(x, y, color = '#93c5fd', maxR = 145) {
    shockwaves.push({ x, y, r: 12, maxR, color, alpha: 0.95 });
  }

  function spawnBeam(x1, y1, x2, y2, color = '#a78bfa', width = 24) {
    beams.push({ x1, y1, x2, y2, color, alpha: 1.0, width });
  }

  function spawnSlashArc(x, y, color = '#f43f5e', angle = -0.65) {
    slashes.push({ x, y, color, alpha: 1.0, angle, scale: 0.82 });
  }

  function spawnSigil(x, y, color, kind = 'star8', maxR = 120) {
    sigils.push({ x, y, r: 24, maxR, color, kind, rot: 0, alpha: 1.0 });
  }

  function spawnLightning(x1, y1, x2, y2, color = '#f43f5e') {
    const pts = [{ x: x1, y: y1 }];
    const steps = 8;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      pts.push({
        x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * 46,
        y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * 46
      });
    }
    pts.push({ x: x2, y: y2 });
    lightnings.push({ pts, color, alpha: 1.0 });
  }

  function playCharacterSignatureVFX(charId, fromSide, toSide, isUlt = false) {
    const fromPt = getStageCenter(fromSide);
    const toPt = getStageCenter(toSide);

    switch (charId) {
      case 'gpt':
        spawnSigil(fromPt.x, fromPt.y, '#a78bfa', 'star8', 110);
        spawnBeam(toPt.x, toPt.y - 340, toPt.x, toPt.y + 40, '#a78bfa', isUlt ? 46 : 26);
        spawnSigil(toPt.x, toPt.y, '#ddd6fe', 'star8', isUlt ? 175 : 125);
        spawnBurst(toPt.x, toPt.y, '#c4b5fd', isUlt ? 46 : 28, 'star');
        break;
      case 'gemini':
        spawnLightning(fromPt.x, fromPt.y, toPt.x, toPt.y, '#60a5fa');
        safeSetTimeout(() => spawnLightning(fromPt.x, fromPt.y - 20, toPt.x, toPt.y + 15, '#fde047'), 70);
        spawnSlashArc(toPt.x, toPt.y, '#60a5fa', -0.6);
        safeSetTimeout(() => spawnSlashArc(toPt.x, toPt.y, '#fde047', 0.6), 85);
        spawnBurst(toPt.x, toPt.y, '#93c5fd', isUlt ? 50 : 32, 'star');
        break;
      case 'glm':
        spawnSigil(fromPt.x, fromPt.y, '#818cf8', 'rhombus', 115);
        spawnSigil(toPt.x, toPt.y, '#f43f5e', 'rhombus', isUlt ? 180 : 135);
        spawnBeam(fromPt.x, fromPt.y, toPt.x, toPt.y, '#818cf8', isUlt ? 34 : 20);
        spawnBurst(toPt.x, toPt.y, '#a5b4fc', isUlt ? 48 : 30, 'diamond');
        break;
      case 'deepseek':
        spawnShockwave(fromPt.x, fromPt.y, '#38bdf8', 130);
        spawnShockwave(toPt.x, toPt.y, '#38bdf8', isUlt ? 190 : 140);
        safeSetTimeout(() => spawnShockwave(toPt.x, toPt.y, '#bae6fd', isUlt ? 220 : 165), 110);
        spawnBurst(toPt.x, toPt.y, '#7dd3fc', isUlt ? 48 : 30, 'bubble');
        break;
      case 'claude':
        spawnSigil(toPt.x, toPt.y, '#fb923c', 'sun', isUlt ? 175 : 130);
        spawnShockwave(fromPt.x, fromPt.y, '#fed7aa', 135);
        spawnBurst(toPt.x, toPt.y, '#fdba74', isUlt ? 50 : 32, 'petal');
        break;
      case 'qwen':
        spawnSigil(fromPt.x, fromPt.y, '#93c5fd', 'lotus', 115);
        spawnSlashArc(toPt.x - 15, toPt.y, '#60a5fa', -0.35);
        safeSetTimeout(() => spawnSlashArc(toPt.x + 10, toPt.y - 12, '#c7d2fe', 0.25), 75);
        if (isUlt) {
          safeSetTimeout(() => spawnSlashArc(toPt.x, toPt.y + 10, '#fde047', -0.85), 140);
        }
        spawnBurst(toPt.x, toPt.y, '#93c5fd', isUlt ? 46 : 28, 'petal');
        break;
      case 'grok':
        spawnLightning(fromPt.x, fromPt.y, toPt.x, toPt.y, '#f43f5e');
        spawnSlashArc(toPt.x, toPt.y, '#e11d48', -0.75);
        safeSetTimeout(() => spawnSlashArc(toPt.x, toPt.y, '#fda4af', 0.75), 70);
        spawnBurst(toPt.x, toPt.y, '#fb7185', isUlt ? 52 : 34, 'petal');
        break;
      default:
        spawnShockwave(toPt.x, toPt.y, '#dfc082', 135);
    }
  }

  function renderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const activeWeather = WEATHERS[state.weatherIdx] || WEATHERS[0];

    // 1) 漂浮星尘
    for (const m of ambientMotes) {
      m.x += m.vx;
      m.y += m.vy;
      if (m.y < -10) m.y = canvas.height + 10;
      if (m.x < -10) m.x = canvas.width + 10;
      if (m.x > canvas.width + 10) m.x = -10;

      ctx.save();
      ctx.globalAlpha = m.alpha;
      ctx.fillStyle = activeWeather.color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2) 角色法阵
    for (let i = sigils.length - 1; i >= 0; i--) {
      const sg = sigils[i];
      sg.r += (sg.maxR - sg.r) * 0.14 + 1.5;
      sg.rot += 0.045;
      sg.alpha -= 0.032;
      if (sg.alpha <= 0) {
        sigils.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(sg.x, sg.y);
      ctx.rotate(sg.rot);
      ctx.globalAlpha = sg.alpha;
      ctx.strokeStyle = sg.color;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 16;
      ctx.shadowColor = sg.color;

      if (sg.kind === 'rhombus') {
        for (let k = 0; k < 2; k++) {
          ctx.rotate(Math.PI / 4);
          ctx.strokeRect(-sg.r * 0.7, -sg.r * 0.7, sg.r * 1.4, sg.r * 1.4);
        }
      } else if (sg.kind === 'star8') {
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          const rad = k % 2 === 0 ? sg.r : sg.r * 0.42;
          if (k === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
          else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, sg.r * 0.78, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 12; k++) {
          const a = (k * Math.PI) / 6;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * sg.r * 0.55, Math.sin(a) * sg.r * 0.55);
          ctx.lineTo(Math.cos(a) * sg.r, Math.sin(a) * sg.r);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 3) 能量光束
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      b.alpha -= 0.055;
      b.width *= 0.94;
      if (b.alpha <= 0) {
        beams.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 24;
      ctx.shadowColor = b.color;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = b.width * 0.38;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.restore();
    }

    // 4) 闪电链
    for (let i = lightnings.length - 1; i >= 0; i--) {
      const lt = lightnings[i];
      lt.alpha -= 0.075;
      if (lt.alpha <= 0) {
        lightnings.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = lt.alpha;
      ctx.strokeStyle = lt.color;
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 18;
      ctx.shadowColor = lt.color;
      ctx.beginPath();
      lt.pts.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // 5) 斩击弧光
    for (let i = slashes.length - 1; i >= 0; i--) {
      const s = slashes[i];
      s.alpha -= 0.062;
      s.scale += 0.042;
      if (s.alpha <= 0) {
        slashes.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.scale(s.scale, s.scale);
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 7;
      ctx.shadowBlur = 18;
      ctx.shadowColor = s.color;
      ctx.beginPath();
      ctx.arc(0, 0, 78, -Math.PI * 0.44, Math.PI * 0.44);
      ctx.stroke();
      ctx.restore();
    }

    // 6) 震波环
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.r += (sw.maxR - sw.r) * 0.16 + 2.5;
      sw.alpha -= 0.042;
      if (sw.alpha <= 0) {
        shockwaves.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = sw.alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 16;
      ctx.shadowColor = sw.color;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 7) 粒子
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.shape === 'bubble' ? -0.08 : 0.11;
      p.rot += p.vRot;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;

      if (p.shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(0, -p.r * 1.4);
        ctx.lineTo(p.r, 0);
        ctx.lineTo(0, p.r * 1.4);
        ctx.lineTo(-p.r, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'star') {
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const rad = k % 2 === 0 ? p.r * 1.45 : p.r * 0.45;
          const a = (k * Math.PI) / 4;
          if (k === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
          else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'petal') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * 1.35, p.r * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'bubble') {
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 1.2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    requestAnimationFrame(renderCanvas);
  }
  requestAnimationFrame(renderCanvas);

  // ==========================================================================
  // 2. 角色查询与独立技能搭配获取
  // ==========================================================================
  function getCharById(id) {
    return CHARS.find(c => c.id === id) || CHARS[0];
  }

  // 支持传 side（'player' | 'enemy'），若不传则智能根据上下文获取
  function getEquippedSkills(charId, side = 'player') {
    const char = getCharById(charId);
    const sideLoadouts = (state.loadouts && state.loadouts[side]) ? state.loadouts[side] : (state.loadouts && state.loadouts.player ? state.loadouts.player : state.loadouts);
    const ld = (sideLoadouts && sideLoadouts[charId]) ? sideLoadouts[charId] : createDefaultLoadout(char);

    const basic = char.skillPool.basics.find(s => s.id === ld.basicId) || char.skillPool.basics[0];
    const tac1 = char.skillPool.tacticals.find(s => s.id === ld.tacticalIds[0]) || char.skillPool.tacticals[0];
    const tac2 = char.skillPool.tacticals.find(s => s.id === ld.tacticalIds[1]) || char.skillPool.tacticals[1];
    const ult = char.skillPool.ultimates.find(s => s.id === ld.ultId) || char.skillPool.ultimates[0];
    return [basic, tac1, tac2, ult];
  }

  function getSideLoadout(side, charId) {
    if (!state.loadouts[side]) state.loadouts[side] = {};
    if (!state.loadouts[side][charId]) {
      state.loadouts[side][charId] = createDefaultLoadout(getCharById(charId));
    }
    return state.loadouts[side][charId];
  }

  // ==========================================================================
  // 3. 选人界面与三栏高贵展台渲染
  // ==========================================================================
  function renderSelectionScreen(pulseCharId = null) {
    renderDifficultySetting();
    const pChar = getCharById(state.playerId);
    const eChar = getCharById(state.enemyId);
    const inspected = getCharById(state.inspectedId);
    const curSide = state.selectingTarget; // 'player' | 'enemy'

    // 1) 顶部对阵横幅
    const playerSlot = document.getElementById('slot-player');
    const enemySlot = document.getElementById('slot-enemy');
    playerSlot.classList.toggle('selecting', curSide === 'player');
    enemySlot.classList.toggle('selecting', curSide === 'enemy');

    document.getElementById('slot-player-img').src = pChar.image;
    document.getElementById('slot-player-name').textContent = pChar.name;
    document.getElementById('slot-player-sub').textContent = getEquippedSkills(pChar.id, 'player').map(s => s.name).join(' · ');

    document.getElementById('slot-enemy-img').src = eChar.image;
    document.getElementById('slot-enemy-name').textContent = eChar.name;
    document.getElementById('slot-enemy-sub').textContent = getEquippedSkills(eChar.id, 'enemy').map(s => s.name).join(' · ');

    document.getElementById('roster-target-hint').textContent = `正在配置：${curSide === 'player' ? '我方' : '敌方'}`;
    const editingBadge = document.getElementById('editing-side-badge');
    editingBadge.textContent = curSide === 'player' ? '我方独立配装' : '敌方独立配装';
    editingBadge.className = `editing-side-badge ${curSide}`;

    // 2) 左栏：七人名录（持久化 DOM 节点，避免点击重构导致悬浮与尺寸抖动）
    const grid = document.getElementById('roster-grid');
    if (!grid.children || grid.children.length !== CHARS.length) {
      grid.innerHTML = '';
      CHARS.forEach(c => {
        const card = document.createElement('div');
        card.className = 'char-card';
        card.style.setProperty('--card-glow', c.bgGlow);

        const thumb = document.createElement('div');
        thumb.className = 'char-card-thumb';
        const img = document.createElement('img');
        img.className = 'char-card-img';
        img.src = c.image;
        img.alt = c.name;
        thumb.appendChild(img);

        const footer = document.createElement('div');
        footer.className = 'char-card-footer';
        const topLine = document.createElement('div');
        topLine.className = 'char-card-top-line';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'char-card-name';
        nameSpan.textContent = c.name;
        const badges = document.createElement('div');
        badges.className = 'char-card-badges';
        topLine.appendChild(nameSpan);
        topLine.appendChild(badges);

        const role = document.createElement('div');
        role.className = 'char-card-role';
        role.textContent = c.title;
        footer.appendChild(topLine);
        footer.appendChild(role);

        card.appendChild(thumb);
        card.appendChild(footer);
        card._charId = c.id;
        card._badgesEl = badges;

        card.addEventListener('click', () => {
          sfx.playCharSelect(c.id);
          const rect = card.getBoundingClientRect();
          spawnShockwave(rect.left + rect.width / 2, rect.top + rect.height / 2, c.themeColor, 95);
          state.inspectedId = c.id;
          if (state.selectingTarget === 'player') {
            state.playerId = c.id;
          } else {
            state.enemyId = c.id;
          }
          renderSelectionScreen(c.id);
        });

        grid.appendChild(card);
      });
    }

    // 局部更新卡片高亮与角标，不销毁重建 DOM 节点
    for (let i = 0; i < grid.children.length; i++) {
      const card = grid.children[i];
      const charId = card._charId || (CHARS[i] && CHARS[i].id);

      card.classList.toggle('inspected', charId === state.inspectedId);
      card.classList.toggle('selected-player', charId === state.playerId);
      card.classList.toggle('selected-enemy', charId === state.enemyId);

      if (charId === pulseCharId) {
        card.classList.remove('pulse-select');
        void card.offsetWidth;
        card.classList.add('pulse-select');
      } else {
        card.classList.remove('pulse-select');
      }

      let badgesHtml = '';
      if (charId === state.playerId && charId === state.enemyId) {
        badgesHtml = `<span class="char-card-Tag tag-player">镜像</span>`;
      } else {
        if (charId === state.playerId) badgesHtml += `<span class="char-card-Tag tag-player">我方</span>`;
        if (charId === state.enemyId) badgesHtml += `<span class="char-card-Tag tag-enemy">敌方</span>`;
      }

      if (card._badgesEl) {
        card._badgesEl.innerHTML = badgesHtml;
      }
    }

    // 3) 中栏：当前选中角色的全身大立绘展台
    document.getElementById('showcase-img').src = inspected.image;
    document.getElementById('showcase-aura').style.background = inspected.themeColor;
    document.getElementById('showcase-role').textContent = inspected.role;
    document.getElementById('showcase-quote').textContent = inspected.quote;
    document.getElementById('insp-name').textContent = inspected.name;
    document.getElementById('insp-title').textContent = inspected.title;
    document.getElementById('insp-hp').textContent = inspected.stats.maxHp;
    document.getElementById('insp-atk').textContent = inspected.stats.atk;
    document.getElementById('insp-spd').textContent = inspected.stats.spd;
    document.getElementById('insp-crit').textContent = `${Math.round(inspected.stats.crit * 100)}%`;
    document.getElementById('insp-passive-name').textContent = `✦ 天赋被动：【${inspected.passive.name}】`;
    document.getElementById('insp-passive-desc').textContent = inspected.passive.desc;

    // 渲染立绘下方的专属机制展台
    const mechBox = document.getElementById('insp-mechanic-box');
    if (mechBox && inspected.mechanic) {
      document.getElementById('insp-mechanic-badge').textContent = inspected.mechanic.badge;
      document.getElementById('insp-mechanic-badge').style.borderColor = inspected.themeColor;
      document.getElementById('insp-mechanic-badge').style.color = inspected.themeColor;
      document.getElementById('insp-mechanic-badge').style.background = inspected.bgGlow;
      document.getElementById('insp-mechanic-tag').textContent = inspected.mechanic.tag;
      document.getElementById('insp-mechanic-summary').textContent = inspected.mechanic.summary;

      const stepsContainer = document.getElementById('insp-mechanic-steps');
      if (stepsContainer) {
        stepsContainer.innerHTML = (inspected.mechanic.steps || []).map(s => `
          <div class="mechanic-step-item">
            <span class="mechanic-step-label">${s.label}：</span>
            <span class="mechanic-step-text">${s.text}</span>
          </div>
        `).join('');
      }

      const btnGuide = document.getElementById('btn-inspect-mechanic-guide');
      if (btnGuide) {
        btnGuide.onclick = () => {
          sfx.playSelect();
          openGuideModal('tab-chars', inspected.id);
        };
      }
    }

    // 4) 右栏：独立配装工坊
    renderLoadoutWorkshop(inspected, curSide);
  }

  function renderLoadoutWorkshop(char, side) {
    const ld = getSideLoadout(side, char.id);

    // 渲染一键预设流派
    const presetContainer = document.getElementById('insp-presets');
    presetContainer.innerHTML = '';
    char.presets.forEach((p) => {
      const isMatch =
        ld.basicId === p.slots[0] &&
        ld.tacticalIds.includes(p.slots[1]) &&
        ld.tacticalIds.includes(p.slots[2]) &&
        ld.ultId === p.slots[3];

      const btn = document.createElement('button');
      btn.className = `preset-chip ${isMatch ? 'active' : ''}`;
      btn.textContent = `✦ ${p.name}`;
      btn.addEventListener('click', () => {
        sfx.playCharSelect(char.id);
        ld.basicId = p.slots[0];
        ld.tacticalIds = [p.slots[1], p.slots[2]];
        ld.ultId = p.slots[3];
        saveLoadouts();
        renderSelectionScreen();
      });
      presetContainer.appendChild(btn);
    });

    // 渲染 4 槽位概览条（点击战技槽 2 或槽 3 可显式指定替换目标）
    const eqBar = document.getElementById('equipped-slots-bar');
    eqBar.innerHTML = '';

    const equippedSkills = getEquippedSkills(char.id, side);
    equippedSkills.forEach((s, idx) => {
      const slotEl = document.createElement('div');
      slotEl.className = 'eq-slot-pill';
      const slotName = idx === 0 ? '槽位 1 · 普攻' : idx === 3 ? '槽位 4 · 奥义' : `槽位 ${idx + 1} · 战技`;
      const isTargetTac = (idx === 1 && state.activeTacticalSlotIndex === 0) || (idx === 2 && state.activeTacticalSlotIndex === 1);
      if (isTargetTac) slotEl.classList.add('target-slot');

      slotEl.innerHTML = `
        <div class="eq-slot-tag">
          <span>${slotName}</span>
          ${(idx === 1 || idx === 2) ? `<span style="font-size:9px;">${isTargetTac ? '● 替换目标' : '○ 点击选定'}</span>` : ''}
        </div>
        <div class="eq-slot-name">${s.name}</div>
      `;

      if (idx === 1 || idx === 2) {
        slotEl.title = `点击指定战技槽 ${idx + 1} 为下一次点击替换的目标槽位`;
        slotEl.addEventListener('click', () => {
          sfx.playSelect();
          state.activeTacticalSlotIndex = idx - 1;
          renderSelectionScreen();
        });
      }
      eqBar.appendChild(slotEl);
    });

    // 渲染 8 个技能自由搭配池（basics 2, tacticals 4, ultimates 2）
    const builder = document.getElementById('loadout-builder');
    builder.innerHTML = '';

    // 1) 普攻池 (2 选 1)
    builder.appendChild(createSkillGroupSection(
      '槽位 1 · 普攻形态（2 选 1 · 0 灵力 · 恢复 1 灵力）',
      char.skillPool.basics,
      (s) => ld.basicId === s.id ? '已装备 · 槽 1' : '点击装备',
      (s) => {
        sfx.playLoadoutEquip(char.id);
        ld.basicId = s.id;
        saveLoadouts();
        renderSelectionScreen();
      }
    ));

    // 2) 战技池 (4 选 2，支持定向装入槽 2 或槽 3)
    const tacWrap = document.createElement('div');
    const tacTitle = document.createElement('div');
    tacTitle.className = 'loadout-group-title';
    tacTitle.innerHTML = `
      <span>槽位 2 & 3 · 核心战技（4 选 2 · 消耗 1 灵力）</span>
      <span style="font-size:9.5px; opacity:0.85;">当前替换目标：【战技槽 ${state.activeTacticalSlotIndex + 2}】</span>
    `;
    tacWrap.appendChild(tacTitle);

    const tacGrid = document.createElement('div');
    tacGrid.className = 'loadout-options-grid';
    char.skillPool.tacticals.forEach((s) => {
      const idx = ld.tacticalIds.indexOf(s.id);
      const isEquipped = idx !== -1;
      const card = document.createElement('div');
      card.className = `skill-option-card ${isEquipped ? 'equipped' : ''}`;
      const badge = isEquipped ? `已装备 · 槽 ${idx + 2}` : '点击替换';

      card.innerHTML = `
        <div>
          <div class="skill-opt-header">
            <span class="skill-opt-name">${s.name}</span>
            <span class="skill-opt-badge">${badge}</span>
          </div>
          <div class="skill-opt-desc">${s.desc}</div>
        </div>
      `;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'tactical-slot-actions';

      const btnSlot2 = document.createElement('button');
      btnSlot2.className = `tac-slot-btn ${idx === 0 ? 'active' : ''}`;
      btnSlot2.title = '装入战技槽位 2';
      btnSlot2.textContent = '装入槽 2';
      btnSlot2.addEventListener('click', (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        sfx.playLoadoutEquip(char.id);
        equipTacticalToSlot(ld, s.id, 0);
        state.activeTacticalSlotIndex = 1;
        saveLoadouts();
        renderSelectionScreen();
      });

      const btnSlot3 = document.createElement('button');
      btnSlot3.className = `tac-slot-btn ${idx === 1 ? 'active' : ''}`;
      btnSlot3.title = '装入战技槽位 3';
      btnSlot3.textContent = '装入槽 3';
      btnSlot3.addEventListener('click', (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        sfx.playLoadoutEquip(char.id);
        equipTacticalToSlot(ld, s.id, 1);
        state.activeTacticalSlotIndex = 0;
        saveLoadouts();
        renderSelectionScreen();
      });

      actionsDiv.appendChild(btnSlot2);
      actionsDiv.appendChild(btnSlot3);
      card.appendChild(actionsDiv);

      // 点击卡片主体：装入当前选定的 activeTacticalSlotIndex
      card.addEventListener('click', (e) => {
        if (e && e.target && e.target.tagName && e.target.tagName.toLowerCase() === 'button') return;
        sfx.playLoadoutEquip(char.id);
        equipTacticalToSlot(ld, s.id, state.activeTacticalSlotIndex);
        saveLoadouts();
        renderSelectionScreen();
      });

      tacGrid.appendChild(card);
    });
    tacWrap.appendChild(tacGrid);
    builder.appendChild(tacWrap);

    // 3) 奥义池 (2 选 1)
    builder.appendChild(createSkillGroupSection(
      '槽位 4 · 终极奥义形态（2 选 1 · 消耗 3 灵力）',
      char.skillPool.ultimates,
      (s) => ld.ultId === s.id ? '已装备 · 槽 4' : '点击装备',
      (s) => {
        sfx.playLoadoutEquip(char.id);
        ld.ultId = s.id;
        saveLoadouts();
        renderSelectionScreen();
      }
    ));
  }

  function equipTacticalToSlot(ld, skillId, slotIdx) {
    const otherIdx = slotIdx === 0 ? 1 : 0;
    if (ld.tacticalIds[slotIdx] === skillId) return;
    if (ld.tacticalIds[otherIdx] === skillId) {
      // 互换两个槽位
      const temp = ld.tacticalIds[slotIdx];
      ld.tacticalIds[slotIdx] = skillId;
      ld.tacticalIds[otherIdx] = temp;
    } else {
      ld.tacticalIds[slotIdx] = skillId;
    }
  }

  function createSkillGroupSection(titleText, skills, badgeFn, onClickFn) {
    const wrap = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'loadout-group-title';
    title.innerHTML = `<span>${titleText}</span>`;
    wrap.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'loadout-options-grid';

    skills.forEach(s => {
      const badgeLabel = badgeFn(s);
      const isEquipped = badgeLabel.startsWith('已装备');
      const card = document.createElement('div');
      card.className = `skill-option-card ${isEquipped ? 'equipped' : ''}`;
      card.innerHTML = `
        <div class="skill-opt-header">
          <span class="skill-opt-name">${s.name}</span>
          <span class="skill-opt-badge">${badgeLabel}</span>
        </div>
        <div class="skill-opt-desc">${s.desc}</div>
      `;
      card.addEventListener('click', () => onClickFn(s));
      grid.appendChild(card);
    });

    wrap.appendChild(grid);
    return wrap;
  }

  // ==========================================================================
  // 4. 战斗初始化与战斗实体
  // ==========================================================================
  function createFighterInstance(charData, side) {
    const equippedSkills = getEquippedSkills(charData.id, side);
    return {
      side,
      data: charData,
      id: charData.id,
      name: charData.name,
      skills: equippedSkills,
      maxHp: charData.stats.maxHp,
      hp: charData.stats.maxHp,
      atk: charData.stats.atk,
      spd: charData.stats.spd,
      crit: charData.stats.crit,
      shield: 0,
      energy: 1,
      maxEnergy: 3,
      resonance: 20,
      stacks: charData.id === 'deepseek' ? 1 : 0,
      gptDeduction: 0,
      claudeSolar: 0,
      turnCount: 0,
      cooldowns: {},
      lastOverhealShield: 0,
      statuses: {
        boost: 0,
        vuln: 0,
        regen: 0,
        insight: 0,
        burn: 0
      }
    };
  }

  function applyWeatherStyle() {
    const w = WEATHERS[state.weatherIdx] || WEATHERS[0];
    const nextIdx = (state.weatherIdx + 1) % WEATHERS.length;
    const nw = WEATHERS[nextIdx];

    document.documentElement.style.setProperty('--weather-tint', `${w.color}33`);
    document.getElementById('weather-badge').innerHTML = `${w.icon} 星象 · ${w.name}`;
    document.getElementById('weather-desc').textContent = w.desc;
    const turnsToNext = 2 - (state.turn % 2 === 0 ? 2 : 1);
    document.getElementById('weather-next').textContent = `下轮预告：${nw.icon} ${nw.name} (${turnsToNext}回合后)`;
  }

  function maybeSpawnBattleOrb() {
    if (state.activeOrb) return;
    if (Math.random() < 0.70) {
      const pick = ORB_TYPES[Math.floor(Math.random() * ORB_TYPES.length)];
      state.activeOrb = pick;
      const btn = document.getElementById('astral-orb-btn');
      const sphere = document.getElementById('orb-sphere');
      const cap = document.getElementById('orb-caption');
      sphere.textContent = pick.icon;
      btn.style.setProperty('--orb-color', pick.color);
      cap.textContent = pick.name;
      btn.classList.add('active');
    }
  }

  function clearBattleOrb() {
    state.activeOrb = null;
    document.getElementById('astral-orb-btn').classList.remove('active');
  }

  function showSpeechBubble(side, text) {
    const el = document.getElementById(`speech-${side}`);
    if (!el || !text) return;
    el.textContent = text;
    el.classList.add('show');
    safeSetTimeout(() => el.classList.remove('show'), 2100);
  }

  function startBattle() {
    clearAllBattleTimers();
    state.battleDifficulty = state.aiDifficulty;
    sfx.playStartBattle();

    const pData = getCharById(state.playerId);
    const eData = getCharById(state.enemyId);

    state.player = createFighterInstance(pData, 'player');
    state.enemy = createFighterInstance(eData, 'enemy');
    state.turn = 1;
    state.weatherIdx = 0;
    state.busy = false;
    clearBattleOrb();

    // 重置战后统计
    state.stats = {
      playerDamage: 0, enemyDamage: 0,
      playerHealing: 0, enemyHealing: 0,
      playerShields: 0, enemyShields: 0,
      playerCrits: 0, enemyCrits: 0
    };

    // 应用三连战赐福
    if (state.gameMode === 'gauntlet' && state.appliedBlessings.length > 0) {
      state.appliedBlessings.forEach(bless => bless.apply(state.player, combatCtx));
    }

    document.getElementById('stage-player-img').src = pData.image;
    document.getElementById('stage-enemy-img').src = eData.image;
    document.getElementById('aura-player').style.background = pData.themeColor;
    document.getElementById('aura-enemy').style.background = eData.themeColor;

    applyWeatherStyle();

    document.getElementById('select-screen').classList.remove('active');
    document.getElementById('battle-screen').classList.add('active');
    document.getElementById('result-modal').classList.remove('active');

    const logBox = document.getElementById('combat-log');
    logBox.innerHTML = '';
    const modeTag = state.gameMode === 'gauntlet' ? `【圣殿巡礼 第 ${state.gauntletStage}/3 战】` : '【自由圣殿对决】';
    const difficultyName = window.EnemyAI.getLevel(state.battleDifficulty).name;
    document.getElementById('battle-difficulty').textContent = `敌方 AI · ${difficultyName}`;
    appendLog(`⚜️ ${modeTag} 对决开启：<strong>${pData.name}</strong> VS <strong>${eData.name}</strong>！敌方 AI 难度：【${difficultyName}】`);

    maybeSpawnBattleOrb();
    state.activeSide = state.player.spd >= state.enemy.spd ? 'player' : 'enemy';
    beginTurn(state.activeSide);
  }

  function appendLog(html) {
    const logBox = document.getElementById('combat-log');
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = html;
    logBox.prepend(div);
  }

  function showFloatText(side, text, cls = 'dmg') {
    const layer = document.getElementById(`float-${side}`);
    const el = document.createElement('div');
    el.className = `float-num ${cls}`;
    el.textContent = text;
    const offsetX = (Math.random() - 0.5) * 48;
    el.style.marginLeft = `${offsetX}px`;
    layer.appendChild(el);
    safeSetTimeout(() => el.remove(), 1150);
  }

  function getStageCenter(side) {
    const frame = document.getElementById(`frame-${side}`);
    const rect = frame.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height * 0.45
    };
  }

  // ==========================================================================
  // 5. 战斗核心逻辑与公式判定
  // ==========================================================================
  const combatCtx = {
    advanceDeduction(target, amount) {
      target.gptDeduction = Math.min(100, (target.gptDeduction || 0) + amount);
      if (target.gptDeduction >= 100) {
        showFloatText(target.side, '🔮 真理视界就绪', 'crit');
      } else {
        showFloatText(target.side, `🔮 推演 +${amount}%`, 'status');
      }
    },

    advanceSolar(target, amount) {
      target.claudeSolar = Math.min(3, (target.claudeSolar || 0) + amount);
      if (target.claudeSolar >= 3) {
        showFloatText(target.side, '🌸 盛夏绽放就绪', 'crit');
      } else {
        showFloatText(target.side, `🌸 日冕 ×${target.claudeSolar}`, 'status');
      }
    },

    dealDamage(attacker, defender, multiplier, opts = {}) {
      const weather = WEATHERS[state.weatherIdx] || WEATHERS[0];
      let raw = attacker.atk * multiplier;
      if (opts.bonusFlatDmg) raw += opts.bonusFlatDmg;

      // 角色被动与专属形态加成
      // 1) GPT 全知演算与真理视界
      if (attacker.id === 'gpt') {
        if ((attacker.gptDeduction || 0) >= 100) {
          raw *= 1.30;
          opts.pierce = Math.max(opts.pierce || 0, 0.40);
          this.removeStatus(defender, 'boost');
          attacker.gptDeduction = 0;
          safeSetTimeout(() => showFloatText(attacker.side, '🔮 真理视界 坍缩裁决!', 'crit'), 140);
          appendLog(`🔮 <strong>${attacker.name}</strong> 触发【真理视界】！伤害提升30%，穿透40%护盾并彻底驱散了 <strong>${defender.name}</strong> 的【增幅】！`);
        } else if ((attacker.gptDeduction || 0) >= 50) {
          raw *= 1.15;
        }
      }

      // 2) GLM 凛夜冰盾增伤 (20%)
      if (attacker.id === 'glm' && attacker.shield > 0) raw *= 1.20;

      // 3) DeepSeek 渊溟压强 (每层+10%攻)
      if (attacker.id === 'deepseek' && (attacker.stacks || 1) > 0) {
        raw *= (1 + (attacker.stacks || 1) * 0.10);
      }

      // 4) Claude 向阳花期与盛夏绽放
      if (attacker.id === 'claude') {
        const solar = attacker.claudeSolar || 0;
        if (solar > 0) raw *= (1 + solar * 0.06);
        if (solar >= 3) {
          raw += 75;
          this.addStatus(defender, 'burn', 2);
          attacker.claudeSolar = 0;
          safeSetTimeout(() => showFloatText(attacker.side, '🌸 盛夏绽放 +75真辉!', 'crit'), 160);
          appendLog(`🌸 <strong>${attacker.name}</strong> 消耗3层日冕触发【盛夏绽放】！追加75点真辉神圣伤害，并为 <strong>${defender.name}</strong> 附加2回合【星灼】！`);
        }
      }

      // 5) Grok 狂气压血增伤 (每损10%生命+3.5%伤害)
      if (attacker.id === 'grok') {
        const missingRatio = 1 - attacker.hp / attacker.maxHp;
        raw *= (1 + missingRatio * 0.35);
      }

      // 6) Gemini 双子真实二连击增伤
      if (attacker.id === 'gemini' || opts.twinHit) raw *= 1.12;

      // 凛冬天气护盾增伤
      if (weather.id === 'frost' && attacker.shield > 0) raw *= 1.15;

      // 增幅与破绽
      if (attacker.statuses.boost > 0) raw *= 1.30;
      if (defender.statuses.vuln > 0) raw *= 1.25;

      // Qwen 听风寻隙与借力化劲 (攻击破绽目标伤害+20%、暴击+15%、获得1次洞察)
      let qwenBonusCrit = 0;
      if (attacker.id === 'qwen' && defender.statuses.vuln > 0) {
        raw *= 1.20;
        qwenBonusCrit = 0.15;
        this.addStatus(attacker, 'insight', 1);
        safeSetTimeout(() => showFloatText(attacker.side, '🍃 听风借力 +洞察', 'status'), 180);
        appendLog(`🍃 <strong>${attacker.name}</strong> 触发【听风寻隙】！对破绽目标造成+20%额外震击与+15%暴击率，并借力化劲获得1次【洞察】！`);
      }

      // DeepSeek 渊溟压强常驻减伤 (每层+5%常驻减伤)
      if (defender.id === 'deepseek' && (defender.stacks || 1) > 0) {
        raw *= (1 - (defender.stacks || 1) * 0.05);
      }

      // 洞察机制：按次减伤 40% 并反弹 45 伤害
      if (defender.statuses.insight > 0) {
        raw *= 0.60;
        defender.statuses.insight = Math.max(0, defender.statuses.insight - 1);
        showFloatText(defender.side, '⚡洞察减伤40%', 'status');
        if (attacker.hp > 0) {
          attacker.hp = Math.max(0, attacker.hp - 45);
          safeSetTimeout(() => showFloatText(attacker.side, '-45 洞察反制', 'crit'), 200);
        }
      }

      // 暴击判定
      const weatherCrit = weather.id === 'starlight' ? 0.15 : 0;
      const critChance = Math.min(0.96, attacker.crit + (opts.bonusCrit || 0) + qwenBonusCrit + weatherCrit);
      const isCrit = Math.random() < critChance;
      if (isCrit) {
        raw *= (weather.id === 'starlight' ? 1.65 : 1.50);
        if (attacker.side === 'player') state.stats.playerCrits++;
        else state.stats.enemyCrits++;
      }

      let finalDmg = Math.max(1, Math.round(raw));
      const pierceRatio = Math.min(1, (opts.pierce || 0));
      const hadShieldBeforeHit = defender.shield > 0;

      // 护盾与生命结算
      if (defender.shield > 0 && pierceRatio < 1) {
        const shieldableDmg = Math.round(finalDmg * (1 - pierceRatio));
        const directDmg = finalDmg - shieldableDmg;
        const absorbed = Math.min(defender.shield, shieldableDmg);
        defender.shield -= absorbed;
        if (defender.side === 'player') state.stats.playerShields += absorbed;
        else state.stats.enemyShields += absorbed;

        const leftover = shieldableDmg - absorbed;
        defender.hp = Math.max(0, defender.hp - (directDmg + leftover));

        if (hadShieldBeforeHit && defender.shield === 0) {
          this.triggerShatterEffect(defender);
        }
      } else {
        defender.hp = Math.max(0, defender.hp - finalDmg);
      }

      // 记录伤害统计
      if (attacker.side === 'player') state.stats.playerDamage += finalDmg;
      else state.stats.enemyDamage += finalDmg;

      // GLM 护盾受击反弹 45
      if (defender.id === 'glm' && hadShieldBeforeHit && attacker.hp > 0) {
        attacker.hp = Math.max(0, attacker.hp - 45);
        safeSetTimeout(() => showFloatText(attacker.side, '-45 菱晶反制', 'shield'), 240);
      }

      // Grok 攻击吸血 20%
      if (attacker.id === 'grok' && finalDmg > 0 && attacker.hp > 0) {
        const vamp = Math.max(1, Math.round(finalDmg * 0.20));
        this.heal(attacker, vamp, true);
      }

      this.addResonance(attacker, opts.isUlt ? 25 : 18);
      this.addResonance(defender, 14);

      sfx.playHit(isCrit);
      if (isCrit || opts.isUlt) triggerScreenShake();

      playCharacterSignatureVFX(attacker.id, attacker.side, defender.side, opts.isUlt);

      const defFrame = document.getElementById(`frame-${defender.side}`);
      defFrame.classList.remove('hit-shake');
      void defFrame.offsetWidth;
      defFrame.classList.add('hit-shake');

      showFloatText(
        defender.side,
        isCrit ? `💥 暴击 -${finalDmg}` : `-${finalDmg}`,
        isCrit ? 'crit' : 'dmg'
      );

      if (opts.twinHit) {
        safeSetTimeout(() => showFloatText(defender.side, '✦ 双子连击', 'status'), 180);
      }

      return finalDmg;
    },

    triggerShatterEffect(defender) {
      sfx.playShatter();
      triggerScreenShake();
      const pt = getStageCenter(defender.side);
      spawnShockwave(pt.x, pt.y, '#93c5fd', 180);
      spawnBurst(pt.x, pt.y, '#e0f2fe', 36, 'diamond');
      defender.hp = Math.max(0, defender.hp - 65);
      defender.statuses.vuln = Math.max(defender.statuses.vuln || 0, 1);
      safeSetTimeout(() => {
        showFloatText(defender.side, '💎 圣盾崩解 -65', 'crit');
      }, 160);
      appendLog(`💎 <strong>${defender.name}</strong> 的圣盾被彻底击碎，触发【圣盾崩解】额外承受 65 点震荡并陷入【破绽】！`);
    },

    heal(target, amount, silent = false) {
      const weather = WEATHERS[state.weatherIdx] || WEATHERS[0];
      const mult = weather.id === 'bloom' ? 1.30 : 1.0;
      const val = Math.round(amount * mult);
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + val);
      const actual = target.hp - before;
      const overheal = Math.max(0, val - actual);

      if (target.side === 'player') state.stats.playerHealing += actual;
      else state.stats.enemyHealing += actual;

      if (!silent) sfx.playHeal();
      if (actual > 0) {
        showFloatText(target.side, `+${actual} 生命`, 'heal');
      }

      // Claude 天赋：溢出治疗 40% 转为圣盾
      target.lastOverhealShield = 0;
      if (target.id === 'claude') {
        if (overheal > 0) {
          const shieldGain = Math.round(overheal * 0.40);
          target.shield += shieldGain;
          target.lastOverhealShield = shieldGain;
          showFloatText(target.side, `🛡️ +${shieldGain} 溢出圣盾`, 'shield');
        }
      }

      return actual;
    },

    addShield(target, amount) {
      const weather = WEATHERS[state.weatherIdx] || WEATHERS[0];
      const mult = weather.id === 'frost' ? 1.30 : 1.0;
      const val = Math.round(amount * mult);
      target.shield += val;
      sfx.playShield();
      const pt = getStageCenter(target.side);
      spawnSigil(pt.x, pt.y, '#93c5fd', target.id === 'glm' ? 'rhombus' : 'star8', 105);
      showFloatText(target.side, `🛡️ +${val} 圣盾`, 'shield');
      return val;
    },

    addStatus(target, statusId, turns) {
      target.statuses[statusId] = Math.max(target.statuses[statusId] || 0, turns);
      const meta = STATUS_META[statusId];
      if (meta) showFloatText(target.side, `${meta.icon} ${meta.name}`, 'status');
    },

    removeStatus(target, statusId) {
      target.statuses[statusId] = 0;
    },

    cleanse(target) {
      target.statuses.vuln = 0;
      target.statuses.burn = 0;
    },

    gainEnergy(target, amount) {
      target.energy = Math.min(target.maxEnergy, target.energy + amount);
    },

    addResonance(target, amount) {
      target.resonance = Math.min(100, (target.resonance || 0) + amount);
    }
  };

  // ==========================================================================
  // 6. 回合运转与状态结算 (精确修复时序与减益持续)
  // ==========================================================================
  function beginTurn(side) {
    if (checkBattleEnd()) return;

    state.activeSide = side;
    const actor = side === 'player' ? state.player : state.enemy;
    actor.turnCount += 1;

    // 技能冷却扣减
    for (const k of Object.keys(actor.cooldowns)) {
      if (actor.cooldowns[k] > 0) actor.cooldowns[k] -= 1;
    }

    // 每回合自动恢复 1 点灵力与共鸣
    actor.energy = Math.min(actor.maxEnergy, actor.energy + 1);
    combatCtx.addResonance(actor, 10);

    const weather = WEATHERS[state.weatherIdx] || WEATHERS[0];
    if (weather.id === 'bloom' && actor.hp > 0) {
      combatCtx.heal(actor, 45, true);
    }

    // 再生与星灼：在回合开始时触发并扣减 1 回合
    if (actor.statuses.regen > 0) {
      combatCtx.heal(actor, 95, true);
      actor.statuses.regen -= 1;
      appendLog(`✨ <strong>${actor.name}</strong> 的【再生】生效，恢复了生命值`);
    }
    if (actor.statuses.burn > 0) {
      actor.hp = Math.max(0, actor.hp - 85);
      actor.statuses.burn -= 1;
      showFloatText(actor.side, '🔥 星灼 -85', 'dmg');
      appendLog(`🔥 <strong>${actor.name}</strong> 受到【星灼】灼烧损失 85 点生命`);
      if (checkBattleEnd()) return;
    }

    // 角色被动回合开始生效
    if (actor.id === 'gpt') {
      actor.gptDeduction = Math.min(100, (actor.gptDeduction || 0) + 20);
      if (actor.gptDeduction >= 50) {
        combatCtx.addShield(actor, 40);
      }
    }
    if (actor.id === 'deepseek') {
      actor.stacks = Math.min(4, (actor.stacks || 1) + 1);
    }
    if (actor.id === 'gemini' && actor.turnCount % 2 === 0) {
      combatCtx.addStatus(actor, 'insight', 1);
    }

    if (side === 'player') {
      state.busy = false;
      updateBattleHUD();
      updateSkillButtons();
    } else {
      state.busy = true;
      updateBattleHUD();
      updateSkillButtons();
      safeSetTimeout(runEnemyAI, 860);
    }
  }

  function triggerOverdrive(actor) {
    if (actor.resonance < 100) return;
    actor.resonance = 0;
    sfx.playOverdrive();
    triggerScreenShake();

    const pt = getStageCenter(actor.side);
    spawnSigil(pt.x, pt.y, '#fde047', 'star8', 190);
    spawnShockwave(pt.x, pt.y, '#fde047', 210);
    spawnBurst(pt.x, pt.y, '#fef08a', 42, 'star');

    combatCtx.gainEnergy(actor, 1);
    combatCtx.addShield(actor, 120);
    combatCtx.addStatus(actor, 'boost', 2);
    showFloatText(actor.side, '⚜️ 圣殿共鸣解放！', 'crit');
    appendLog(`⚜️ <strong>${actor.name}</strong> 解放 100% 圣殿共鸣！立即获得 1 点灵力、120 点圣盾与【增幅】！`);

    updateBattleHUD();
    updateSkillButtons();
  }

  function executeAction(actor, target, skill) {
    if (state.busy && actor.side === 'player') return;
    state.busy = true;
    updateSkillButtons();

    const weather = WEATHERS[state.weatherIdx] || WEATHERS[0];

    // 消耗与冷却
    if (skill.cost > 0) {
      actor.energy = Math.max(0, actor.energy - skill.cost);
      if (skill.type === 'skill' && weather.id === 'aurora' && Math.random() < 0.5) {
        actor.energy = Math.min(actor.maxEnergy, actor.energy + 1);
        safeSetTimeout(() => showFloatText(actor.side, '⚡极光返还 +1灵力', 'status'), 200);
      }
    } else {
      actor.energy = Math.min(actor.maxEnergy, actor.energy + 1);
    }

    if (skill.cd > 0) {
      actor.cooldowns[skill.id] = skill.cd + 1;
    }

    const lines = actor.data.battleLines || [];
    if (lines.length > 0 && Math.random() < 0.75) {
      showSpeechBubble(actor.side, lines[Math.floor(Math.random() * lines.length)]);
    }

    const doSkillImpact = () => {
      sfx.playCharSkill(actor.id, skill.type);

      const stageEl = document.querySelector('.battle-stage');
      const camCls = actor.side === 'player' ? 'camera-focus-right' : 'camera-focus-left';
      stageEl.classList.add(camCls);
      safeSetTimeout(() => stageEl.classList.remove(camCls), 460);

      const actorFrame = document.getElementById(`frame-${actor.side}`);
      const lungeClass = actor.side === 'player' ? 'lunge-right' : 'lunge-left';
      actorFrame.classList.remove(lungeClass);
      void actorFrame.offsetWidth;
      actorFrame.classList.add(lungeClass);

      // 记录施法前自身增幅状态，避免刚施加的 self boost 在当回合末被立即扣减
      const hadBoostBefore = actor.statuses.boost;

      const summary = skill.execute(actor, target, combatCtx);
      appendLog(`<strong>${actor.name}</strong> ${summary}`);

      // Claude 天赋回合末治疗 (45 生命)
      if (actor.id === 'claude' && actor.hp > 0) {
        safeSetTimeout(() => {
          combatCtx.heal(actor, 45, true);
          updateBattleHUD();
        }, 260);
      }

      // GPT 施放技能自动推进 15% 推演进度
      if (actor.id === 'gpt') {
        actor.gptDeduction = Math.min(100, (actor.gptDeduction || 0) + 15);
      }

      // 状态扣减时序修复：若 boost 是此动新加的，当回合不扣减
      if (hadBoostBefore > 0 && actor.statuses.boost >= hadBoostBefore) {
        actor.statuses.boost -= 1;
      }
      // 破绽在承受方行动结束时再结算，因此 actor 的 vuln 不在本次攻击末无端消失
      if (actor.statuses.vuln > 0) {
        actor.statuses.vuln -= 1;
      }

      updateBattleHUD();

      safeSetTimeout(() => {
        if (checkBattleEnd()) return;

        if (actor.side === 'enemy') {
          state.turn += 1;
          if (state.turn % 2 === 1) {
            state.weatherIdx = (state.weatherIdx + 1) % WEATHERS.length;
            sfx.playWeatherShift();
            applyWeatherStyle();
            const nw = WEATHERS[state.weatherIdx];
            appendLog(`${nw.icon} 苍穹星象流转为<strong>【${nw.name}】</strong>：${nw.desc}`);
          }
          maybeSpawnBattleOrb();
        }
        beginTurn(actor.side === 'player' ? 'enemy' : 'player');
      }, 740);
    };

    if (skill.type === 'ult' && !state.speedFast) {
      playUltCutIn(actor, skill, doSkillImpact);
    } else {
      doSkillImpact();
    }
  }

  function playUltCutIn(actor, skill, callback) {
    sfx.playUltCutIn(actor.id);
    const overlay = document.getElementById('ult-cutin');
    document.getElementById('ult-img').src = actor.data.image;
    document.getElementById('ult-char-name').textContent = `${actor.name} · 终极奥义`;
    document.getElementById('ult-skill-title').textContent = skill.name;
    document.getElementById('ult-quote-text').textContent = actor.data.ultQuote;

    overlay.classList.add('active');
    safeSetTimeout(() => {
      overlay.classList.remove('active');
      callback();
    }, 1350);
  }

  // ==========================================================================
  // 7. 高阶效用评分 AI 决策系统 (Utility-Scoring AI)
  // ==========================================================================
  function runEnemyAI() {
    const ai = state.enemy;
    const foe = state.player;
    if (!ai || !foe || ai.hp <= 0 || foe.hp <= 0) return;
    const difficulty = state.battleDifficulty;

    if (window.EnemyAI.shouldOverdrive(ai, difficulty)) {
      triggerOverdrive(ai);
    }
    // Claim resources before selecting skills so newly gained energy is usable now.
    if (state.activeOrb && window.EnemyAI.shouldClaimOrb(difficulty)) {
      claimActiveOrb(ai);
    }
    // Hard also capitalizes on resonance that just reached 100 from an orb.
    if (difficulty === 'hard' && window.EnemyAI.shouldOverdrive(ai, difficulty)) {
      triggerOverdrive(ai);
    }
    const chosen = window.EnemyAI.chooseSkill(ai, foe, difficulty, estimateSkillDamage);
    if (chosen) executeAction(ai, foe, chosen);
  }

  function claimActiveOrb(actor) {
    if (!state.activeOrb) return;
    const orb = state.activeOrb;
    sfx.playOrbCollect();
    const pt = getStageCenter(actor.side);
    spawnShockwave(pt.x, pt.y, orb.color, 150);
    spawnBurst(pt.x, pt.y, orb.color, 30, 'star');

    const msg = orb.apply(actor, combatCtx);
    appendLog(`✦ <strong>${actor.name}</strong> ${msg}`);
    clearBattleOrb();
    updateBattleHUD();
    updateSkillButtons();
  }

  // ==========================================================================
  // 8. 战斗伤害预估 (用于战术按钮实时角标)
  // ==========================================================================
  function estimateSkillDamage(skill, attacker, defender) {
    if (!skill.baseMult) return 0;
    const weather = WEATHERS[state.weatherIdx] || WEATHERS[0];
    let raw = attacker.atk * skill.baseMult;

    if (attacker.id === 'gpt') {
      if ((attacker.gptDeduction || 0) >= 100) raw *= 1.30;
      else if ((attacker.gptDeduction || 0) >= 50) raw *= 1.15;
    }
    if (attacker.id === 'glm' && attacker.shield > 0) raw *= 1.20;
    if (attacker.id === 'deepseek' && (attacker.stacks || 1) > 0) {
      raw *= (1 + (attacker.stacks || 1) * 0.10);
    }
    if (attacker.id === 'claude' && (attacker.claudeSolar || 0) > 0) {
      raw *= (1 + (attacker.claudeSolar || 0) * 0.06);
    }
    if (attacker.id === 'grok') {
      const missingRatio = 1 - attacker.hp / attacker.maxHp;
      raw *= (1 + missingRatio * 0.35);
    }
    if (attacker.id === 'gemini' || skill.twinHit) raw *= 1.12;
    if (weather.id === 'frost' && attacker.shield > 0) raw *= 1.15;
    if (attacker.statuses.boost > 0) raw *= 1.30;
    if (defender.statuses.vuln > 0) {
      raw *= 1.25;
      if (attacker.id === 'qwen') raw *= 1.20;
    }

    return Math.round(raw);
  }

  // ==========================================================================
  // 9. 胜负判定、数据统计与三连战巡礼
  // ==========================================================================
  function checkBattleEnd() {
    if (!state.player || !state.enemy) return false;
    if (state.enemy.hp <= 0 || state.player.hp <= 0) {
      const playerWon = state.enemy.hp <= 0;
      const winner = playerWon ? state.player : state.enemy;
      sfx.playVictory();

      safeSetTimeout(() => {
        const modal = document.getElementById('result-modal');
        const crown = document.getElementById('result-crown');
        const title = document.getElementById('result-title');
        const sub = document.getElementById('result-sub');
        const img = document.getElementById('result-img');
        const statsGrid = document.getElementById('result-stats-grid');
        const blessingBox = document.getElementById('gauntlet-blessing-box');
        const rematchBtn = document.getElementById('btn-rematch');

        crown.textContent = playerWon ? '👑' : '⚜️';
        img.src = winner.data.image;
        sub.textContent = winner.data.quote;

        // 渲染战后统计
        statsGrid.innerHTML = `
          <div class="res-stat-item">
            <div class="res-stat-label">战斗回合数</div>
            <div class="res-stat-val">${state.turn} 回合</div>
          </div>
          <div class="res-stat-item">
            <div class="res-stat-label">我方总伤害</div>
            <div class="res-stat-val" style="color:#fde047">${state.stats.playerDamage}</div>
          </div>
          <div class="res-stat-item">
            <div class="res-stat-label">我方实愈生命</div>
            <div class="res-stat-val" style="color:#4ade80">${state.stats.playerHealing}</div>
          </div>
          <div class="res-stat-item">
            <div class="res-stat-label">护盾吸收量</div>
            <div class="res-stat-val" style="color:#93c5fd">${state.stats.playerShields}</div>
          </div>
          <div class="res-stat-item">
            <div class="res-stat-label">暴击次数</div>
            <div class="res-stat-val" style="color:#fbbf24">${state.stats.playerCrits} 次</div>
          </div>
          <div class="res-stat-item">
            <div class="res-stat-label">承受敌方伤害</div>
            <div class="res-stat-val" style="color:#fb7185">${state.stats.enemyDamage}</div>
          </div>
        `;

        // 巡礼模式分支逻辑
        if (state.gameMode === 'gauntlet' && playerWon && state.gauntletStage < 3) {
          title.textContent = `第 ${state.gauntletStage} 关突破 · 圣殿巡礼`;
          rematchBtn.style.display = 'none';
          blessingBox.style.display = 'block';
          renderGauntletBlessings();
        } else if (state.gameMode === 'gauntlet' && playerWon && state.gauntletStage === 3) {
          title.textContent = `👑 圣殿大圆满 · 苍穹封神！`;
          rematchBtn.style.display = 'inline-flex';
          rematchBtn.textContent = '👑 再次开启圣殿巡礼';
          blessingBox.style.display = 'none';
        } else {
          title.textContent = playerWon ? `${winner.name} · 凯旋加冕` : `${winner.name} · 技高一筹`;
          rematchBtn.style.display = 'inline-flex';
          rematchBtn.textContent = '⚔️ 再战一局';
          blessingBox.style.display = 'none';
        }

        modal.classList.add('active');
      }, 420);
      return true;
    }
    return false;
  }

  function renderGauntletBlessings() {
    const container = document.getElementById('blessing-options');
    container.innerHTML = '';
    const pool = [...GAUNTLET_BLESSINGS].sort(() => Math.random() - 0.5).slice(0, 3);

    pool.forEach(b => {
      const card = document.createElement('div');
      card.className = 'blessing-card';
      card.innerHTML = `
        <div class="blessing-name">${b.name}</div>
        <div class="blessing-desc">${b.desc}</div>
      `;
      card.addEventListener('click', () => {
        sfx.playSelect();
        state.appliedBlessings.push(b);
        state.gauntletStage += 1;
        // 挑选下一关未对阵过的对手
        const nextEnemies = CHARS.filter(c => c.id !== state.playerId && c.id !== state.enemyId);
        state.enemyId = nextEnemies[Math.floor(Math.random() * nextEnemies.length)].id;
        document.getElementById('result-modal').classList.remove('active');
        startBattle();
      });
      container.appendChild(card);
    });
  }

  // ==========================================================================
  // 10. HUD 与 4 技能槽刷新
  // ==========================================================================
  function updateBattleHUD() {
    const p = state.player;
    const e = state.enemy;
    if (!p || !e) return;

    const modeText = state.gameMode === 'gauntlet' ? `巡礼 第${state.gauntletStage}/3关 · ` : '';
    document.getElementById('turn-num').textContent = `${modeText}TURN ${state.turn} · ${state.activeSide === 'player' ? '我方回合' : '敌方回合'}`;

    document.getElementById('frame-player').classList.toggle('active-turn', state.activeSide === 'player');
    document.getElementById('frame-enemy').classList.toggle('active-turn', state.activeSide === 'enemy');
    document.getElementById('frame-player').classList.toggle('shielded', p.shield > 0);
    document.getElementById('frame-enemy').classList.toggle('shielded', e.shield > 0);

    const odBtn = document.getElementById('overdrive-btn');
    odBtn.classList.toggle('ready', state.activeSide === 'player' && !state.busy && p.resonance >= 100);

    renderSideHUD('player', p);
    renderSideHUD('enemy', e);
  }

  function renderSideHUD(side, fighter) {
    document.getElementById(`hud-${side}-name`).textContent = fighter.name;
    document.getElementById(`hud-${side}-title`).textContent = fighter.data.title;

    const shieldTxt = fighter.shield > 0 ? ` (+🛡️${fighter.shield})` : '';
    document.getElementById(`hud-${side}-hp-text`).textContent = `${fighter.hp} / ${fighter.maxHp}${shieldTxt}`;

    const hpPct = Math.max(0, Math.min(100, (fighter.hp / fighter.maxHp) * 100));
    const shPct = Math.max(0, Math.min(100, (fighter.shield / fighter.maxHp) * 100));
    document.getElementById(`hud-${side}-hp-bar`).style.width = `${hpPct}%`;
    const ghostEl = document.getElementById(`hud-${side}-ghost-bar`);
    if (ghostEl) ghostEl.style.width = `${hpPct}%`;
    document.getElementById(`hud-${side}-shield-bar`).style.width = `${shPct}%`;

    const resPct = Math.min(100, Math.round(fighter.resonance || 0));
    document.getElementById(`hud-${side}-res-label`).textContent = `⚜️ 圣殿共鸣 ${resPct}%`;
    document.getElementById(`hud-${side}-res-bar`).style.width = `${resPct}%`;

    const pipsEl = document.getElementById(`hud-${side}-energy`);
    let pipsHtml = `<span class="energy-label">灵力</span>`;
    for (let i = 1; i <= fighter.maxEnergy; i++) {
      pipsHtml += `<span class="energy-pip ${i <= fighter.energy ? 'filled' : ''}"></span>`;
    }
    pipsEl.innerHTML = pipsHtml;

    const statusEl = document.getElementById(`hud-${side}-statuses`);
    const badges = [];

    // 专属机制状态徽章展示
    if (fighter.id === 'deepseek') {
      const stacks = fighter.stacks || 1;
      badges.push(`<span class="status-badge" style="border-color:#38bdf8" title="每层提供+10%伤害与+5%常驻减伤">🐋 渊溟压强 ×${stacks}</span>`);
    }

    if (fighter.id === 'gpt') {
      const ded = fighter.gptDeduction || 0;
      if (ded >= 100) {
        badges.push(`<span class="status-badge" style="border-color:#a78bfa; background:rgba(167,139,250,0.22); color:#ddd6fe; font-weight:700" title="真理视界已就绪：下次攻击伤害+30%、无视40%护盾并驱散增幅！">🔮 真理视界就绪</span>`);
      } else {
        badges.push(`<span class="status-badge" style="border-color:rgba(167,139,250,0.4)" title="回合开始+20%，出招+15%；≥50%时攻击+15%并获盾">🔮 推演 ${ded}%</span>`);
      }
    }

    if (fighter.id === 'claude') {
      const sol = fighter.claudeSolar || 0;
      if (sol >= 3) {
        badges.push(`<span class="status-badge" style="border-color:#fb923c; background:rgba(251,146,60,0.22); color:#fed7aa; font-weight:700" title="盛夏绽放已就绪：下次攻击追加75神圣真辉并附加2回合星灼！">🌸 盛夏绽放就绪</span>`);
      } else if (sol > 0) {
        badges.push(`<span class="status-badge" style="border-color:rgba(251,146,60,0.4)" title="每层提供+6%伤害，3层触发盛夏绽放">🌸 日冕 ×${sol}</span>`);
      }
    }

    for (const [k, turns] of Object.entries(fighter.statuses)) {
      if (turns > 0 && STATUS_META[k]) {
        const m = STATUS_META[k];
        badges.push(`<span class="status-badge" title="${m.desc}">${m.icon} ${m.name} (${turns})</span>`);
      }
    }
    statusEl.innerHTML = badges.join('');
  }

  function updateSkillButtons() {
    const p = state.player;
    const e = state.enemy;
    if (!p) return;
    const dock = document.getElementById('skills-dock');
    dock.innerHTML = '';

    p.skills.forEach((skill, idx) => {
      const cdLeft = p.cooldowns[skill.id] || 0;
      const canAfford = p.energy >= skill.cost;
      const disabled = state.busy || state.activeSide !== 'player' || cdLeft > 0 || !canAfford;

      const btn = document.createElement('button');
      btn.className = `skill-btn ${skill.type === 'ult' ? 'ult-btn' : ''}`;
      btn.disabled = disabled;

      const slotTag = idx === 0 ? '普攻' : idx === 3 ? '终极奥义' : `战技 ${idx}`;
      const costText = skill.cost === 0 ? '恢复 1 灵力' : `消耗 ${skill.cost} 灵力`;

      // 实时预估伤害 / 治疗 / 护盾角标
      let previewBadge = '';
      if (skill.baseMult && e) {
        const est = estimateSkillDamage(skill, p, e);
        previewBadge = `<span class="skill-preview-badge">${skill.twinHit ? '双段 2×~' + Math.round(est / 2) : '预计 ~' + est}</span>`;
      } else if (skill.healAmount) {
        previewBadge = `<span class="skill-preview-badge" style="color:#4ade80; border-color:rgba(74,222,128,0.35)">恢复 ~${skill.healAmount}</span>`;
      } else if (skill.shieldAmount) {
        previewBadge = `<span class="skill-preview-badge" style="color:#93c5fd; border-color:rgba(147,197,253,0.35)">圣盾 +${skill.shieldAmount}</span>`;
      }

      // 不可用原因遮罩
      let maskHtml = '';
      if (state.activeSide === 'player' && !state.busy) {
        if (cdLeft > 0) {
          maskHtml = `<div class="skill-cd-mask">冷却中 (${cdLeft} 回合)</div>`;
        } else if (!canAfford) {
          maskHtml = `<div class="skill-cd-mask" style="color:#f87171">灵力不足 (需 ${skill.cost} 点)</div>`;
        }
      }

      btn.innerHTML = `
        <div>
          <div class="skill-btn-header">
            <span class="skill-tag">${slotTag}</span>
            <span class="skill-cost">◆ ${costText}</span>
          </div>
          <div class="skill-title-row">
            <span class="skill-name">${skill.name}</span>
            ${previewBadge}
          </div>
        </div>
        <div class="skill-desc">${skill.desc}</div>
        ${maskHtml}
      `;

      btn.addEventListener('click', () => {
        executeAction(state.player, state.enemy, skill);
      });

      dock.appendChild(btn);
    });
  }

  // ==========================================================================
  // 11. 全局事件绑定
  // ==========================================================================
  document.getElementById('astral-orb-btn').addEventListener('click', () => {
    if (state.activeSide !== 'player' || state.busy) return;
    claimActiveOrb(state.player);
  });

  document.getElementById('overdrive-btn').addEventListener('click', () => {
    if (state.activeSide !== 'player' || state.busy) return;
    triggerOverdrive(state.player);
  });

  document.getElementById('slot-player').addEventListener('click', () => {
    sfx.playCharSelect(state.playerId);
    state.selectingTarget = 'player';
    state.inspectedId = state.playerId;
    renderSelectionScreen(state.playerId);
  });

  document.getElementById('slot-enemy').addEventListener('click', () => {
    sfx.playCharSelect(state.enemyId);
    state.selectingTarget = 'enemy';
    state.inspectedId = state.enemyId;
    renderSelectionScreen(state.enemyId);
  });

  document.getElementById('btn-random-enemy').addEventListener('click', () => {
    const pool = CHARS.filter(c => c.id !== state.playerId);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    state.enemyId = pick.id;
    state.inspectedId = pick.id;
    sfx.playCharSelect(pick.id);

    const b = pick.skillPool.basics[Math.floor(Math.random() * pick.skillPool.basics.length)].id;
    const tShuf = [...pick.skillPool.tacticals].sort(() => Math.random() - 0.5);
    const u = pick.skillPool.ultimates[Math.floor(Math.random() * pick.skillPool.ultimates.length)].id;
    state.loadouts.enemy[pick.id] = {
      basicId: b,
      tacticalIds: [tShuf[0].id, tShuf[1].id],
      ultId: u
    };
    saveLoadouts();
    renderSelectionScreen(pick.id);
  });

  document.getElementById('btn-swap-sides').addEventListener('click', () => {
    sfx.playSelect();
    const tmp = state.playerId;
    state.playerId = state.enemyId;
    state.enemyId = tmp;
    renderSelectionScreen();
  });

  // 模式切换
  document.getElementById('enemy-difficulty').addEventListener('change', (event) => {
    const value = event.currentTarget.value;
    state.aiDifficulty = Object.hasOwn(window.EnemyAI.levels, value) ? value : 'normal';
    try {
      localStorage.setItem('ai_persona_difficulty_v1', state.aiDifficulty);
    } catch (_) {}
    sfx.playSelect();
    renderDifficultySetting();
  });

  document.getElementById('btn-mode-free').addEventListener('click', () => {
    sfx.playSelect();
    state.gameMode = 'free';
    state.gauntletStage = 1;
    state.appliedBlessings = [];
    document.getElementById('btn-mode-free').classList.add('active');
    document.getElementById('btn-mode-gauntlet').classList.remove('active');
  });

  document.getElementById('btn-mode-gauntlet').addEventListener('click', () => {
    sfx.playSelect();
    state.gameMode = 'gauntlet';
    state.gauntletStage = 1;
    state.appliedBlessings = [];
    document.getElementById('btn-mode-gauntlet').classList.add('active');
    document.getElementById('btn-mode-free').classList.remove('active');
  });

  // 演出速度切换
  document.getElementById('btn-speed-toggle').addEventListener('click', (e) => {
    state.speedFast = !state.speedFast;
    e.currentTarget.textContent = state.speedFast ? '⚡ 演出：极速' : '⚡ 演出：标准';
    sfx.playSelect();
  });

  document.getElementById('btn-start-duel').addEventListener('click', startBattle);
  document.getElementById('btn-rematch').addEventListener('click', () => {
    if (state.gameMode === 'gauntlet') {
      state.gauntletStage = 1;
      state.appliedBlessings = [];
    }
    startBattle();
  });

  const backToSelect = () => {
    clearAllBattleTimers();
    sfx.playSelect();
    document.getElementById('result-modal').classList.remove('active');
    document.getElementById('battle-screen').classList.remove('active');
    document.getElementById('select-screen').classList.add('active');
    renderSelectionScreen();
  };

  document.getElementById('btn-back-select').addEventListener('click', backToSelect);
  document.getElementById('btn-nav-reselect').addEventListener('click', backToSelect);

  document.getElementById('btn-mute').addEventListener('click', (e) => {
    const muted = sfx.toggleMute();
    e.currentTarget.textContent = muted ? '🔇 音效：关闭' : '🔊 音效：开启';
  });

  document.getElementById('btn-open-gallery').addEventListener('click', () => {
    const c = getCharById(state.inspectedId);
    sfx.playCharSelect(c.id);
    document.getElementById('gal-img').src = c.image;
    document.getElementById('gal-name').textContent = `${c.name} · ${c.title}`;
    document.getElementById('gal-quote').textContent = c.quote;
    document.getElementById('gal-appearance').textContent = `外观定稿：${c.appearance}`;
    document.getElementById('gal-passive').textContent = `【${c.passive.name}】${c.passive.desc}`;
    document.getElementById('gallery-modal').classList.add('active');
  });

  const zoomBtn = document.getElementById('btn-showcase-zoom');
  if (zoomBtn) {
    zoomBtn.addEventListener('click', () => {
      document.getElementById('btn-open-gallery').click();
    });
  }

  document.getElementById('btn-close-gallery').addEventListener('click', () => {
    document.getElementById('gallery-modal').classList.remove('active');
  });

  // ==========================================================================
  // 12. 机制全解与战斗图鉴 (Guide & System Handbook Modal)
  // ==========================================================================
  let guideRendered = false;

  function renderGuideModal() {
    // 1) 选项卡 1：七大机娘专属机制卡片
    const charList = document.getElementById('guide-chars-list');
    if (charList) {
      charList.innerHTML = CHARS.map(c => {
        const mech = c.mechanic || { badge: '专属机制', name: c.name, steps: [], tips: '' };
        return `
          <div class="guide-char-card" id="guide-char-${c.id}">
            <div class="guide-char-header">
              <div class="guide-char-info">
                <img class="guide-char-avatar" src="${c.image}" alt="${c.name}">
                <div class="guide-char-name-title">
                  <span class="guide-char-name">${c.name}</span>
                  <span class="guide-char-title">${c.title} · ${c.role}</span>
                </div>
              </div>
              <div class="guide-char-badge-row">
                <span class="guide-char-badge" style="border-color:${c.themeColor}; color:${c.themeColor}; background:${c.bgGlow}">${mech.badge}</span>
                <span style="font-size:12px; font-weight:700; color:#f1f5f9">${mech.name}</span>
              </div>
            </div>
            <div class="guide-char-passive">
              <strong>✦ 固有天赋【${c.passive.name}】：</strong>${c.passive.desc}
            </div>
            <div class="guide-char-steps">
              ${(mech.steps || []).map(s => `
                <div class="guide-step-row">
                  <span class="guide-step-tag">${s.label}</span>
                  <span class="guide-step-desc">${s.text}</span>
                </div>
              `).join('')}
            </div>
            <div class="guide-char-tips">
              <strong>⚔️ 对决运转与实战诀窍：</strong>${mech.tips || ''}
            </div>
          </div>
        `;
      }).join('');
    }

    // 2) 选项卡 2：状态·增益与减益全解
    const statusList = document.getElementById('guide-statuses-list');
    if (statusList && window.STATUS_META) {
      statusList.innerHTML = Object.values(window.STATUS_META).map(m => `
        <div class="guide-status-card">
          <div class="guide-status-header">
            <div class="guide-status-title">
              <span style="font-size:16px">${m.icon}</span>
              <span style="color:#fff">${m.name}</span>
            </div>
            <div class="guide-status-pills">
              <span class="guide-pill ${m.category === 'buff' ? 'buff' : 'debuff'}">${m.category === 'buff' ? '增益' : '减益'}</span>
              <span class="guide-pill timing">${({ shield: '护盾值', turn: '持续回合', charge: '受击次数', penalty: '触发惩罚' })[m.kind] || '核心机制'}</span>
            </div>
          </div>
          <div class="guide-status-desc">${m.desc}</div>
          <div style="font-size:10.5px; color:#cbd5e1"><strong style="color:var(--gold-light)">生效时机：</strong>${m.timing || '持续期间实时触发'}</div>
          <div class="guide-status-counter"><strong style="color:#93c5fd">对策克制：</strong>${m.counterplay}</div>
        </div>
      `).join('');
    }

    // 3) 选项卡 3：圣殿战斗底层法则
    const rulesContainer = document.getElementById('guide-rules-container');
    if (rulesContainer && window.SYSTEM_MECHANICS) {
      rulesContainer.innerHTML = window.SYSTEM_MECHANICS.map(rule => `
        <div class="guide-rule-card">
          <div class="guide-rule-title">
            <span>${rule.icon}</span>
            <span>${rule.name}</span>
          </div>
          <div class="guide-rule-summary">${rule.summary}</div>
          <div class="guide-rule-list">
            ${(rule.rules || []).map(d => `<div class="guide-rule-item">${d}</div>`).join('')}
          </div>
        </div>
      `).join('');
    }

    guideRendered = true;
  }

  function openGuideModal(activeTab = 'tab-chars', focusCharId = null) {
    if (!guideRendered) {
      renderGuideModal();
    }
    const modal = document.getElementById('guide-modal');
    if (!modal) return;
    modal.classList.add('active');

    switchGuideTab(activeTab);

    if (focusCharId && activeTab === 'tab-chars') {
      safeSetTimeout(() => {
        const targetEl = document.getElementById(`guide-char-${focusCharId}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          targetEl.style.borderColor = 'var(--gold-main)';
          targetEl.style.boxShadow = '0 0 24px rgba(223, 192, 130, 0.45)';
          safeSetTimeout(() => {
            targetEl.style.borderColor = '';
            targetEl.style.boxShadow = '';
          }, 1800);
        }
      }, 90);
    }
  }

  function closeGuideModal() {
    const modal = document.getElementById('guide-modal');
    if (modal) modal.classList.remove('active');
  }

  function switchGuideTab(tabKey) {
    const tabBtns = document.querySelectorAll('.guide-tab-btn');
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabKey);
    });

    const panes = {
      'tab-chars': document.getElementById('tab-chars'),
      'tab-statuses': document.getElementById('tab-statuses'),
      'tab-rules': document.getElementById('tab-rules')
    };

    Object.entries(panes).forEach(([k, el]) => {
      if (el) el.classList.toggle('active', k === tabKey);
    });
    // 标签页共用滚动容器，切换后从新页开头阅读。
    const body = document.querySelector('.guide-modal-body');
    if (body) body.scrollTop = 0;
  }

  const btnOpenGuide = document.getElementById('btn-open-guide');
  if (btnOpenGuide) {
    btnOpenGuide.addEventListener('click', () => {
      sfx.playSelect();
      openGuideModal('tab-chars', state.inspectedId);
    });
  }

  const btnBattleGuide = document.getElementById('btn-battle-guide');
  if (btnBattleGuide) {
    btnBattleGuide.addEventListener('click', () => {
      sfx.playSelect();
      openGuideModal('tab-chars');
    });
  }

  const btnCloseGuide = document.getElementById('btn-close-guide');
  if (btnCloseGuide) {
    btnCloseGuide.addEventListener('click', () => {
      sfx.playSelect();
      closeGuideModal();
    });
  }

  const btnCloseGuideFoot = document.getElementById('btn-close-guide-foot');
  if (btnCloseGuideFoot) {
    btnCloseGuideFoot.addEventListener('click', () => {
      sfx.playSelect();
      closeGuideModal();
    });
  }

  document.querySelectorAll('.guide-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.playSelect();
      const tab = btn.getAttribute('data-tab');
      switchGuideTab(tab);
    });
  });

  const guideModal = document.getElementById('guide-modal');
  if (guideModal) {
    guideModal.addEventListener('click', (e) => {
      if (e.target === guideModal) {
        closeGuideModal();
      }
    });
  }

  renderSelectionScreen();
})();
