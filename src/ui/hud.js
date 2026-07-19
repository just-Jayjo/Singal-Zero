export class HUD {
  constructor() {
    this.healthFill = document.getElementById('health-fill')
    this.healthNum = document.getElementById('health-num')
    this.realHealthBar = document.getElementById('real-health-bar')
    this.realFill = document.getElementById('real-fill')
    this.realHealthNum = document.getElementById('real-health-num')
    this.ammoDisplay = document.getElementById('ammo-display')
    this.weaponName = document.getElementById('weapon-name')
    this.killFeed = document.getElementById('kill-feed')
    this.hitIndicator = document.getElementById('hit-indicator')
    this.crosshair = document.getElementById('crosshair')
    this.enemyCount = document.getElementById('enemy-count')
    this.reloadIndicator = document.getElementById('reload-indicator')
    this.damageTimeout = null
    this.killTimeouts = []
  }

  update(player, weapon, kills, elapsed, totalEnemies, remainingEnemies, realHealth) {
    if (this.healthFill) {
      const pct = Math.max(0, player.health / player.maxHealth * 100)
      this.healthFill.style.width = pct + '%'
      this.healthFill.className = pct > 60 ? 'safe' : pct > 30 ? 'caution' : 'danger'
    }
    if (this.healthNum) {
      this.healthNum.textContent = Math.ceil(player.health)
    }
    if (realHealth != null && this.realHealthBar) {
      this.realHealthBar.style.display = 'block'
      const realPct = Math.max(0, realHealth / player.maxHealth * 100)
      if (this.realFill) {
        this.realFill.style.width = realPct + '%'
        this.realFill.className = realPct > 60 ? 'safe' : realPct > 30 ? 'caution' : 'danger'
      }
      if (this.realHealthNum) this.realHealthNum.textContent = Math.ceil(realHealth)
    } else if (this.realHealthBar) {
      this.realHealthBar.style.display = 'none'
    }

    if (this.ammoDisplay && weapon) {
      this.ammoDisplay.innerHTML = `${weapon.currentAmmo} <span class="reserve">/ ${weapon.reserveAmmo}</span>`
      this.ammoDisplay.style.color = weapon.currentAmmo <= 0 ? '#ff3e3e' : '#fff'
    }

    if (this.weaponName && weapon) {
      this.weaponName.innerHTML = `<span class="ico ico-arrow"></span> ${weapon.name}`
    }

    if (this.enemyCount) {
      this.enemyCount.textContent = `${remainingEnemies} / ${totalEnemies}`
      this.enemyCount.style.color = remainingEnemies <= 0 ? 'rgba(0,242,255,0.4)' : '#fff'
    }

    if (this.reloadIndicator && weapon) {
      this.reloadIndicator.style.display = weapon.isReloading ? 'block' : 'none'
    }
  }

  addKillFeed(enemyType) {
    if (!this.killFeed) return
    const names = { patrolBot: '巡邏機兵', drone: '懸浮砲塔', rusher: '突擊無人機', sniper: '狙擊無人機', shieldGuardian: '壁壘守護者', signalCore: '訊號核心' }
    const entry = document.createElement('div')
    entry.textContent = `擊殺 ${names[enemyType] || enemyType}`
    entry.style.opacity = '1'
    this.killFeed.appendChild(entry)

    const timeout = setTimeout(() => {
      entry.style.opacity = '0'
      setTimeout(() => entry.remove(), 300)
    }, 2000)
    this.killTimeouts.push(timeout)
  }

  showLevelAdvanceHint(show) {
    const hint = document.getElementById('level-hint')
    if (hint) hint.style.display = show ? 'block' : 'none'
  }

  showDevMode(active) {
    const el = document.getElementById('dev-indicator')
    if (el) el.style.display = active ? 'block' : 'none'
  }

  showDamage() {
    if (!this.hitIndicator) return
    this.hitIndicator.classList.remove('damage')
    void this.hitIndicator.offsetHeight
    this.hitIndicator.classList.add('damage')
    if (this.damageTimeout) clearTimeout(this.damageTimeout)
    this.damageTimeout = setTimeout(() => {
      this.hitIndicator.classList.remove('damage')
    }, 800)
  }

  showHit() {
    if (!this.crosshair) return
    this.crosshair.classList.add('hit')
    setTimeout(() => this.crosshair.classList.remove('hit'), 100)
  }
}
