// ============================================================================
// AI Persona Duel — 七大角色专属音色与技能音效合成引擎 (Web Audio API)
// 为每位角色定制独特的乐器音色、选人旋律动机 (Leitmotif) 与普攻/战技/奥义音效
// ============================================================================

class RoyalAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // 基础合成器：支持包络、滑音、滤波器与泛音
  playTone(freq, {
    type = 'sine',
    duration = 0.25,
    gain = 0.11,
    delay = 0,
    slideFreq = null,
    attack = 0.015,
    filterFreq = null,
    detune = 0
  } = {}) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.detune.setValueAtTime(detune, now);
    osc.frequency.setValueAtTime(Math.max(20, freq), now);
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideFreq), now + duration);
    }

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    if (filterFreq) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, now);
      osc.connect(filter);
      filter.connect(gainNode);
    } else {
      osc.connect(gainNode);
    }

    gainNode.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  // 白噪音声效（用于折扇开合、冰晶碎裂、刀锋破空、海浪）
  playNoise({
    duration = 0.15,
    gain = 0.08,
    delay = 0,
    filterType = 'bandpass',
    startFreq = 1800,
    endFreq = 600,
    q = 2.5
  } = {}) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, now);
    filter.frequency.setValueAtTime(startFreq, now);
    if (endFreq) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(60, endFreq), now + duration);
    }

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration + 0.02);
  }

  // ==========================================================================
  // 1. 七位角色专属【选中音效 (Character Selection Leitmotifs)】
  // ==========================================================================
  playCharSelect(charId) {
    if (this.muted) return;
    this.init();

    switch (charId) {
      case 'gpt': {
        // GPT：紫晶圣殿竖琴大七和弦琶音 (C5 - E5 - G5 - B5 - E6)，庄严温柔
        const notes = [523.25, 659.25, 783.99, 987.77, 1318.5];
        notes.forEach((f, i) => {
          this.playTone(f, { type: 'triangle', duration: 0.42, gain: 0.09, delay: i * 0.055, filterFreq: 3200 });
          this.playTone(f * 2, { type: 'sine', duration: 0.25, gain: 0.035, delay: i * 0.055 + 0.02 });
        });
        break;
      }

      case 'gemini': {
        // Gemini：俏皮猫耳星铃双连跳音 + 上扬喵音滑音
        this.playTone(783.99, { type: 'sine', duration: 0.12, gain: 0.10, delay: 0 });
        this.playTone(1174.66, { type: 'sine', duration: 0.14, gain: 0.10, delay: 0.06 });
        this.playTone(987.77, { type: 'triangle', duration: 0.26, gain: 0.11, delay: 0.13, slideFreq: 1567.98 });
        this.playTone(1975.5, { type: 'sine', duration: 0.22, gain: 0.06, delay: 0.22 });
        break;
      }

      case 'glm': {
        // GLM：哥特冰晶玻璃钟琴 + 古典小调高冷棱镜泛音 (D5 - F5 - A5 - D6)
        const notes = [587.33, 698.46, 880.0, 1174.66];
        notes.forEach((f, i) => {
          this.playTone(f, { type: 'sine', duration: 0.36, gain: 0.10, delay: i * 0.06 });
          this.playTone(f * 2.5, { type: 'sine', duration: 0.18, gain: 0.04, delay: i * 0.06 });
        });
        this.playNoise({ duration: 0.14, gain: 0.04, delay: 0.18, filterType: 'highpass', startFreq: 4500, endFreq: 7000 });
        break;
      }

      case 'deepseek': {
        // DeepSeek：深海空灵水滴声呐 + 鲸歌悠长滑音
        this.playTone(587.33, { type: 'sine', duration: 0.16, gain: 0.11, delay: 0, slideFreq: 880 });
        this.playTone(440, { type: 'sine', duration: 0.52, gain: 0.10, delay: 0.09, attack: 0.08, slideFreq: 659.25 });
        this.playTone(1318.5, { type: 'sine', duration: 0.22, gain: 0.05, delay: 0.16, slideFreq: 1760 });
        break;
      }

      case 'claude': {
        // Claude：暖阳木吉它/竖琴温暖五声拂弦 + 晨曦风铃 (F4 - A4 - C5 - E5 - G5)
        const warmChord = [349.23, 440.0, 523.25, 659.25, 783.99];
        warmChord.forEach((f, i) => {
          this.playTone(f, { type: 'triangle', duration: 0.45, gain: 0.09, delay: i * 0.048, filterFreq: 2400 });
        });
        break;
      }

      case 'qwen': {
        // Qwen：清脆折扇开合声 + 国风古筝五声宫调刮奏 (宫商角徵羽 D5-E5-F#5-A5-B5-D6)
        this.playNoise({ duration: 0.08, gain: 0.10, delay: 0, filterType: 'bandpass', startFreq: 2600, endFreq: 1200, q: 4 });
        const guzheng = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66];
        guzheng.forEach((f, i) => {
          this.playTone(f, { type: 'triangle', duration: 0.34, gain: 0.09, delay: 0.04 + i * 0.038, filterFreq: 3800 });
        });
        break;
      }

      case 'grok': {
        // Grok：叛逆摇滚电音滑音 + 邪魅坏笑切分音 (E4 -> Bb4 -> B4 -> E5)
        this.playTone(329.63, { type: 'sawtooth', duration: 0.14, gain: 0.08, delay: 0, filterFreq: 1800 });
        this.playTone(466.16, { type: 'sawtooth', duration: 0.14, gain: 0.08, delay: 0.07, slideFreq: 493.88, filterFreq: 2200 });
        this.playTone(659.25, { type: 'sawtooth', duration: 0.28, gain: 0.09, delay: 0.15, slideFreq: 698.46, filterFreq: 2600 });
        break;
      }

      default:
        this.playSelect();
    }
  }

  // 技能槽位切换音效
  playLoadoutEquip(charId) {
    this.playTone(523.25, { type: 'triangle', duration: 0.12, gain: 0.08, delay: 0 });
    this.playTone(783.99, { type: 'sine', duration: 0.18, gain: 0.09, delay: 0.04 });
  }

  playSelect() {
    this.playTone(660, { type: 'sine', duration: 0.15, gain: 0.08, delay: 0 });
    this.playTone(990, { type: 'triangle', duration: 0.20, gain: 0.07, delay: 0.04 });
  }

  // ==========================================================================
  // 2. 七位角色专属【差异化技能施放音效 (Character Skill Cast SFX)】
  // ==========================================================================
  playCharSkill(charId, skillType = 'skill') {
    if (this.muted) return;
    this.init();
    const isUlt = skillType === 'ult';
    const isBasic = skillType === 'basic';

    switch (charId) {
      case 'gpt': {
        // GPT：神圣紫晶光束与圣咏共鸣
        const base = isUlt ? [440, 554.37, 659.25, 880, 1108.73] : isBasic ? [523.25, 659.25] : [523.25, 659.25, 783.99, 1046.5];
        base.forEach((f, i) => {
          this.playTone(f, { type: 'triangle', duration: isUlt ? 0.55 : 0.3, gain: 0.10, delay: i * 0.045 });
          this.playTone(f * 2, { type: 'sine', duration: 0.25, gain: 0.05, delay: i * 0.045 + 0.02 });
        });
        break;
      }

      case 'gemini': {
        // Gemini：极速双子二连击脉冲激光与流星雨
        const count = isUlt ? 6 : isBasic ? 2 : 4;
        for (let i = 0; i < count; i++) {
          const f = 660 + i * 180;
          this.playTone(f, { type: 'sine', duration: 0.16, gain: 0.11, delay: i * 0.055, slideFreq: f * 1.4 });
          this.playTone(f * 1.5, { type: 'triangle', duration: 0.12, gain: 0.06, delay: i * 0.055 + 0.02 });
        }
        break;
      }

      case 'glm': {
        // GLM：凛冬冰晶凝结与清脆棱镜折射声
        this.playNoise({ duration: 0.22, gain: 0.09, delay: 0, filterType: 'highpass', startFreq: 3800, endFreq: 6800, q: 3 });
        const iceNotes = isUlt ? [587.33, 880, 1174.66, 1396.91, 1760] : [698.46, 1046.5, 1396.91];
        iceNotes.forEach((f, i) => {
          this.playTone(f, { type: 'sine', duration: 0.32, gain: 0.10, delay: i * 0.05 });
          this.playTone(f * 2.41, { type: 'sine', duration: 0.16, gain: 0.045, delay: i * 0.05 });
        });
        break;
      }

      case 'deepseek': {
        // DeepSeek：深海浪潮涌动 + 空灵鲸鸣声呐
        this.playNoise({ duration: 0.35, gain: 0.08, delay: 0, filterType: 'bandpass', startFreq: 320, endFreq: 980, q: 1.8 });
        this.playTone(220, { type: 'sine', duration: 0.45, gain: 0.12, delay: 0, slideFreq: isUlt ? 440 : 330 });
        this.playTone(587.33, { type: 'sine', duration: 0.40, gain: 0.09, delay: 0.08, attack: 0.06, slideFreq: 880 });
        if (isUlt) {
          this.playTone(880, { type: 'sine', duration: 0.55, gain: 0.10, delay: 0.18, attack: 0.08, slideFreq: 1318.5 });
        }
        break;
      }

      case 'claude': {
        // Claude：温暖日冕竖琴滑奏与治愈钟声
        const notes = isUlt ? [392, 493.88, 587.33, 783.99, 987.77, 1174.66] : [440, 554.37, 659.25, 880];
        notes.forEach((f, i) => {
          this.playTone(f, { type: 'triangle', duration: 0.38, gain: 0.09, delay: i * 0.04, filterFreq: 2800 });
        });
        break;
      }

      case 'qwen': {
        // Qwen：折扇破风斩 + 古筝轮指穿云音效
        this.playNoise({ duration: 0.16, gain: 0.12, delay: 0, filterType: 'bandpass', startFreq: 3200, endFreq: 800, q: 2.2 });
        const scale = isUlt ? [587.33, 739.99, 880, 1174.66, 1479.98] : [587.33, 739.99, 880, 1174.66];
        scale.forEach((f, i) => {
          this.playTone(f, { type: 'triangle', duration: 0.26, gain: 0.10, delay: 0.02 + i * 0.035, slideFreq: f * 1.03 });
        });
        break;
      }

      case 'grok': {
        // Grok：狂气鞭刃破空 + 暗夜重低音电音斩击
        this.playNoise({ duration: 0.14, gain: 0.13, delay: 0, filterType: 'bandpass', startFreq: 2800, endFreq: 420, q: 1.5 });
        this.playTone(isUlt ? 330 : 260, { type: 'sawtooth', duration: 0.26, gain: 0.12, delay: 0, slideFreq: 65, filterFreq: 2200 });
        this.playTone(659.25, { type: 'sawtooth', duration: 0.18, gain: 0.09, delay: 0.05, slideFreq: 987.77, filterFreq: 2600 });
        break;
      }

      default:
        this.playHit(false);
    }
  }

  playStartBattle() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((n, i) => {
      this.playTone(n, { type: 'triangle', duration: 0.38, gain: 0.11, delay: i * 0.07 });
    });
  }

  playHit(isCrit = false) {
    if (isCrit) {
      this.playNoise({ duration: 0.18, gain: 0.14, delay: 0, filterType: 'bandpass', startFreq: 2400, endFreq: 300 });
      this.playTone(240, { type: 'sawtooth', duration: 0.25, gain: 0.13, delay: 0, slideFreq: 65, filterFreq: 2000 });
      this.playTone(987.77, { type: 'triangle', duration: 0.28, gain: 0.11, delay: 0.03, slideFreq: 1480 });
    } else {
      this.playNoise({ duration: 0.11, gain: 0.09, delay: 0, filterType: 'bandpass', startFreq: 1600, endFreq: 400 });
      this.playTone(170, { type: 'triangle', duration: 0.18, gain: 0.11, delay: 0, slideFreq: 68 });
    }
  }

  playShield() {
    this.playTone(587.33, { type: 'sine', duration: 0.28, gain: 0.09, delay: 0 });
    this.playTone(880, { type: 'sine', duration: 0.35, gain: 0.08, delay: 0.06 });
  }

  playShatter() {
    this.playNoise({ duration: 0.28, gain: 0.14, delay: 0, filterType: 'highpass', startFreq: 2500, endFreq: 900 });
    this.playTone(1240, { type: 'sawtooth', duration: 0.18, gain: 0.11, delay: 0, slideFreq: 260, filterFreq: 3200 });
    this.playTone(880, { type: 'triangle', duration: 0.24, gain: 0.10, delay: 0.05, slideFreq: 180 });
  }

  playOrbCollect() {
    this.playTone(783.99, { type: 'sine', duration: 0.18, gain: 0.10, delay: 0 });
    this.playTone(1046.5, { type: 'sine', duration: 0.22, gain: 0.10, delay: 0.05 });
    this.playTone(1318.5, { type: 'triangle', duration: 0.28, gain: 0.09, delay: 0.10 });
  }

  playOverdrive() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1567.98];
    notes.forEach((f, idx) => {
      this.playTone(f, { type: 'triangle', duration: 0.42, gain: 0.12, delay: idx * 0.045 });
    });
  }

  playWeatherShift() {
    this.playTone(440, { type: 'sine', duration: 0.4, gain: 0.07, delay: 0, slideFreq: 660 });
    this.playTone(660, { type: 'sine', duration: 0.45, gain: 0.07, delay: 0.12, slideFreq: 880 });
  }

  playHeal() {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((f, idx) => {
      this.playTone(f, { type: 'sine', duration: 0.36, gain: 0.08, delay: idx * 0.06 });
    });
  }

  playUltCutIn(charId) {
    this.playCharSelect(charId);
    const notes = [329.63, 440, 659.25, 880, 1174.66];
    notes.forEach((f, idx) => {
      this.playTone(f, { type: 'triangle', duration: 0.55, gain: 0.10, delay: 0.12 + idx * 0.055 });
    });
  }

  playVictory() {
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    fanfare.forEach((f, idx) => {
      this.playTone(f, { type: 'triangle', duration: 0.5, gain: 0.11, delay: idx * 0.09 });
    });
  }
}

window.soundFX = new RoyalAudioEngine();
