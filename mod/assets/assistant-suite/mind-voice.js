'use strict';

(function registerMindVoice(global) {
  const suite = global.__gameAssistantSuite
  if (!suite) return

  const MODULE_KEY = '__gameAssistantMindVoice'
  const HOST_ID = 'mind-voice-assistant-host'
  const STYLE_ID = 'mind-voice-assistant-native-style'
  const CONTAINER_ID = 'mind-voice-assistant-container'
  const DISPLAY_DURATION = 10000
  const RETRY_INTERVAL = 250
  const styles = `
:host { position: fixed; top: 0; left: 0; z-index: 2147483647; width: 0; height: 0; pointer-events: none; }
#mind-voice-assistant-container { position: fixed; top: 18px; right: 18px; display: grid; gap: 10px; width: min(390px, calc(100vw - 36px)); pointer-events: none; }
.mind-voice-toast { pointer-events: auto; opacity: 1; transform: translateX(0); animation: mind-voice-enter 180ms ease-out both; transition: transform 160ms ease-in, opacity 160ms ease-in; }
.mind-voice-toast.is-leaving { opacity: 0; transform: translateX(14px); }
.mind-voice-surface { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 30px; gap: 8px; overflow: hidden; min-height: 66px; box-sizing: border-box; padding: 12px 7px 14px 14px; border: 1px solid rgba(42, 39, 48, 0.14); border-left: 3px solid var(--mind-voice-accent); border-radius: 6px; background: rgba(252, 251, 255, 0.97); box-shadow: 0 10px 24px rgba(35, 33, 40, 0.18), 0 2px 6px rgba(35, 33, 40, 0.12); color: #242128; backdrop-filter: blur(12px); }
.mind-voice-name { margin: 0 0 4px; color: var(--mind-voice-accent); font: 700 13px/1.35 system-ui, sans-serif; }
.mind-voice-text { overflow-wrap: anywhere; color: #413d47; font: 400 14px/1.55 system-ui, sans-serif; white-space: pre-wrap; }
.mind-voice-close { appearance: none; display: inline-grid; place-items: center; width: 30px; height: 30px; margin: -2px 0 0; padding: 0; border: 0; border-radius: 50%; background: transparent; color: #6a6473; cursor: pointer; font: 500 18px/1 system-ui, sans-serif; }
.mind-voice-close:hover, .mind-voice-close:focus-visible { background: rgba(106, 100, 115, 0.12); color: #242128; outline: 0; }
.mind-voice-timer { position: absolute; right: 0; bottom: 0; left: 0; z-index: 1; height: 4px; overflow: hidden; background: rgba(66, 61, 71, 0.14); }
.mind-voice-progress { width: 100%; height: 100%; transform-origin: left; background: var(--mind-voice-accent); transition-property: transform; transition-timing-function: linear; }
@keyframes mind-voice-enter { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
@media (max-width: 480px) { #mind-voice-assistant-container { top: 12px; right: 12px; width: calc(100vw - 24px); } }
@media (prefers-reduced-motion: reduce) { .mind-voice-toast { animation: none; transition: none; } }
`

  if (global[MODULE_KEY]) {
    global[MODULE_KEY].install()
    return
  }

  let patchedStart = null
  let retryTimer = null

  function element(tag, className, text) {
    const node = global.document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function getRoot() {
    let host = global.document.getElementById(HOST_ID)
    if (!host) {
      host = element('div')
      host.id = HOST_ID
      ;(global.document.body || global.document.documentElement).appendChild(host)
    }
    const root = host.shadowRoot || host.attachShadow({ mode: 'open' })
    if (!root.querySelector('#' + STYLE_ID)) {
      const style = element('style')
      style.id = STYLE_ID
      style.textContent = styles
      root.appendChild(style)
    }
    return root
  }

  function getContainer() {
    const root = getRoot()
    let container = root.querySelector('#' + CONTAINER_ID)
    if (container) return container
    container = element('div')
    container.id = CONTAINER_ID
    container.setAttribute('aria-live', 'polite')
    container.setAttribute('aria-relevant', 'additions')
    root.appendChild(container)
    return container
  }

  function asText(value, fallback) {
    return value === undefined || value === null || value === '' ? fallback : String(value)
  }

  function asColor(value) {
    const color = typeof value === 'string' ? value.trim() : ''
    const hex = color.match(/^0x([0-9a-f]{6}|[0-9a-f]{8})$/i)
    if (hex) return '#' + hex[1].slice(0, 6)
    return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color) ? color : '#a33d73'
  }

  function dismiss(toast) {
    if (!toast || toast.dataset.closing) return
    toast.dataset.closing = 'true'
    toast.classList.add('is-leaving')
    global.setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast)
    }, 180)
  }

  function show(pm) {
    const duration = Number(pm && pm.toastDuration)
    const timeout = Number.isFinite(duration) && duration > 0 ? duration : DISPLAY_DURATION
    const toast = element('div', 'mind-voice-toast')
    const surface = element('div', 'mind-voice-surface')
    const body = element('div')
    const close = element('button', 'mind-voice-close', 'x')
    const timer = element('div', 'mind-voice-timer')
    const progress = element('div', 'mind-voice-progress')

    toast.setAttribute('role', 'status')
    toast.style.setProperty('--mind-voice-accent', asColor(pm && pm.color))
    progress.style.transitionDuration = timeout + 'ms'
    close.type = 'button'
    close.title = '关闭'
    close.setAttribute('aria-label', '关闭心声提示')
    close.addEventListener('click', function () { dismiss(toast) })

    body.appendChild(element('div', 'mind-voice-name', asText(pm && pm.name, '心声')))
    body.appendChild(element('div', 'mind-voice-text', asText(pm && pm.text, '')))
    surface.appendChild(body)
    surface.appendChild(close)
    timer.appendChild(progress)
    surface.appendChild(timer)
    toast.appendChild(surface)
    getContainer().appendChild(toast)

    const startCountdown = function () { progress.style.transform = 'scaleX(0)' }
    if (typeof global.requestAnimationFrame === 'function') {
      global.requestAnimationFrame(startCountdown)
    } else {
      global.setTimeout(startCountdown, 0)
    }
    global.setTimeout(function () { dismiss(toast) }, timeout)
  }

  function getMindVoiceTag() {
    const kag = global.TYRANO && global.TYRANO.kag
    const tags = kag && kag.ftag && kag.ftag.master_tag
    return tags && tags.mind_voice
  }

  function install() {
    const tag = getMindVoiceTag()
    if (!tag || typeof tag.start !== 'function') {
      if (retryTimer === null) {
        retryTimer = global.setTimeout(function () {
          retryTimer = null
          install()
        }, RETRY_INTERVAL)
      }
      return false
    }
    if (tag.start === patchedStart || tag.start.__gameAssistantMindVoiceWrapped) {
      patchedStart = tag.start
      return true
    }

    const originalStart = tag.start
    patchedStart = function (pm) {
      const result = originalStart.apply(this, arguments)
      if (suite.isEnabled('mindVoice')) {
        try {
          show(pm || {})
        } catch (error) {
          console.error('[游戏辅助合集] 心声通知显示失败:', error)
        }
      }
      return result
    }
    patchedStart.__gameAssistantMindVoiceWrapped = true
    tag.start = patchedStart
    return true
  }

  global[MODULE_KEY] = { install: install }
  install()
})(window)
