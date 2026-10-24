// Browser regression: verify rendered text, guide navigation and battle actions.
// Set NODE_PATH to a directory containing playwright; BROWSER_PATH is optional.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

async function main() {
  const browserPath = process.env.BROWSER_PATH || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ].find(p => fs.existsSync(p));
  const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    // Trace policy calls inside this isolated test browser, without exposing game state in production.
    await page.addInitScript(() => {
      let policy;
      window.__aiDecisions = [];
      Object.defineProperty(window, 'EnemyAI', {
        configurable: true,
        get: () => policy,
        set: original => {
          policy = { ...original, chooseSkill(...args) {
            const skill = original.chooseSkill(...args);
            window.__aiDecisions.push({ difficulty: args[2], skill: skill?.id,
              legal: !skill || (skill.cost <= args[0].energy && !(args[0].cooldowns[skill.id] > 0)),
              maxHp: args[0].maxHp, atk: args[0].atk });
            return skill;
          } };
        }
      });
    });
    const errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.error(e.stack); });
    await page.goto(process.env.GAME_URL || pathToFileURL(path.join(__dirname, 'index.html')).href);
    if (await page.locator('a[href="./duel.html"]').count()) { await page.locator('a[href="./duel.html"]').click(); await page.waitForURL('**/duel.html'); }
    await page.locator('.char-card').first().waitFor();
    const data = await page.evaluate(() => ({ chars: CHARACTERS, statuses: STATUS_META, rules: SYSTEM_MECHANICS }));
    assert.equal(await page.locator('#enemy-difficulty').inputValue(), 'normal');
    const text = selector => page.locator(selector).innerText();
    async function validText(selector) {
      const value = await text(selector);
      assert.ok(value.trim(), `${selector} is empty`);
      assert.doesNotMatch(value, /undefined|\bNaN\b|\[object Object\]/, `${selector} contains invalid text`);
      return value;
    }

    for (let i = 0; i < data.chars.length; i++) {
      const c = data.chars[i];
      await page.locator('.char-card').nth(i).click();
      assert.equal(await text('#insp-name'), c.name);
      assert.equal(await text('#insp-mechanic-tag'), c.mechanic.tag);
      const steps = await validText('#insp-mechanic-steps');
      for (const s of c.mechanic.steps) {
        assert.ok(steps.includes(s.label), `${c.name} missing step label ${s.label}`);
        assert.ok(steps.includes(s.text), `${c.name} missing step text`);
      }
      assert.equal(await page.locator('.skill-option-card').count(), 8);
      assert.equal(await page.locator('.eq-slot-pill').count(), 4);
      const poolText = await validText('#loadout-builder');
      for (const s of [...c.skillPool.basics, ...c.skillPool.tacticals, ...c.skillPool.ultimates]) {
        assert.ok(poolText.includes(s.name) && poolText.includes(s.desc), `${c.name}: ${s.name} is missing`);
      }
      await page.locator('#btn-inspect-mechanic-guide').click();
      await page.locator(`#guide-char-${c.id}`).waitFor({ state: 'visible' });
      await validText('#tab-chars');
      await page.locator('#btn-close-guide').click();
      await page.locator('#btn-showcase-zoom').click();
      assert.ok((await validText('#gal-passive')).includes(c.passive.desc));
      await page.locator('#btn-close-gallery').click();
    }

    await page.locator('#btn-open-guide').click();
    assert.equal(await page.locator('.guide-char-card').count(), data.chars.length);
    const charsText = await validText('#tab-chars');
    for (const c of data.chars) {
      assert.ok(charsText.includes(c.passive.desc) && charsText.includes(c.mechanic.tips));
      for (const s of c.mechanic.steps) assert.ok(charsText.includes(s.label) && charsText.includes(s.text));
    }
    await page.locator('[data-tab="tab-statuses"]').click();
    await page.locator('#tab-statuses').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#tab-chars').isVisible(), false);
    const statusText = await validText('#tab-statuses');
    assert.equal(await page.locator('.guide-status-card').count(), Object.keys(data.statuses).length);
    for (const m of Object.values(data.statuses)) {
      const card = page.locator('.guide-status-card').filter({ has: page.locator('.guide-status-title', { hasText: m.name }) });
      assert.equal(await card.locator('.guide-pill').first().innerText(), m.category === 'buff' ? '增益' : '减益');
      assert.ok(statusText.includes(m.desc) && statusText.includes(m.counterplay), `${m.name} details missing`);
    }
    await page.locator('[data-tab="tab-rules"]').click();
    await page.locator('#tab-rules').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#tab-statuses').isVisible(), false);
    assert.equal(await page.locator('.guide-modal-body').evaluate(el => el.scrollTop), 0);
    const ruleText = await validText('#tab-rules');
    assert.equal(await page.locator('.guide-rule-card').count(), data.rules.length);
    for (const rule of data.rules) {
      assert.ok(ruleText.includes(rule.icon) && ruleText.includes(rule.name));
      for (const detail of rule.rules) assert.ok(ruleText.includes(detail), `${rule.name} detail missing`);
    }
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'guide-after.png') });
    await page.locator('#btn-close-guide-foot').click();

    // Both independent loadouts, presets and tactical slot swap remain usable.
    for (const side of ['player', 'enemy']) {
      await page.locator(`#slot-${side}`).click();
      await page.locator('.char-card').nth(side === 'player' ? 2 : 0).click();
      await page.locator('.preset-chip').nth(1).click();
      await validText('#equipped-slots-bar');
      await page.locator('.tactical-slot-actions').nth(0).locator('button').nth(0).click();
      assert.equal(new Set(await page.locator('.eq-slot-name').allTextContents()).size, 4);
    }
    // Remember difficulty across reloads while preserving existing independent loadouts.
    const savedLoadouts = await page.evaluate(() => localStorage.getItem('ai_persona_loadouts_v2'));
    await page.locator('#enemy-difficulty').selectOption('hard');
    await validText('#difficulty-desc');
    await page.reload();
    assert.equal(await page.locator('#enemy-difficulty').inputValue(), 'hard');
    assert.equal(await page.evaluate(() => localStorage.getItem('ai_persona_loadouts_v2')), savedLoadouts);
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'selection-after.png') });

    await page.locator('#btn-speed-toggle').click();
    for (const mode of ['free', 'gauntlet']) {
      for (const [difficulty, label] of [['easy', '简单'], ['normal', '标准'], ['hard', '困难']]) {
      console.log(`Checking ${mode} / ${difficulty}`);
      await page.locator(`#btn-mode-${mode}`).click();
      await page.locator('#enemy-difficulty').selectOption(difficulty);
      await validText('#difficulty-desc');
      await page.evaluate(() => { window.__aiDecisions = []; });
      await page.locator('#btn-start-duel').click();
      await page.locator('#battle-screen.active').waitFor();
      assert.equal(await text('#battle-difficulty'), `敌方 AI · ${label}`);
      assert.ok((await text('#combat-log')).includes(`敌方 AI 难度：【${label}】`));
      await page.waitForFunction(() => document.querySelector('.skill-btn:not(:disabled)'));
      await page.waitForFunction(() => window.__aiDecisions.length > 0);
      const decisions = await page.evaluate(() => window.__aiDecisions);
      assert.ok(decisions.every(d => d.difficulty === difficulty && d.legal));
      // Difficulty affects decisions, not the enemy's base HP/ATK.
      for (const d of decisions) assert.ok(data.chars.some(c => c.stats.maxHp === d.maxHp && c.stats.atk === d.atk));
      await page.locator('#btn-battle-guide').click();
      await validText('#tab-chars');
      await page.locator('#btn-close-guide').click();
      await validText('#skills-dock');
      await page.locator('.skill-btn').first().click();
      await page.waitForFunction(() => document.querySelector('#combat-log').innerText.includes('造成'));
      await page.waitForFunction(() => document.querySelector('.skill-btn:not(:disabled), #result-modal.active'));
      await validText('#combat-log');
      await validText('#hud-player-hp-text');
      await page.locator(await page.locator('#result-modal').evaluate(el => el.classList.contains('active')) ? '#btn-back-select' : '#btn-nav-reselect').click();
      await page.locator('#select-screen.active').waitFor();
      assert.equal(await page.locator('#enemy-difficulty').inputValue(), difficulty);
      }
    }
    // Fast, isolated progression fixture: one-hit guards let the real result/blessing
    // handlers verify all three stages and rematch without changing production data.
    const progression = await browser.newPage();
    progression.on('pageerror', e => errors.push(e.message));
    await progression.addInitScript(() => {
      let chars;
      Object.defineProperty(window, 'CHARACTERS', {
        get: () => chars,
        set: value => {
          chars = value;
          for (const c of chars) if (c.id !== 'glm') c.stats = { ...c.stats, maxHp: 1, atk: 0, spd: 1 };
        }
      });
    });
    await progression.goto(process.env.GAME_URL || pathToFileURL(path.join(__dirname, 'index.html')).href);
    if (await progression.locator('a[href="./duel.html"]').count()) { await progression.locator('a[href="./duel.html"]').click(); await progression.waitForURL('**/duel.html'); }
    await progression.locator('#enemy-difficulty').selectOption('hard');
    await progression.locator('#btn-speed-toggle').click();
    await progression.locator('#btn-mode-gauntlet').click();
    await progression.locator('#btn-start-duel').click();
    for (let stage = 1; stage <= 3; stage++) {
      await progression.waitForFunction(() => document.querySelector('.skill-btn:not(:disabled)'));
      assert.equal(await progression.locator('#battle-difficulty').innerText(), '敌方 AI · 困难');
      assert.ok((await progression.locator('#turn-num').innerText()).includes(`第${stage}/3关`));
      await progression.locator('.skill-btn').first().click();
      await progression.locator('#result-modal.active').waitFor();
      if (stage < 3) await progression.locator('.blessing-card').first().click();
    }
    await progression.locator('#btn-rematch').click();
    await progression.locator('#battle-screen.active').waitFor();
    assert.ok((await progression.locator('#turn-num').innerText()).includes('第1/3关'));
    assert.equal(await progression.locator('#battle-difficulty').innerText(), '敌方 AI · 困难');
    await progression.close();

    await page.evaluate(() => localStorage.setItem('ai_persona_difficulty_v1', 'obsolete-value'));
    await page.reload();
    assert.equal(await page.locator('#enemy-difficulty').inputValue(), 'normal');
    assert.deepEqual(errors, [], 'Browser runtime errors');
    console.log(`PASS: ${data.chars.length} characters / 56 skills, guides, gallery, loadouts, all 3 difficulties in both modes, saved settings, actual enemy decisions, gauntlet progression and rematch; no runtime errors.`);
  } finally {
    await browser.close();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
