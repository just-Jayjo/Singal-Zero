import * as THREE from 'three'
import { Game } from './core/game.js'

const game = new Game()
game.init()

document.getElementById('blocker').addEventListener('mousedown', (e) => {
  if (e.button !== 0) return
  if (e.target.closest && e.target.closest('#training-exit-btn')) return
  if (game.audio) game.audio.resumeContext()
  game.lockPointer()
  if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {})
  }
  const flash = document.getElementById('blocker').querySelector('.flash')
  if (flash.textContent === '點擊繼續' || flash.textContent === '按任意鍵繼續' || flash.textContent === '點擊開始') {
    if (game.running) {
      game.resumeFromPause()
    } else {
      game.restartContinue()
    }
  }
})

document.addEventListener('keydown', (e) => {
  if (!game.running || game.transitioning) return
  const blocker = document.getElementById('blocker')
  if (blocker.style.display !== 'none') {
    const flash = blocker.querySelector('.flash')
    if (flash.textContent === '按任意鍵繼續' || flash.textContent === '點擊繼續' || flash.textContent === '點擊開始') {
      if (e.code === 'Escape') return
      e.preventDefault()
      game.lockPointer()
      if (game.audio) game.audio.resumeContext()
      if (game.running) {
        game.resumeFromPause()
      } else {
        game.restartContinue()
      }
    }
  }
})

document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return
  if (e.target.closest && e.target.closest('#blocker')) return
  if (game.narrative && game.narrative.isActive()) return
  if (!game.running || game.transitioning) return
  game.lockPointer()
  const blocker = document.getElementById('blocker')
  if (blocker.style.display !== 'none') {
    const flash = blocker.querySelector('.flash')
    if (flash.textContent === '按任意鍵繼續' || flash.textContent === '點擊繼續' || flash.textContent === '點擊開始') {
      if (game.audio) game.audio.resumeContext()
      if (game.running) {
        game.resumeFromPause()
      } else {
        game.restartContinue()
      }
    }
  }
})

document.getElementById('restart-btn').addEventListener('click', () => {
  game.restart()
})

document.querySelectorAll('#difficulty-select button').forEach(btn => {
  btn.addEventListener('click', () => {
    if (game.audio) game.audio.resumeContext()
    game.setDifficulty(btn.dataset.diff)
    game.currentLevel = 0
    if (btn.dataset.diff === 'easy') {
      document.getElementById('blocker').style.display = 'none'
      document.getElementById('difficulty-select').style.display = 'none'
      document.getElementById('training-select').style.display = 'flex'
    } else {
      game.start()
    }
  })
})

document.querySelectorAll('.training-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (game.audio) game.audio.resumeContext()
    game.trainingEnemy = btn.dataset.enemy
    document.getElementById('training-select').style.display = 'none'
    game.start()
  })
})

document.getElementById('training-exit-btn').addEventListener('mousedown', (e) => {
  e.stopPropagation()
})
document.getElementById('training-exit-btn').addEventListener('click', (e) => {
  e.stopPropagation()
  game.exitTraining()
})

document.getElementById('training-exit-hud').addEventListener('mousedown', (e) => {
  e.stopPropagation()
})
document.getElementById('training-exit-hud').addEventListener('click', () => {
  game.exitTraining()
})

window.addEventListener('resize', () => game.resize())
