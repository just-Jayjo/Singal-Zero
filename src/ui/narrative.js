export class NarrativeScreen {
  constructor() {
    this._active = false
    this._overlay = null
    this._pages = []
    this._pageIdx = 0
    this._onComplete = null
    this._keyHandler = null
    this._clickHandler = null
    this._done = false
    this._typingTimer = null
    this._promptTimer = null
  }

  show(pages, onComplete) {
    if (this._active) return
    this._active = true
    this._done = false
    this._pages = pages
    this._pageIdx = 0
    this._onComplete = onComplete || null
    this._buildOverlay()
    this._showPage(0)
  }

  _buildOverlay() {
    const overlay = document.createElement('div')
    overlay.id = 'narrative-overlay'
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '250',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0)',
      pointerEvents: 'auto',
      fontFamily: "'Courier New', monospace",
      transition: 'background 1.5s ease',
      userSelect: 'none', WebkitUserSelect: 'none'
    })
    overlay.innerHTML = `
      <div class="narrative-text" style="
        max-width:600px; text-align:center;
        font-size:1.1rem; line-height:1.8;
        color:rgba(255,255,255,0.7);
        text-shadow: 0 0 20px rgba(0,242,255,0.15);
        letter-spacing: 0.05em;
        min-height: 3.6em;
      "></div>
      <div class="narrative-prompt" style="
        opacity:0; transition: opacity 0.8s ease;
        margin-top:40px; font-size:0.85rem;
        color:rgba(0,242,255,0.4);
        letter-spacing:0.3em;
      "><span style="display:inline-block;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid rgba(0,242,255,0.4);margin-right:6px;vertical-align:middle"></span> 按任意鍵繼續</div>
    `
    document.body.appendChild(overlay)
    this._overlay = overlay
    this._textEl = overlay.querySelector('.narrative-text')
    this._promptEl = overlay.querySelector('.narrative-prompt')

    this._keyHandler = (e) => {
      if (e.code === 'Escape') return
      if (this._typingTimer) {
        this._finishTyping()
      } else {
        this._advance()
      }
    }
    document.addEventListener('keydown', this._keyHandler)
    this._clickHandler = () => {
      if (this._typingTimer) {
        this._finishTyping()
      } else {
        this._advance()
      }
    }
    overlay.addEventListener('click', this._clickHandler)
  }

  _showPage(idx) {
    if (idx >= this._pages.length) return
    this._clearTimers()
    if (this._textEl) {
      this._textEl.textContent = ''
      this._textEl.style.opacity = '1'
      this._typeText(this._pages[idx], 0)
    }
    if (this._promptEl) {
      this._promptEl.style.opacity = '0'
      this._promptTimer = setTimeout(() => {
        if (this._promptEl && !this._typingTimer) this._promptEl.style.opacity = '1'
      }, 1200)
    }
    if (this._overlay) {
      this._overlay.style.background = 'rgba(0,0,0,0.88)'
    }
  }

  _typeText(text, idx) {
    if (idx >= text.length) {
      this._typingTimer = null
      if (this._promptEl) this._promptEl.style.opacity = '1'
      return
    }
    if (this._textEl) {
      this._textEl.textContent += text[idx]
    }
    const delay = text[idx] === '，' || text[idx] === '。' || text[idx] === '！' || text[idx] === '？' || text[idx] === '—' ? 180 : 35
    this._typingTimer = setTimeout(() => this._typeText(text, idx + 1), delay)
  }

  _finishTyping() {
    if (this._typingTimer) {
      clearTimeout(this._typingTimer)
      this._typingTimer = null
    }
    if (this._textEl && this._pages[this._pageIdx]) {
      this._textEl.textContent = this._pages[this._pageIdx]
    }
    if (this._promptEl) this._promptEl.style.opacity = '1'
  }

  _advance() {
    if (this._done) return
    this._pageIdx++
    if (this._pageIdx < this._pages.length) {
      this._showPage(this._pageIdx)
    } else {
      this._done = true
      const cb = this._onComplete
      this._onComplete = null
      this._active = false
      this._close()
      if (cb) cb()
    }
  }

  _close() {
    this._removeListeners()
    this._clearTimers()
    if (this._overlay) {
      this._overlay.style.background = 'rgba(0,0,0,0)'
      if (this._textEl) this._textEl.style.opacity = '0'
      if (this._promptEl) this._promptEl.style.opacity = '0'
      setTimeout(() => {
        if (this._overlay && this._overlay.parentNode) {
          this._overlay.parentNode.removeChild(this._overlay)
        }
        this._overlay = null
        this._textEl = null
        this._promptEl = null
        this._active = false
      }, 1500)
    } else {
      this._active = false
    }
  }

  _clearTimers() {
    if (this._typingTimer) {
      clearTimeout(this._typingTimer)
      this._typingTimer = null
    }
    if (this._promptTimer) {
      clearTimeout(this._promptTimer)
      this._promptTimer = null
    }
  }

  _removeListeners() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler)
      this._keyHandler = null
    }
    if (this._clickHandler && this._overlay) {
      this._overlay.removeEventListener('click', this._clickHandler)
      this._clickHandler = null
    }
  }

  hide() {
    this._done = true
    this._clearTimers()
    this._removeListeners()
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay)
    }
    this._overlay = null
    this._textEl = null
    this._promptEl = null
    this._active = false
    this._pages = []
    this._onComplete = null
  }

  isActive() { return this._active }
}
