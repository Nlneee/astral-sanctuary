# 苍穹圣殿 · Astral Sanctuary

在浏览器中游玩的 AI 拟人游戏合集，包含游戏大厅及两款完整游戏。纯 HTML、CSS、JavaScript，运行时不需要服务器 API、账户或付费服务。

**[点击进入游戏](https://nlneee.github.io/astral-sanctuary/)** · [GitHub 仓库](https://github.com/Nlneee/astral-sanctuary)

## 游戏内容

- **苍穹圣殿**：七位 AI 化身、自由技能配装、策略回合对战与圣殿三连战。
- **机械黎明**：七位守望者、四大关共 80 波、角色专属成长路线、通用品质升级、特殊敌人及多阶段 Boss。
- **技能展示**：机械黎明选角页可进入 Boss 与特殊小怪技能演示。

机械黎明使用 WASD 移动并自动攻击最近敌人；Esc 暂停，F 开关角色属性，Y 刷新升级选项，V 使用“重置”（回复 50 生命，冷却 120 秒）。推荐使用电脑键盘游玩。

音乐与音效在玩家点击进入游戏后启用。游戏记录保存在当前浏览器的本地存储中，不同设备、浏览器及网站地址之间不自动同步。

## 本地运行

需要 Python 3 与现代浏览器：

```sh
python -m http.server 8765
```

打开 `http://localhost:8765/`，从大厅选择游戏。无需安装 npm 依赖。

## 发布到 GitHub Pages

仓库的 `main` 分支内置自动发布工作流。在仓库 **Settings → Pages → Source** 中选择 **GitHub Actions**，推送到 `main` 后会校验脚本、验证核心玩法、生成 `dist/` 并发布网站。部署地址可在 **Actions** 或 **Settings → Pages** 查看。

手动生成与部署完全相同的静态文件：

```sh
python scripts/build_site.py
python -m http.server 8765 --directory dist
```

## 源码入口

| 入口 | 内容 |
| --- | --- |
| `index.html` / `lobby.css` | 游戏大厅 |
| `duel.html` / `game.js` / `characters.js` | 苍穹圣殿 |
| `survivors.html` / `survivors.js` | 机械黎明界面与渲染 |
| `survivor-data.js` / `survivor-core.js` | 数值与战斗逻辑 |
| `survivor-specials.js` / `survivor-hub.js` | 特殊怪物与第四关机制 |
| `survivor-archon-mech.js` / `survivor-archon-spirit.js` | 最终 Boss 两种形态 |
| `boss-showcase.js` / `enemy-showcase.js` | 技能展示 |
| `audio.js` / `survivor-av.js` / `assets/` | 音效、音乐和美术素材 |

其他设计说明与历史测试随项目保留。部署包只包含运行文件及素材，不包含本地备份、测试截图或机器配置。

开发者工具保留在版本中：机械黎明选角色界面输入 `kaifazhe` 可打开调试面板，便于测试数值与关卡。
