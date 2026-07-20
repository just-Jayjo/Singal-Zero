import * as THREE from 'three'
import { NARRATIVE_ENDING } from './narrativeData.js'
import { getAllDatalogIds, getDatalogName, getFullDatalogText } from './datalog.js'

export function addEndingMethods(Game, LEVEL_CLASSES) {

  Game.prototype.startEndingSequence = function() {
    this.transitioning = false
    this.clearReady = false
    for (const e of this.enemies) {
      if (e.clearProjectiles) e.clearProjectiles()
    }
    if (this.audio) this.audio.stopBGM()
    if (this.audio) this.audio.playEndingBGM()
    document.getElementById('hud').style.display = 'none'
    this.narrative.show(NARRATIVE_ENDING, () => {
      this.showResults()
    })
  }

  Game.prototype._showFinalEndingOverlay = function() {
    if (this._endingOverlay) return

    const overlay = document.createElement('div')
    overlay.id = 'ending-overlay'
    overlay.innerHTML = `
      <div class="ending-line ending-title">信號中斷</div>
      <div class="ending-line ending-sub">零層已淨化</div>
      <div class="ending-line ending-detail">最後的訊號脈衝已消散於深空</div>
      <div class="ending-line ending-report">
        <div style="margin-bottom:10px;color:rgba(0,242,255,0.5);font-size:0.75rem;letter-spacing:0.2em;">作戰報告</div>
        <div class="ending-stat">擊殺數：<span id="end-kills">0</span></div>
        <div class="ending-stat">任務時長：<span id="end-time">0:00</span></div>
        <div class="ending-stat">存活狀態：<span id="end-status">存活</span></div>
      </div>
      <div class="ending-line ending-credits">
        <div style="margin-bottom:6px;color:rgba(0,242,255,0.3);font-size:0.8rem;letter-spacing:0.3em;">— 訊號：零層 —</div>
        <div class="ending-credit-line">Made with Three.js</div>
        <div class="ending-credit-line">Web Audio API</div>
        <div class="ending-credit-line">原型開發 2026</div>
      </div>
      <div class="ending-line ending-final"><span style="display:inline-block;width:8px;height:8px;border:1.5px solid rgba(0,242,255,0.3);margin-right:6px;vertical-align:middle"></span> 任務存檔已記錄</div>
      <div class="ending-line ending-buttons" style="opacity:0;transition:opacity 1s ease;">
        <button id="ending-datalog-btn" style="margin:20px 10px 0 0;padding:12px 30px;background:transparent;border:1px solid rgba(0,242,255,0.3);color:rgba(0,242,255,0.7);font-family:'Courier New',monospace;font-size:0.85rem;letter-spacing:0.15em;cursor:pointer;transition:all 0.3s;pointer-events:auto;">檢索日誌</button>
        <button id="ending-menu-btn" style="margin:20px 0 0 10px;padding:12px 30px;background:transparent;border:1px solid rgba(0,242,255,0.3);color:rgba(0,242,255,0.7);font-family:'Courier New',monospace;font-size:0.85rem;letter-spacing:0.15em;cursor:pointer;transition:all 0.3s;pointer-events:auto;">返回主選單</button>
      </div>
    `
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '300',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0)',
      pointerEvents: 'none',
      fontFamily: "'Courier New', monospace"
    })
    document.body.appendChild(overlay)

    for (const el of overlay.querySelectorAll('.ending-line')) {
      el.style.opacity = '0'
      el.style.transition = 'opacity 1.5s ease'
    }

    const reportEl = overlay.querySelector('.ending-report')
    if (reportEl) {
      reportEl.style.textAlign = 'left'
      reportEl.style.fontSize = '13px'
      reportEl.style.color = '#88bbdd'
      reportEl.style.lineHeight = '1.8'
      reportEl.style.border = '1px solid rgba(0,242,255,0.1)'
      reportEl.style.padding = '14px 22px'
      reportEl.style.background = 'rgba(0,10,20,0.4)'
      reportEl.style.minWidth = '200px'
    }

    const creditsEl = overlay.querySelector('.ending-credits')
    if (creditsEl) {
      creditsEl.style.textAlign = 'center'
      creditsEl.style.fontSize = '11px'
      creditsEl.style.color = '#557799'
      creditsEl.style.lineHeight = '1.6'
    }

    const finalEl = overlay.querySelector('.ending-final')
    if (finalEl) {
      finalEl.style.fontSize = '10px'
      finalEl.style.color = '#335566'
    }

    document.getElementById('end-kills').textContent = this.kills
    const minutes = Math.floor(this.elapsedTime / 60)
    const seconds = Math.floor(this.elapsedTime % 60)
    document.getElementById('end-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
    document.getElementById('end-status').textContent = this.player.health > 0 ? '存活' : '墜落'

    this._endingOverlay = overlay

    if (this.audio) {
      try { this.audio.playEndingBGM() } catch {}
    }

    const dlgBtn = overlay.querySelector('#ending-datalog-btn')
    if (dlgBtn) {
      dlgBtn.onclick = () => { this._showDatalogGallery() }
      dlgBtn.addEventListener('mouseenter', () => { dlgBtn.style.borderColor = '#00f2ff'; dlgBtn.style.color = '#00f2ff' })
      dlgBtn.addEventListener('mouseleave', () => { dlgBtn.style.borderColor = 'rgba(0,242,255,0.3)'; dlgBtn.style.color = 'rgba(0,242,255,0.7)' })
    }
    const menuBtn = overlay.querySelector('#ending-menu-btn')
    if (menuBtn) {
      menuBtn.onclick = () => { this._endingOverlay?.remove(); this._endingOverlay = null; this.restart() }
      menuBtn.addEventListener('mouseenter', () => { menuBtn.style.borderColor = '#00f2ff'; menuBtn.style.color = '#00f2ff' })
      menuBtn.addEventListener('mouseleave', () => { menuBtn.style.borderColor = 'rgba(0,242,255,0.3)'; menuBtn.style.color = 'rgba(0,242,255,0.7)' })
    }

    this.enableEndingSequenceControls()
  }

  Game.prototype.enableEndingSequenceControls = function() {
    this._endingKeyHandler = (e) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
        this.skipEndingSequence()
      }
    }
    document.addEventListener('keydown', this._endingKeyHandler)
    this._endingClickHandler = () => { this.skipEndingSequence() }
    document.addEventListener('mousedown', this._endingClickHandler)
  }

  Game.prototype.updateEndingSequence = function(delta) {
    this.endingTimer += delta
    const t = this.endingTimer

    this._endingOrbitAngle += delta * 0.5
    const orbitR = 3 + Math.sin(t * 0.3) * 1.5
    this.camera.position.x = this._endingCameraPos.x + Math.cos(this._endingOrbitAngle) * orbitR
    this.camera.position.z = this._endingCameraPos.z + Math.sin(this._endingOrbitAngle) * orbitR
    this.camera.position.y = 1.6 + Math.sin(t * 0.4) * 0.3
    this.camera.lookAt(this._endingCameraPos.x, 1.0, this._endingCameraPos.z)

    for (const p of this._endingParticles) {
      p.userData.angle += delta * p.userData.speed
      p.position.x = Math.cos(p.userData.angle) * p.userData.radius
      p.position.z = Math.sin(p.userData.angle) * p.userData.radius
      p.position.y = p.userData.height + Math.sin(t * 0.5 + p.userData.angle) * 0.3
      p.material.opacity = 0.2 + Math.sin(t * 0.8 + p.userData.angle * 2) * 0.2
    }

    if (this._endingOverlay) {
      const fadeProgress = Math.min(t / 3, 1)
      this._endingOverlay.style.background = `rgba(0,0,0,${fadeProgress * 0.88})`

      const titleEl = this._endingOverlay.querySelector('.ending-title')
      const subEl = this._endingOverlay.querySelector('.ending-sub')
      const detailEl = this._endingOverlay.querySelector('.ending-detail')
      const reportEl = this._endingOverlay.querySelector('.ending-report')
      const creditsEl = this._endingOverlay.querySelector('.ending-credits')
      const finalEl = this._endingOverlay.querySelector('.ending-final')
      const buttonsEl = this._endingOverlay.querySelector('.ending-buttons')

      if (t > 2 && titleEl && titleEl.style.opacity === '0') {
        titleEl.style.opacity = '1'
        titleEl.style.transition = 'opacity 2s ease'
      }
      if (t > 4.5 && subEl) {
        subEl.style.opacity = '1'
        subEl.style.transition = 'opacity 1.5s ease'
      }
      if (t > 6.5 && detailEl) {
        detailEl.style.opacity = '1'
        detailEl.style.transition = 'opacity 1.5s ease'
      }
      if (t > 8.5 && reportEl) {
        reportEl.style.opacity = '1'
        reportEl.style.transition = 'opacity 1.2s ease'
      }
      if (t > 11 && creditsEl) {
        creditsEl.style.opacity = '1'
        creditsEl.style.transition = 'opacity 1.5s ease'
      }
      if (t > 13 && finalEl) {
        finalEl.style.opacity = '1'
        finalEl.style.transition = 'opacity 1s ease'
        finalEl.style.color = '#00f2ff'
        finalEl.style.textShadow = '0 0 8px rgba(0,242,255,0.3)'
      }
      if (t > 15 && buttonsEl) {
        buttonsEl.style.opacity = '1'
      }
    }

    if (this.endingTimer > 20) {
      this.skipEndingSequence()
    }
  }

  Game.prototype.skipEndingSequence = function() {
    if (this._endingOverlay) {
      this._endingOverlay.remove()
      this._endingOverlay = null
    }
    for (const p of this._endingParticles) {
      this.scene.remove(p)
      p.geometry.dispose()
      p.material.dispose()
    }
    this._endingParticles = []
    if (this._endingKeyHandler) {
      document.removeEventListener('keydown', this._endingKeyHandler)
      this._endingKeyHandler = null
    }
    if (this._endingClickHandler) {
      document.removeEventListener('mousedown', this._endingClickHandler)
      this._endingClickHandler = null
    }
    if (this.narrative.isActive()) {
      this.narrative.hide()
    }
    this.endingSequence = false
    this.currentLevel = LEVEL_CLASSES.length
    this.showResults()
  }

  Game.prototype.showResults = function() {
    this.running = false
    this.unlisten()
    if (this.audio) this.audio.stopBGM()
    const dead = this.player.health <= 0
    const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0
    const minutes = Math.floor(this.elapsedTime / 60)
    const seconds = Math.floor(this.elapsedTime % 60)
    const score = dead ? 0 : this.kills * 100 + accuracy * 5 - this.elapsedTime * 2
    let grade = dead ? 'F' : 'C'
    if (!dead) {
      if (score > 800) grade = 'S'
      else if (score > 600) grade = 'A'
      else if (score > 400) grade = 'B'
    }

    const won = !dead && this.currentLevel >= LEVEL_CLASSES.length - 1
    this._retryLevel = dead ? this.currentLevel : 0
    document.getElementById('result-title').innerHTML = won ? '<span style="display:inline-block;width:14px;height:14px;border:2px solid #00f2ff;margin-right:8px;vertical-align:middle;position:relative;top:-2px"></span> 訊號中斷' : dead ? '任務失敗' : '任務完成'
    document.getElementById('result-subtitle').textContent = won ? '零層已淨化。訊號源頭已被摧毀。倖存者正在撤離。' : ''
    document.getElementById('result-subtitle').style.display = won ? 'block' : 'none'
    document.getElementById('stat-kills').textContent = this.kills
    document.getElementById('stat-accuracy').textContent = accuracy + '%'
    document.getElementById('stat-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
    const gradeEl = document.getElementById('grade')
    gradeEl.textContent = grade
    gradeEl.className = 'grade grade-' + grade.toLowerCase()
    document.getElementById('results-screen').style.display = 'flex'
    if (document.pointerLockElement) document.exitPointerLock()

    const dlgBtn = document.getElementById('datalog-gallery-btn')
    if (dlgBtn) {
      dlgBtn.style.display = won ? 'inline-block' : 'none'
      dlgBtn.onclick = () => this._showDatalogGallery()
    }
    const dgalClose = document.getElementById('dgal-close')
    if (dgalClose) {
      dgalClose.onclick = () => {
        document.getElementById('datalog-gallery').style.display = 'none'
      }
    }
  }

  Game.prototype._showDatalogGallery = function() {
    const container = document.getElementById('dgal-entries')
    if (!container) return
    container.innerHTML = ''
    for (const id of getAllDatalogIds()) {
      const name = getDatalogName(id)
      const text = getFullDatalogText(id)
      const div = document.createElement('div')
      Object.assign(div.style, {
        marginBottom: '24px', padding: '16px', borderLeft: '2px solid rgba(0,242,255,0.2)',
        background: 'rgba(0,10,20,0.3)'
      })
      div.innerHTML = `<div style="color:#00f2ff;font-size:0.9rem;letter-spacing:0.1em;margin-bottom:8px;">${name}</div>
<div style="color:rgba(255,255,255,0.6);font-size:0.85rem;line-height:1.7;white-space:pre-wrap;">${text}</div>`
      container.appendChild(div)
    }
    const gal = document.getElementById('datalog-gallery')
    gal.style.display = 'block'
    gal.scrollTop = 0
    const closeBtn = document.getElementById('dgal-close')
    if (closeBtn) {
      closeBtn.onclick = () => { gal.style.display = 'none' }
    }
  }
}
