# PROGRESS — 訊號：零層

## 2026-07-20 Session — game.js 重構：拆成 5 個模組 + Bug 修復

### Changes

**Bug 修復**
- **`unlisten()` 缺 `mouseup` 移除**: `listen()` 註冊了 `mouseup` 事件但 `unlisten()` 從未 remove，導致多次 listen/unlisten 後多個 handler 疊加。已補上 `document.removeEventListener('mouseup', this._bound.mouseup)`
- **`start()` 缺執行中檢查**: 重複呼叫 `start()` 時會疊加多個 `animate()` 循環。已加入 `if (this.running) return` 守衛

**程式碼重構（game.js 1720 行 → 5 個模組）**
- `game.js`（~590 行）: 建構子（分組區域標題 + 註釋）、`init()`、`listen()/unlisten()`、`start()`、`animate()`、`restart()`、`restartContinue()`、`resize()`、靜態 getter
- `gameCombat.js`（~390 行）: 所有交戰、撿拾、碰撞、特效方法
- `gameLevel.js`（~310 行）: 關卡建立、波次管理、Boss 生成、關卡推進
- `gameEnding.js`（~290 行）: 結尾序列、結果畫面、資料日誌廊
- `gameTraining.js`（~200 行）: 訓練模式啟用、敵情面板、目標生成、暫停/退出

**建構子統一整理**: 使用 `/* === 類別標題 === */` 分組，建立時順便附單行說明（約 12 個分組區域）

### 設計決策（跨模型接手用）
- 拆檔策略: 每個子模組 export `addXxxMethods(Game, ...deps)` 函式，game.js 在 class 定義後呼叫將 prototype method 掛上。好處是所有 `this.xxx` 照常運作、無需改變外部呼叫端
- `LEVEL_CLASSES`/`_textureCache`/`_modelCache`: 維持 module-level 常數，透過閉包傳入各子模組，不設 static property（減少耦合）
- `_bound` 事件參考留在 game.js constructor 內（唯一合理位置），子模組共用

## 2026-07-19 Session (Final Polish) — 全面Code Review + Bug Fixes

### 程式碼審查發現與修復

**Game-Breaking Bugs（已修復）**
- **ShieldGuardian `_descentProtection` 永久啓用**: 建構子設 `true` 但從未設為 `false`，Boss 永久承受 80% 減傷且無法進入 chase 狀態。改為計時器（3 秒後自動解除）
- **Level4 關卡內容缺失**: 6 個 build 方法（`buildCrumbledStructures`/`buildDebrisFields`/`buildHangingCables`/`buildWarningBarriers`/`buildElevatedPlatforms`/`buildRobotDecorations`）從未被 `build()` 呼叫。關卡只有四面牆+天花板。已全部補上
- **Level4 `updateFlicker` 燈光亮度歸零**: `light.intensity = light.intensity * (0.9+flicker*0.1)` 每次 decay 使亮度趨近於零。改為存儲 `baseIntensity` 並使用常數基值
- **Level3 `buildElevatedPlatforms()` 未呼叫**: 無平台、無 stairAreas、跳台 spawn 死碼。已補上
- **Level5 天花板燈光在頂板之上**: 天花板 y=5.0，燈具 y=5.4/5.7（看不見）。下移至 y=4.6/4.9

**GPU 記憶體洩漏（已修復）**
- **所有 6 個 level `clear()`**: 遍歷所有 tracked arrays，對每個 Mesh 的 geometry/material 執行 `dispose()`
- **game.js `advanceLevel()` / `restart()`**: 完整清理敵人網格、_debrisList、_endingParticles、_endingKeyHandler/ClickHandler listener、_endingOverlay DOM；爆炸粒子共用幾何不再被 dispose
- **`checkHealthPickups()`**: 補上 geometry/material dispose（ammo/grenade 已有）
- **`datalog.js` collect**: 補上 group traverse dispose
- **`targetDummy:_flashBody()`**: dispose old material 後再 clone
- **`waveSystem`**: 新增 `reset()` 方法

**UI 修正**
- **`#boss-health-container` 與 `#reload-indicator` 重疊**: 均為 `bottom:80px`、z-index:15。boss bar 改為 `bottom:110px`

**安全檢查**: 無 XSS 向量（所有 innerHTML 使用硬編碼文字）、無暴露金鑰、無 eval

### Build
- 29 modules, 873 KB, 0 errors, 0 warnings (clean build)

### 已知待辦（上傳前可選處理）
- `public/models/` 有 ~10 個未使用的 GLB 檔案（~30MB），遊戲全用程式化建模，可刪除縮小套件

## 2026-07-19 Session (BGM Final) — 音量・速度・延音三輪修正

### Changes
- **Master gain 2.0x + normalize to 0.98**: clip 後 normalization 確保接近 0dB
- **audio.js 音量拉滿**: `audioEl.volume` 0.8→1.0, `gain.gain` 0.8→1.0
- **前奏不再小聲**: 移除 `sectionFactor` 漸進音量、移除 pad 6s fadeIn（intro 與 full 同音量）
- **第一輪（音符過短）**: lead decay `Math.exp(-t*15)`、音長 0.15s → 使用者反應「節奏太快」
- **第二輪修正**: BPM 105→**95**（普通）、120→**105**（boss）；lead spacing 0.3→**0.38s**；decay `Math.exp(-t*15)`→`Math.exp(-t*8)`；音長 0.15→**0.35s**
- **琶音放慢**: spacing 0.15→**0.2s**、decay `Math.exp(-t*12)`→`Math.exp(-t*10)`
- **WAV 重新生成**: 兩個檔案各 ~6.8 MB，build 通過

### 使用者回饋記錄
1. 「BGM太小聲、前奏太小聲、旋律太拖（恐怖感）」→ 整體音量↑、前奏↑、音符縮短
2. 「節奏太快，拖延可以不要太長」→ BPM↓、適度延音、音符不拖

## 2026-07-18 Session (Bug Fixes) — 暫停恢復 · 訓練退出

### Bug Fixes
- **暫停後無法恢復** (`index.html`): `#training-exit-btn` 元素在 HTML 中缺失，導致 `onPointerLockChange()` 嘗試 `document.getElementById('training-exit-btn').style.display = ...` 時抛出 null reference error，`this.paused = true` 永遠不會被執行。結果：遮罩顯示但 `paused` 仍是 `false`，角色持續移動。修正：在 blocker 的 `.title-area` 內加入缺失的 `<button id="training-exit-btn">` 元素
- **訓練模式右上角退出按鈕無效** (`index.html`): `#training-exit-hud` 在 `#hud`（`pointer-events: none`）內，沒有覆寫 `pointer-events: auto`，點擊事件到不了按鈕。修正：加入 `pointer-events: auto` CSS 屬性
- **暫停畫面缺退出訓練按鈕** (`index.html`): `#training-exit-btn` 的 CSS 和 JS 都寫好了但 HTML 缺元素，現在補上
- **多餘 `</div>` 標籤** (`index.html`): 移除 blocker 後方多餘的 `</div>`

### Build
- 29 modules, ~852 kB, 0 errors

---

## 2026-07-18 Session (Collision Fix) — 碰撞盒全面修正 · 最終 Boss 強化

### Changes
- **碰撞盒策略徹底反轉** (`level1-5.js:computeCollisionBoxes`): 移除所有裝飾物的自動碰撞過濾迴圈（原本嘗試以 y>0.6 等啟發式過濾，導致天空粒子 `THREE.Points` 的 `Box3.setFromObject` 算出全場包圍盒，所有關卡完全無法移動）。改回只處理 `this.walls`
- **結構物碰撞手動加入**:
  - `level1:buildSupportColumns()` — 3 段主柱體 Mesh 加入 `this.walls`
  - `level2:buildServerRacks()` — 機櫃主體 Mesh 加入 `this.walls`
  - `level3:buildCoolantTanks()` — 已存在 `this.walls.push(body)`
  - `level5` — 祭壇階梯/石柱、巨石碑主體已存在 `this.walls`
- **Level3 BOSS 重疊修正** (`game.js:_spawnShieldGuardian`): BOSS 生成位置從 (0,0,0) 改為 (6,0,6)，不再與玩家起點重疊

### SignalCore 最終 Boss 強化
- **HP** 200 → 500，血量條更長
- **6 種攻擊模式**:
  1. **Aimed Shot** (全階段) — 指向性射擊，P1:1發/P2:2發/P3:3連發
  2. **Orbital Burst** (P2+) — 軌道環放射狀彈幕，每環 8-12 發
  3. **Pulse Wave** (P2+) — 擴散衝擊波，擊中時造成傷害
  4. **Summon Minions** (P2+) — 召喚 Rusher/PatrolBot，P3 數量與強化增加
  5. **Vortex Pull + Explosion** (P3) — 將玩家拉向核心後大爆炸 (20傷害)
  6. **Phase Nova** (過場) — 轉階段時 360° 放射狀彈幕
- **冷卻時間隨階段縮短**，射程增加至 40

### Bug fixes
- **敘事系統交錯鎖定** (`narrative.js:_advance`): `_close()` 的 `_active = false` 設在 1500ms 非同步計時器內，導致連續呼叫 `show()`（如第三關的關卡敘事 → BOSS簡介）被 `if (this._active) return` 擋住。BOSS簡介永遠不會顯示，`transitioning` 永遠為 true，玩家無法操作。修正：在呼叫 callback 之前立即設 `this._active = false`

### ShieldGuardian（第三關 BOSS）強化
- **HP 120→250 + 護盾 80→120**，速度/傷害/射速全面提升
- **狂怒模式**（HP < 50%）: 速度 2.5、射速 0.6s、雙連發砲擊、傷害 18
- **衝鋒攻擊**: 以 12m/s 朝玩家突進，近身造成傷害
- **召喚小兵**: 狂怒後每 12s 召喚強化 Rusher

### SignalCore HP 500→800

### Build
- 29 modules, ~835 kB, 0 errors

## 2026-07-18 Session (Final) — 碰撞盒修正 · 關卡重排 · 素材重繪 · 雷射誤擊

### Changes
- **碰撞盒過濾修正** (`level1-5.js:computeCollisionBoxes`): 原本 `y>0.2` 門檻太低導致地面碎塊阻擋玩家。改為 `y>0.6 || (x>0.8 && z>0.8 && y>0.3)` 並加上 `dec.isPoints` 跳過 — 每個關卡 `buildSky()` 的 300 顆粒子 (`THREE.Points`) 被 `Box3.setFromObject` 算出全場包圍盒，使所有關卡完全無法移動
- **雷射誤擊修正** (`sniper.js:258`): 紅色雷射線被子彈 raycaster 誤判擊中，新增 `raycast = () => {}` 跳過
- **關卡順序重排** — 新順序：L1 小兵 → L2 小兵 → L3 BOSS(壁壘守護者) → L4 小兵 → L5 BOSS(訊號核心)。對應調整：LEVEL_CLASSES/NARRATIVE_LEVELS/LEVEL_NAMES/`_setupWaves` case/wave 清場條件
- **所有 Emoji 替換為 CSS/SVG 繪製圖示** — HUD/按鈕/懸浮/波次提示/敵情面板/結尾畫面，共約 20+ 處全數取代
- **敵情面板 & 訓練提示加長** — 四種敵人皆有 SVG 手繪 icon + 詳細描述 + 戰術提示

### Build
- 29 modules, ~829 kB, 0 errors

## 2026-07-18 Session (Late) — Training Mode / 射擊場

### 新功能：訓練模式
- 選擇「訓練模式」不再只是數值減半，而是載入專屬**射擊場地圖**
- 寬敞室內場地（60×60），有天花板照明、地面格線、距離標示柱（5m~25m）
- **8 個靜態靶**：圓形靶面 + 靶心 + 靶環，分布在 8m~20m 距離
- **4 個動態靶**：左右往復平移（速度 2.5，範圍 ±4m）
- 擊中靶子：白色閃光回饋 → 靶子隱藏 → 1.2 秒後復位
- **無限子彈**：所有武器 reserveAmmo = Infinity
- 跳過開場劇情、跳過波次系統、跳過死亡（不會遊戲結束）
- 射擊場沒有敵人傷害、沒有撿拾物

### 檔案
- **新增** `src/enemies/targetDummy.js`：TargetDummy 類別，支援靜態/動態模式、擊中閃光、自動重生
- **新增** `src/levels/trainingRange.js`：TrainingRange 場地（牆、地板、天花板、照明、距離標記、靶子生成）
- **修改** `src/core/game.js`：`start()` 檢測 `difficulty === 'easy'` 時導入 TrainingRange，跳過一般遊戲流程
- **修改** `src/core/weapon.js`：`WeaponBase.shoot()` 與 `BurstRifle.fireBurst()` 加入 `mesh.visible` 過濾，防止射中隱藏中的靶子

### 子彈穿牆修正
- **所有玩家武器**（手槍、步槍）：`WeaponBase.shoot()` 與 `BurstRifle.fireBurst()` 加入 `level.walls` raycast — 若牆壁撞擊點比敵人更近則阻擋子彈
- `WeaponManager.shoot()` 與所有武器 `shoot()` 方法新增 `level` 參數，完整傳遞牆壁資料
- 狙擊手原有 `hasLineOfSight()` 已包含 `level.collisionBoxes` 碰撞檢測，不加牆仍有防護

### Bug 修正
- **敘事中誤射**（game.js `onMouseDown`）：加入 `this.narrative.isActive() || this.transitioning` 檢查，關卡間文字說明時點擊不會發射子彈
- **devMode magSize**（game.js:394）：animate 循環中的 devMode 補彈也改為 `magazineSize`（之前漏修此處）

### 難度平衡
- **全體敵方傷害下調**：patrolBot 7→5, rusher 4→3, sniper 15→12
- **rusher 行動模式**：速度 4.5→3.5，側移擺動係數從 1.5/1.0 降至 0.8/0.6 — 更直線衝鋒、更容易命中
- **Level2 最終波**（case 1, 波次 5/5）重新平衡：rusher 3→2 且移除 dmgMult、sniper 2→1 且 hpMult 1.2→1.1、patrolBot hpMult 1.4→1.2 — 敵方數量從 7 降為 5

### Bug Fixes
- **Q key**: now requires `this.enemies.length === 0` to advance (prevents skipping uncleared levels)
- **M key**: now locked behind `this.devMode` (was accidentally accessible to all players)
- **BurstRifle impact sparks** (`weapon.js:613`): added `this.createImpactSpark(hits[0].point)` to `fireBurst()` — rifle now produces orange (`0xff8800`) bullet impact particles like the pistol
- **Pause/unpause pointer lock** (`game.js:856-859`): removed 50ms `setTimeout` around `lockPointer()` call in `resumeFromPause()` — was breaking user gesture chain, causing pointer lock to fail silently on resume

### BGM Redesign — `playBGMLayer()`
- **Super-saw pad**: 7 detuned sawtooth oscillators (±8/±16/±24 cents, Q=2.0) for classic rich pad sound
- **Warm sine pad**: 4 sine voices (root, 3rd, 5th, octave) with dedicated lowpass filter
- **Filter envelope**: pad filter frequency jumps to 700Hz on chord change, then sweeps back to 250Hz over 2.8s — creates breathing motion
- **Arpeggio**: 8-note pattern per trigger, wider range (root → 5th → 3rd → 5th↑ → 3rd → 5th → octave → 5th)
- **Lead melody**: 8-note phrase with wider intervals descending from 5th↑ back to root
- **Bass filter sweep**: lowpass filter opens to 400Hz then closes to 50Hz per note for more attack
- **Timing**: arp on beats 8/14, lead on beats 5/13 (shifted from 6 for better flow)

## 2026-07-18 Session (Late) — BGM Boost & Sniper Visibility

### Changes
- **BGM dedicated boost node** (`audio.js`): added `_bgmBoost` gain node (1.8×) between all BGM sources and `masterGain`. All `playBGMLayer`, `playEndingBGM`, and `playBGMFile` connections rerouted through `_bgmBoost` → `masterGain` → destination. SFX unaffected (still direct to `masterGain`)
- **BGM component gains doubled again**: subGain 0.3→0.5, pad oscillator mix 0.15/3→0.4/3, padGain 0.35→0.55, pad2 oscillator 0.1/2→0.2/2, pad2Gain 0.2→0.35, chord oscillator 0.2/2→0.35/2
- **Sniper laser sight** (`sniper.js`): red `LineBasicMaterial` beam extending 100 units from gun muzzle, red glowing `SphereGeometry` dot at muzzle point. Laser opacity pulses faster in chase state
- **Sniper visor glow pulse**: visor/lens `emissiveIntensity` oscillates — slow pulse (×0.003) in patrol, fast pulse (×0.006) in chase

### Active
- BGM volume should now be significantly louder (dedicated 1.8× boost on top of component gain increases)
- Sniper now immediately locatable via red laser beam and pulsing visor glow

## 2026-07-17 Session — Major Optimization Pass

### Goal
Increase play time, improve UX, raise visual polish across the board.

### Pass 1 — Content & Features
- **Weapon bob** (`weapon.js:83-104`): sine oscillation on X rotate + Y position while moving, phase driven by player movement. Weapon now subtly sways when walking/running.
- **Sprint FOV** (`player.js:110-115`): camera FOV smoothly transitions 75→85 when sprinting, giving a sense of speed.
- **Hit marker** (`game.js:242-244`): crosshair expands on enemy hit (already had CSS class, now actually triggered from `onShoot` callback).
- **Wave expansion** (`game.js:286-318`):
  - Level1 (idx 0): converted from free-roam to 4-wave system (rusher test → patrol → mixed → sniper+rusher)
  - Level2 (idx 1): 3→5 waves (added elite wave + extra mixed wave)
  - Level3 (idx 2): 4→6 waves (added聯合攻勢 wave +猛烈反擊 wave)
- **Level1 wave integration** (`game.js:270-276`): reordered `_setupWaves()` before `spawnEnemies` check so Level1 uses wave system instead of free-roam spawns.
- **Clear condition updated** (`game.js:444-453`): simplified to `currentLevel < 3` check for wave system (includes Level1 now), boss levels auto-clear.
- **Bullet impact sparks** (`weapon.js:165-196`): `createImpactSpark()` spawns 5-8 small colored spheres at hit point with physics (gravity + velocity), fade out over 0.3-0.5s.
- **Ambient particles** (`game.js:580-624`): `_createAmbientParticles()` generates 80 floating dust motes with slow drift velocity, wrapping at level bounds. `_updateAmbientParticles()` runs each frame.
- **Controls hint** (`game.js:578-582`): `_showControlsHint()` fades in WASD/Shift/R/1-2 key guide at bottom of screen for 8 seconds on Level1 start. CSS + HTML in index.html.
- **Wave-based ammo/health drops** (`waveSystem.js:35-55`): `_dropPickup()` spawns a bullet pickup or medkit at random position after each wave clears. Uses existing createBulletPickup/createMedkit.

### Pass 2 — Polish & Refinement
- **Build order fix**: moved `_setupWaves()` before `spawnEnemies` check to prevent double-enemy spawning on Level1.
- **Ammo/health pickup import**: fixed ESM import in waveSystem.js (was using `require`/dynamic import, now proper top-level imports).
- **Level1 flow**: after intro narrative ends, Level1 builds with wave system, controls hint fades in for 8s.

### Build
- 27 modules, 2.68s, 793KB JS
- No warnings/errors

### Fixes (after user testing feedback)
- **Sprint changed to RMB**: removed ShiftLeft/ShiftRight handling, added `onMouseDown`/`onMouseUp` tracking `button === 2`, added `mouseup` event listener + `contextmenu` prevention
- **Weapon not visible fix**: `forward` offset was `-0.XX` (placing weapon BEHIND camera in +Z), changed to **`+0.35`** (weapon now IN FRONT of camera in -Z)
- **Q key not working**: removed `this.currentLevel > 0` restriction; also fixed `idx` used before declaration bug in `advanceLevel()` (ReferenceError on all level transitions)
- **M key not working**: moved out of `else if (devMode)` branch into standalone `if` block
- **Frustum culling**: added `mesh.frustumCulled = false` to all 3 weapon types
- **Difficulty tweaks**: patrolBot dmg 12→8, detectionRange 18→14; rusher dmg 8→5; Level1 waves reworked (no snipers, more forgiving); added 2 extra medkits in Level1
- **Weapon position iteration**: final values → right: 0.40, up: -0.12, forward: 0.35, scale: 1.5, rotateX: 0.12, rotateY: 0.35, rotateZ: 0.04

## 2026-07-18 Session — Hand Fix, Grenade Redesign, Final Polish

### Fixes
- **Hand/Forearm direction**: palm + fingers moved back into weapon group (rotate with weapon, naturally wrap grip); forearm extracted to separate scene object with camera-only quaternion → hangs straight down, not tilted by weapon rotation. Forearm positioned behind grip (+Z, toward camera) to simulate arm extending from below
- **Grenade → 脈衝炸彈**: redesigned to futuristic plasma bomb — smooth ellipsoid (0x3a4a5a metallic), cyan glowing equatorial ring + tip sensor + tail fins + nozzle glow. Old pineapple grooves removed
- **Grenade grooves not visible fix**: groove boxes were at radius 0.037 (inside sphere surface 0.040), now at 0.040 (flush with surface) with pure black color (0x000000)

### Balance
- `explosionRadius`: 15 → 10 → **5** (now matches visual sphere max radius ~5.1)

### Polish — Final Optimization Pass
- **Bug fix**: `magSize` → `magazineSize` in devMode activation (`game.js:86`) — was setting `currentAmmo = undefined`
- **Explosion shadow disc**: dark circle on ground at blast center, expands 8× over 400ms, fades out with 0.5→0 opacity
- **Screen shake**: `Player.shake(intensity, duration)` — random Jitter on camera position during explosions. Rusher contact (0.12, 200ms) and grenade explosion (distance-based, up to 0.15)
- **Trail cleanup**: `WeaponBase.reset()` now properly disposes all active `_trails` before clearing array
- **Restart cleanup**: `Game.restart()` now cleans up `_explosions`, `_enemyTrails`, `_datalogTimeout`, `_particleVelocities`, resets `paused` and `devMode`
- **AdvanceLevel cleanup**: same arrays cleaned on level transition (prevents effect carryover)
- **Dead code removed**: nonexistent `enemy.type === 'drone'` contact damage branch removed from `checkEnemyCollisions()`
- **Build**: 27 modules, 805KB, clean build

### Active
- All basic mechanics and polish in place; ready for playtesting

### Changes
- **Bullet pickup alignment fixed**: cone tip y `0.075*s` → `0.0925*s` (sits flush on cylinder)
- **Detailed PulsePistol model**: added slide, muzzle ring, grip ridges, trigger guard, magazine, side panels
- **Detailed BurstRifle model**: added upper receiver, muzzle brake, handguard vents, grip texture, trigger guard, mag base, stock, tactical rail, ejection port, glow strip
- **Grenade weapon** (`weapon.js`): new `Grenade` class — spherical mesh with grooves/lever/pin, parabolic throw with gravity, 3s fuse or ground impact, area explosion (6m radius, 60 base dmg with falloff), visual explosion sphere + point light
- **WeaponManager**: 3 weapons (pistol, rifle, grenade), switch with keys 1/2/3
- **Grenade pickup** (`pickups.js`): `createGrenadePickup()` — sphere body, grooves, lever, pin, orange glow
- **Level integration**: all 5 levels have `buildGrenadePickups()`, `checkGrenadePickups()` in game.js adds 2 ammo to grenade reserve
- **Pickup count reduced**: Level1 health 4→2 (removed 2 extra), Level1 ammo 4→3
- **Controls hint updated**: Shift→右鍵, 1 2→1 2 3
- **Scale**: 1.5→1.3 (slightly smaller weapon on screen)

### Build
- 27 modules, 801 KB, clean build

### Game Flow (Updated)
- Start → Intro narrative → **Level1 (4 waves)** → intermission → **Level2 (5 waves)** → intermission → **Level3 (6 waves)** → intermission → Boss intro → Level4 (Shield Guardian) → intermission → Level5 (Signal Core) → ending → results

## 2026-07-16 Session

### Completed
- **NarrativeScreen** (`src/ui/narrative.js`): reusable text intermission overlay with fade in/out, page progression, key-to-continue flow, auto-cleanup
- **DataLog collectible** (`src/core/datalog.js`): 7 lore entries (`log_01` to `log_07`) with floating glow-panel mesh, Box3 collision, rotation+bob animation, per-level spawning, collect callback
- **Narrative integration** (`src/core/game.js`):
  - `_buildCurrentLevel()` extracted as reusable level builder
  - `_spawnDatalogPickups()` generates 1 data log per level
  - Opening narrative (`NARRATIVE_INTRO`, 4 pages) plays before level 1
  - Level-specific narrative (`NARRATIVE_LEVELS`, 2-3 pages each) plays between levels via `advanceLevel()`
  - `checkDataLogs()` runs in animate loop for proximity detection
  - `showDatalogPopup()` displays collected log name+text for 5s
  - Game logic (player/enemy updates) skipped during active narrative
  - Key handler returns early when narrative is active
  - Pointer lock change skips pause UI during narrative
- **Datalog popup UI**: CSS + HTML element in `index.html` (centered top, cyan border, auto-hide)
- **Build**: compiles cleanly (23 modules, 0 errors)

## 2026-07-19 Session — Ending Cutscene Redo, Boss Balance, Bug Fixes

### Ending Cutscene Redo (`game.js`)
- **Camera**: replaced static pan-to-center + slow rotation with **dynamic orbit** — camera circles the player at radius 3-4.5m (sinusoidal), subtle Y bob, continuously looks at player position
- **Particles**: 60 floating cyan spheres drift in orbital paths with varying radius, speed, and height, opacity pulses per particle for a "data echo" atmosphere
- **Text reveals**: faster timing (title at 2s, sub at 4.5s, detail at 6.5s, report at 8.5s, credits at 11s, final line at 13s, buttons at 15s, auto-skip at 20s)
- **Buttons**: use `overlay.querySelector` (not `getElementById`), added `mousedown` skip handler for clicking anywhere to dismiss
- **Cleanup**: `remove()` instead of `removeChild()`, particles properly `scene.remove()` + `dispose()` geometry/material

### Bug Fixes
- **Restart button**: `main.js` blocker handler now matches `'點擊開始'` text in addition to existing matches
- **Narrative check in `_showFinalEndingOverlay`**: removed `this.narrative.isActive()` check from skip (no longer needed)

### Build
- 29 modules, 860 KB, clean build

## 2026-07-19 Session — SignalCore Balance, Spawn Fix, Level Skip Debug

### SignalCore (`signalCore.js`)
- **Phase 1 攻擊強化**: aimed shot 改為 2 發連射（原 1 發）、射速 0.8s（原 1.8s）、基礎 speed 22→26（原 15→18），散佈稍微增加讓彈幕更豐富
- **新增追蹤光球** (`_fireTrackingOrbs`): 每 3.5/3.0/2.5 秒發射 3/4/5 顆 cyan 追蹤彈，具備 lerp 導向玩家 + 追蹤強度隨時間遞減，取代部分全頻攻擊
- **全頻攻擊大幅降低頻率**: orbitalBurst 9→7s（原 4.5→3）、pulseWave 10→8s（原 7→4）、summon 固定 15s（原 9→5）、missile 14s（原 5）、laser 8s（原 4）、vortex 14s（原 12）
- **Phase 2/3 回歸單一重型攻擊**（不再同時觸發所有 attack type），改為以追蹤光球 + aimed shot 為主、重型攻擊為輔
- **近身傷害範圍** 8→6m

### 玩家出生位置與面對方向 (`game.js`)
- **Shield Guardian（idx 2）**: 出生從 (-10, -10) → (0, -16)，直接面對 Boss 位置 (4, 0, 0)
- **SignalCore（idx 4）**: 出生從 (-12, -12) → (0, -16)，直接面對 Boss 位置 (0, 0, 0)
- 訓練場方向已正確（yaw = -π/2 朝向 +X 靶區）

### Debug log 加入
- `advanceLevel()`: 記錄 prev/next level index、cleanup 開始、build level class name
- M/Q key skip handlers: 記錄 currentLevel、transitioning 狀態、enemies 數量

### Build
- 29 modules, 861 KB, clean build
- Level2: 3 waves, Level3: 4 waves, Level4: Shield Guardian boss, Level5: 3-phase Signal Core boss

### Known Issues
- Level4 shield guardian might run out of arena bounds on chase — needs patrol area clamp
- SignalCore phase transitions have short invuln period (1.5s) that's hard to notice
- Ending BGM oscillators have no scheduled stop time; rely on stopBGM() cleanup

## 2026-07-16 Session (Polish)

### Tweaks
- **Level2 server rack spacing**: `offset * 1.5` → `* 2.8`, rack rows spread wider, walkways moved away from racks to prevent overlap
- **Bullet damage reduced**: default pistol 10→9, burst rifle 15→13, backup pistol 9→8 for slightly longer engagement pacing
- **BGM enrichment**: added 4 more chords to progression (8→12), LFO-modulated pad lowpass filter (0.08Hz sine, ±60Hz), second sine pad layer panned right with octave-up doubled chord root, feedback delay on arpeggio (280ms, 0.25 gain), lead melody phrase on beat 6 of every bar, stereo pan for pad layers (L/R ±0.3), drums centered

### Bug Fixes
- **Level4 boss not spawning / can't progress**: duplicate `case 3:` in `_setupWaves()` switch caused Shield Guardian code to be dead code (JavaScript matches first case only). Also clear condition used `currentLevel < 4` putting boss level into wave-system check. Fixed: removed duplicate, routed case 3 → Shield Guardian, case 2 → Level3 proper waves, changed clear condition to use `enemies.length === 0` for `currentLevel >= 3` (boss levels) instead of wave system check.

### Build
- Clean compile, 27 modules, 2.59s

## 2026-07-16 Session (Expansion)

### Bug Fixes
- **pitchMultiplier → 1.0**: vertical mouse speed now equals horizontal (`player.js:27,49`)
- **Camera teleport fix**: first 3 frames after pointer lock are discarded to prevent stale `movementX/Y` from causing sudden rotation jumps (`player.js:53-54`)
- **PatrolBot contact damage removed**: only rusher self-destruct and drone proximity deal contact damage; patrolBot relies on bullets only (`game.js:555-565`)
- **PatrolBot bullet damage increased**: 5 → 12 to compensate for losing contact damage (`patrolBot.js:10`)

### Expansion Completed
1. **NarrativeData extraction** (`src/core/narrativeData.js`): 4 narrative arrays (intro, 5 level texts, boss intro, ending) moved out of `game.js` for clean separation
2. **WaveSystem** (`src/core/waveSystem.js`): generic wave manager with defined waves, countdown between waves, spawn area control, per-enemy HP/damage multipliers, wave messages
   - Level2: 3 waves (patrolBot patrol → rusher rush → mixed)
   - Level3: 4 waves (reinforced patrol → fast strike → triple sniper → final wave)
   - Level4: Shield Guardian boss (single-entity wave)
   - Level5: 3-phase Signal Core boss (spawned directly)
3. **ShieldGuardian boss** (`src/enemies/shieldGuardian.js`): 120 HP, 80-shield energy barrier that blocks frontal damage (dot > -0.3 from front), shield recharges after 5s downtime, fires 15-damage cannon projectiles with visible trail spheres and impact explosion FX
4. **SignalCore 3-phase boss** (`src/enemies/signalCore.js`): 200 HP, 3 phases at 66% and 33% HP:
   - Phase 1: stationary icosahedron core, orbiting torus rings, single projectile, cyan glow
   - Phase 2: dual projectiles with slight spread, magenta glow, faster fire rate (1.3s cd)
   - Phase 3: triple rapid-fire spread, proximity damage (6 DPS within 8m), red glow, core destabilization pulse animation
   - Phase transitions trigger 1.5s invulnerability with core spin animation
   - Projectiles are Three.js sphere meshes with physics update, lifetime, player hit detection
5. **Boss HUD**: health bar with dynamic label (封鎖單位 / 訊號核心), proper show/hide on boss death
6. **Kill feed**: names added for `shieldGuardian` → 壁壘守護者, `signalCore` → 訊號核心

### Game Flow (Full)
- Start → Intro narrative (4 pages) → Level1 (free roam, basic enemies) → intermission → Level2 (3-wave system) → intermission → Level3 (4-wave system) → intermission → Boss intro narrative → Level4 (Shield Guardian boss fight) → intermission → Level5 (3-phase Signal Core boss) → ending sequence → results

### File Changes
- **Modified**: `game.js` (wave/boss integration, clear conditions, imports), `player.js` (teleport fix, pitch=1.0), `patrolBot.js` (damage 12), `hud.js` (boss names), `index.html` (wave/boss HUD elements + CSS)
- **Created**: `narrativeData.js`, `waveSystem.js`, `shieldGuardian.js`, `signalCore.js`

## 2026-07-15 Session

### Completed
- **Platform edge transition fix**: `player.js` elevatedPlatforms check `< hs` → `<= hs`; all 5 levels stairAreas `hd` +0.1 → +0.25
- **BGM synth rewrite**: sub-bass drone, 3 detuned sawtooth pad, 2 triangle chord voices, 4-on-floor kick+click, snare, closed/open hi-hat, arpeggio, 8-chord progression, proper volume balance
- **Scene decoration**: `buildCeilingLights()` (4 pendant fixtures), `buildFloorGlow()` (4 glow strips), `buildConduits()` (wall pipes with glow joints to levels 2-5), `buildTerminals()` (computer terminals to levels 3-5)
- **Railing collision fix**: z-side rail collision boxes removed entirely (were at platform center, blocking stairs); x-side rail collision boxes repositioned to actual rail location
- **Level5 spawn fix**: ritual platform base moved from `this.walls` to `this.decorations`
- **BGM MP3 robustness**: `playBGMFile()` retries 3 times (500ms interval) on failure before falling to synth
- **Tail flame effects**: PatrolBot (2 thrusters, double cone), Rusher (1 thruster, double cone aligned to tilt)
- **Bunker/column decoration**: bunker wall top trim, vertical glow strips, corner dots, glow dots; column corner panels, corner bolts, mid-band glow ring
- **Enemy model detail** (all 3 types): split lines, grills, vents, armor plates, rivets, etc.
- **Ending sequence enhancement**: phased multi-stage narrative overlay with 6 stages (title at 2.5s, sub at 5s, detail at 7s, stats report at 9s, credits at 12s, final line at 15s → results at 18s); added `playEndingBGM()` with pad+bass+bell+noise ambient drone; stats display (kills, time, status); CSS for all new ending elements
- **Ending BGM rewrite**: sine pad chords + filter sweep, sine bass drone, triangle arp, lowpass noise — based on playBGMLayer style
- **Game BGM always uses synth**: `start()` calls `playBGMLayer()` directly (not MP3)
- **Main menu title**: enlarged to 4.5rem, stronger double-layer text-shadow glow
- **Columns (level1) completely redesigned**: tiered shaft (3 segments), vertical fluting grooves, 3-tier capital + 3-tier base with glow trim, corner panel/bolt arrays at 4 heights, double glow waist bands, vent grills, transparent top scan ring
- **BGM drum volume reduced**: kick 0.7→0.4, click 0.4→0.25, snare 0.2→0.12, snare tone 0.12→0.07, hat 0.08/0.04→0.05/0.025
- **Walls enhanced (all 5 levels)**:
  - Level1: vertical divider strips + data access panels with cyan LEDs
  - Level2: server-green mid-band line + vertical dividers + access panels with green LEDs
  - Level3 (bare→enhanced): teal baseboard + crown glow trim + vertical dividers
  - Level4 (bare→enhanced): amber baseboard + crown + warning mid-band + vertical dividers
  - Level5: dim red crown molding + dark vertical dividers
- **Build**: 750KB JS, 2.7s build time

### Active
- **Step 2**: building narrative intermission system (done) — need to add data-log collectibles to all 5 levels, test flow

### Known Issues
- Ending BGM oscillators (bassOsc, padOscs) have no scheduled stop time; rely on `stopBGM()` cleanup — acceptable for ~18s sequence
