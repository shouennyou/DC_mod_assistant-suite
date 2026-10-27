'use strict';

(function registerDevNotification(global) {
  const suite = global.__gameAssistantSuite
  if (!suite) return

  const MODULE_KEY = '__assistantSuiteDevNotification'
  const API_KEY = 'assistantSuiteDevNotification'
  const HOST_ID = 'assistant-suite-dev-notification-host'
  const STYLE_ID = 'assistant-suite-dev-notification-style'
  const CONTAINER_ID = 'assistant-suite-dev-notification-container'
  const ACHIEVEMENT_CONFIG_PATH = 'assets/assistant-suite/achievements.json'
  const SUITE_CONFIG_PATH = 'config/assistant-suite.json'
  const ACHIEVEMENT_STATE_PATH = 'config/assistant-suite-achievement-state.json'
  const STEAM_ACHIEVEMENT_TAG = 'steam_achievement_activate'
  const STEAM_HOOK_RETRY_INTERVAL = 250
  const ACHIEVEMENT_STATE_POLL_INTERVAL = 750
  const DEFAULT_DURATION = 6000
  const MAX_VISIBLE = 4
  const defaultAchievementConfig = Object.freeze({
    iconBasePath: '',
    fallbackIcon: '',
    achievements: Object.freeze({}),
  })
  const styles = `
:host { position: fixed; top: 0; left: 0; z-index: 2147483647; width: 0; height: 0; pointer-events: none; }
#assistant-suite-dev-notification-container { position: absolute; right: 18px; bottom: 18px; display: grid; gap: 10px; width: min(390px, calc(100% - 36px)); pointer-events: none; }
.assistant-suite-dev-toast { pointer-events: auto; opacity: 1; transform: translateX(0); animation: assistant-suite-dev-enter 180ms ease-out both; transition: transform 160ms ease-in, opacity 160ms ease-in; }
.assistant-suite-dev-toast.is-leaving { opacity: 0; transform: translateX(14px); }
.assistant-suite-dev-surface { position: relative; display: grid; grid-template-columns: 58px minmax(0, 1fr) 26px; gap: 11px; overflow: hidden; min-height: 78px; box-sizing: border-box; padding: 10px 8px 13px 10px; border: 1px solid rgba(190, 147, 255, 0.58); border-radius: 4px; background: linear-gradient(135deg, rgba(72, 47, 103, 0.98), rgba(37, 25, 56, 0.98) 58%, rgba(23, 16, 37, 0.98)); box-shadow: 0 12px 28px rgba(10, 4, 20, 0.62), inset 0 1px rgba(232, 213, 255, 0.16); color: #e3ddec; backdrop-filter: blur(12px); }
.assistant-suite-dev-badge { display: grid; place-items: center; align-self: center; width: 54px; height: 54px; box-sizing: border-box; border: 2px solid rgba(217, 183, 255, 0.8); border-radius: 3px; background: radial-gradient(circle at 35% 30%, #e1c8ff, #9b6ad1 37%, #513371 68%, #251735); box-shadow: inset 0 0 0 3px rgba(22, 11, 36, 0.64), 0 2px 8px rgba(8, 3, 16, 0.48); color: #fff5ff; font: 700 28px/1 Georgia, serif; text-shadow: 0 1px 3px #1c1028; }
.assistant-suite-dev-badge.has-icon { background: #20142f; }
.assistant-suite-dev-icon { display: block; width: 100%; height: 100%; object-fit: cover; }
.assistant-suite-dev-toast.is-hidden .assistant-suite-dev-surface { border-color: rgba(255, 218, 128, 0.94); background: linear-gradient(135deg, rgba(101, 67, 94, 0.98), rgba(56, 33, 66, 0.98) 58%, rgba(34, 20, 43, 0.98)); box-shadow: 0 12px 28px rgba(10, 4, 20, 0.62), 0 0 20px rgba(255, 195, 83, 0.48), 0 0 42px rgba(255, 182, 54, 0.24), inset 0 1px rgba(255, 245, 204, 0.3); animation: assistant-suite-secret-glow 1.8s ease-in-out infinite alternate; }
.assistant-suite-dev-toast.is-hidden .assistant-suite-dev-badge { border-color: rgba(255, 234, 163, 0.96); background: radial-gradient(circle at 35% 30%, #fff5bb, #f2bb4a 39%, #9b5e22 70%, #4a2a22); box-shadow: inset 0 0 0 3px rgba(73, 39, 16, 0.56), 0 0 12px rgba(255, 204, 85, 0.72); color: #fffceb; }
.assistant-suite-dev-toast.is-hidden .assistant-suite-dev-status { color: #ffe4a0; }
.assistant-suite-dev-copy { min-width: 0; align-self: center; }
.assistant-suite-dev-status { margin: 0 0 2px; color: #d4b7ff; font: 700 10px/1.3 system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
.assistant-suite-dev-title { overflow-wrap: anywhere; margin: 0 0 3px; color: #fff7ff; font: 700 14px/1.35 system-ui, sans-serif; }
.assistant-suite-dev-text { overflow-wrap: anywhere; color: #d0c4dc; font: 400 12px/1.4 system-ui, sans-serif; white-space: pre-wrap; }
.assistant-suite-dev-close { appearance: none; display: inline-grid; place-items: center; align-self: start; width: 26px; height: 26px; margin: -2px 0 0; padding: 0; border: 0; border-radius: 2px; background: transparent; color: #c9b4dc; cursor: pointer; font: 400 18px/1 system-ui, sans-serif; }
.assistant-suite-dev-close:hover, .assistant-suite-dev-close:focus-visible { background: rgba(211, 174, 255, 0.2); color: #fff8ff; outline: 0; }
.assistant-suite-dev-timer { position: absolute; right: 0; bottom: 0; left: 0; z-index: 1; height: 3px; overflow: hidden; background: rgba(7, 13, 18, 0.72); }
.assistant-suite-dev-progress { width: 100%; height: 100%; transform-origin: left; background: var(--assistant-suite-dev-accent); transition-property: transform; transition-timing-function: linear; }
@keyframes assistant-suite-dev-enter { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
@keyframes assistant-suite-secret-glow { from { filter: brightness(1); } to { filter: brightness(1.12); } }
@media (max-width: 480px) { #assistant-suite-dev-notification-container { right: 12px; bottom: 12px; width: calc(100% - 24px); } }
@media (prefers-reduced-motion: reduce) { .assistant-suite-dev-toast, .assistant-suite-dev-toast.is-hidden .assistant-suite-dev-surface { animation: none; transition: none; } }
`

  let viewportObserver = null
  let viewportTrackingInstalled = false
  let viewportUpdateScheduled = false
  let achievementConfig = defaultAchievementConfig
  let lastAchievementConfigContent = null
  let steamHookRetryTimer = null
  let patchedSteamAchievementStart = null
  let virtualAchievementState = { unlocked: {} }
  let clearRequestHandled = false

  function element(tag, className, text) {
    const node = global.document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function getRenderableSize() {
    const document = global.document
    const root = document.documentElement
    const body = document.body
    const visualViewport = global.visualViewport
    const width = Number(global.innerWidth) || Number(visualViewport && visualViewport.width) || Number(root && root.clientWidth) || Number(body && body.clientWidth) || 1
    const height = Number(global.innerHeight) || Number(visualViewport && visualViewport.height) || Number(root && root.clientHeight) || Number(body && body.clientHeight) || 1
    return {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    }
  }

  function syncViewportHost() {
    const host = global.document.getElementById(HOST_ID)
    if (!host) return
    const size = getRenderableSize()
    host.style.left = '0px'
    host.style.top = '0px'
    host.style.right = 'auto'
    host.style.bottom = 'auto'
    host.style.width = size.width + 'px'
    host.style.height = size.height + 'px'
  }

  function scheduleViewportSync() {
    if (viewportUpdateScheduled) return
    viewportUpdateScheduled = true
    const sync = function () {
      viewportUpdateScheduled = false
      syncViewportHost()
    }
    if (typeof global.requestAnimationFrame === 'function') global.requestAnimationFrame(sync)
    else global.setTimeout(sync, 0)
  }

  function installViewportTracking() {
    if (viewportTrackingInstalled) return
    viewportTrackingInstalled = true
    if (typeof global.addEventListener === 'function') global.addEventListener('resize', scheduleViewportSync)
    if (global.visualViewport && typeof global.visualViewport.addEventListener === 'function') {
      global.visualViewport.addEventListener('resize', scheduleViewportSync)
    }
    if (typeof global.ResizeObserver !== 'function') return
    viewportObserver = new global.ResizeObserver(scheduleViewportSync)
    const document = global.document
    if (document.documentElement) viewportObserver.observe(document.documentElement)
    if (document.body) viewportObserver.observe(document.body)
  }

  function getRoot() {
    const mount = global.document.documentElement || global.document.body
    let host = global.document.getElementById(HOST_ID)
    if (!host) {
      host = element('div')
      host.id = HOST_ID
    }
    if (host.parentNode !== mount) mount.appendChild(host)
    syncViewportHost()
    installViewportTracking()
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
    return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color) ? color : '#a66bff'
  }

  function parseAchievementConfig(content) {
    const next = {
      iconBasePath: defaultAchievementConfig.iconBasePath,
      fallbackIcon: defaultAchievementConfig.fallbackIcon,
      achievements: {},
    }
    if (!content) return next
    const parsed = JSON.parse(content)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return next
    if (typeof parsed.iconBasePath === 'string') next.iconBasePath = parsed.iconBasePath
    if (typeof parsed.fallbackIcon === 'string') next.fallbackIcon = parsed.fallbackIcon
    if (!parsed.achievements || typeof parsed.achievements !== 'object' || Array.isArray(parsed.achievements)) return next
    Object.keys(parsed.achievements).forEach(function (id) {
      const entry = parsed.achievements[id]
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return
      next.achievements[id] = Object.assign({}, entry)
    })
    return next
  }

  function refreshAchievementConfig(force) {
    try {
      const xhr = new global.XMLHttpRequest()
      xhr.open('GET', ACHIEVEMENT_CONFIG_PATH, false)
      xhr.send(null)
      if (xhr.status === 200 || xhr.status === 0) {
        const content = String(xhr.responseText || '')
        if (force || content !== lastAchievementConfigContent) {
          achievementConfig = parseAchievementConfig(content)
          lastAchievementConfigContent = content
        }
      }
    } catch (error) {
      console.warn('[游戏辅助合集] 成就配置读取失败, 将保留当前配置.', error)
    }
    return achievementConfig
  }

  function resolveAssetPath(value, basePath) {
    const asset = typeof value === 'string' ? value.trim() : ''
    if (!asset) return ''
    if (/^(?:[a-z][a-z0-9+.-]*:|\/|\.\/|\.\.\/)/i.test(asset) || asset.indexOf('/') !== -1 || asset.indexOf('\\') !== -1) return asset
    const base = typeof basePath === 'string' ? basePath.trim() : ''
    if (!base) return asset
    return base.replace(/\/?$/, '/') + asset
  }

  function getAchievement(id) {
    const key = typeof id === 'string' ? id.trim() : ''
    if (!key) return null
    const config = refreshAchievementConfig()
    const entry = config.achievements[key]
    return entry ? Object.assign({}, entry) : null
  }

  function parseAchievementState(content) {
    if (!content) return { unlocked: {} }
    const parsed = JSON.parse(content)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { unlocked: {} }
    if (!parsed.unlocked || typeof parsed.unlocked !== 'object' || Array.isArray(parsed.unlocked)) return { unlocked: {} }
    return { unlocked: Object.assign({}, parsed.unlocked) }
  }

  function loadAchievementState() {
    const api = global.modloader
    if (!api || typeof api.readFileSync !== 'function') return virtualAchievementState
    try {
      virtualAchievementState = parseAchievementState(api.readFileSync(ACHIEVEMENT_STATE_PATH))
    } catch (error) {
      console.warn('[游戏辅助合集] 虚拟成就记录读取失败, 将使用当前内存记录.', error)
    }
    return virtualAchievementState
  }

  function saveAchievementState(state) {
    virtualAchievementState = state
    const api = global.modloader
    if (!api || typeof api.writeFileSync !== 'function') return false
    try {
      api.writeFileSync(ACHIEVEMENT_STATE_PATH, JSON.stringify(state, null, 2))
      return true
    } catch (error) {
      console.warn('[游戏辅助合集] 虚拟成就记录保存失败.', error)
      return false
    }
  }

  function clearAchievementState() {
    return saveAchievementState({ unlocked: {} })
  }

  function resetClearRequest() {
    const api = global.modloader
    if (!api || typeof api.readFileSync !== 'function' || typeof api.writeFileSync !== 'function') return
    try {
      const settings = JSON.parse(api.readFileSync(SUITE_CONFIG_PATH) || '{}')
      if (!settings || typeof settings !== 'object' || Array.isArray(settings) || settings.clearVirtualAchievementRecords !== true) return
      settings.clearVirtualAchievementRecords = false
      api.writeFileSync(SUITE_CONFIG_PATH, JSON.stringify(settings, null, 2))
    } catch (error) {
      console.warn('[游戏辅助合集] 清除虚拟成就开关复位失败.', error)
    }
  }

  function handleClearRequest() {
    if (!suite.isEnabled('clearVirtualAchievementRecords')) {
      clearRequestHandled = false
      return
    }
    if (clearRequestHandled) return
    clearRequestHandled = true
    clearAchievementState()
    resetClearRequest()
  }

  function unlock(id, overrides) {
    handleClearRequest()
    const key = typeof id === 'string' ? id.trim() : ''
    const achievement = getAchievement(key)
    if (!achievement) {
      console.warn('[游戏辅助合集] 未找到成就配置: ' + key)
      return null
    }
    const extra = overrides && typeof overrides === 'object' && !Array.isArray(overrides) ? overrides : {}
    const shouldPersist = suite.isEnabled('virtualAchievementPersistence') && extra.force !== true
    const state = shouldPersist ? loadAchievementState() : null
    if (state && state.unlocked[key] === true) return null
    const toast = show(Object.assign({}, achievement, extra, { id: key }))
    if (state && toast) {
      state.unlocked[key] = true
      saveAchievementState(state)
    }
    return toast
  }

  function asDuration(value) {
    const duration = Number(value)
    if (!Number.isFinite(duration) || duration <= 0) return DEFAULT_DURATION
    return Math.min(Math.max(duration, 1000), 60000)
  }

  function dismiss(toast) {
    if (!toast || toast.dataset.closing) return
    toast.dataset.closing = 'true'
    toast.classList.add('is-leaving')
    global.setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast)
    }, 180)
  }

  function trimVisibleToasts(container) {
    const activeToasts = Array.prototype.slice.call(container.children).filter(function (toast) {
      return !toast.dataset.closing
    })
    const overflow = activeToasts.length - MAX_VISIBLE + 1
    if (overflow > 0) activeToasts.slice(0, overflow).forEach(dismiss)
  }

  function appendIcon(badge, data) {
    const config = refreshAchievementConfig()
    const iconPath = resolveAssetPath(data.icon, data.iconBasePath || config.iconBasePath)
    if (!iconPath) return
    const fallbackPath = resolveAssetPath(data.fallbackIcon || config.fallbackIcon, data.iconBasePath || config.iconBasePath)
    const fallbackSymbol = data.hidden === true ? '✦' : '★'
    const image = element('img', 'assistant-suite-dev-icon')
    badge.classList.add('has-icon')
    badge.textContent = ''
    image.src = iconPath
    image.alt = asText(data.title, '成就图标')
    image.addEventListener('error', function () {
      if (fallbackPath && image.dataset.fallbackApplied !== 'true' && image.src !== fallbackPath) {
        image.dataset.fallbackApplied = 'true'
        image.src = fallbackPath
        return
      }
      badge.classList.remove('has-icon')
      badge.textContent = fallbackSymbol
    })
    badge.appendChild(image)
  }

  function show(options) {
    const data = typeof options === 'string' ? { text: options } : (options || {})
    const isHidden = data.hidden === true
    const duration = asDuration(data.duration)
    const toast = element('div', 'assistant-suite-dev-toast')
    const surface = element('div', 'assistant-suite-dev-surface')
    const badge = element('div', 'assistant-suite-dev-badge', isHidden ? '✦' : '★')
    const body = element('div', 'assistant-suite-dev-copy')
    const close = element('button', 'assistant-suite-dev-close', 'x')
    const timer = element('div', 'assistant-suite-dev-timer')
    const progress = element('div', 'assistant-suite-dev-progress')
    const container = getContainer()

    toast.setAttribute('role', 'status')
    if (isHidden) toast.classList.add('is-hidden')
    toast.style.setProperty('--assistant-suite-dev-accent', asColor(data.color))
    progress.style.transitionDuration = duration + 'ms'
    close.type = 'button'
    close.title = '关闭'
    close.setAttribute('aria-label', '关闭开发通知')
    close.addEventListener('click', function () { dismiss(toast) })

    body.appendChild(element('div', 'assistant-suite-dev-status', asText(data.status, isHidden ? '隐藏成就已解锁' : '成就已解锁')))
    body.appendChild(element('div', 'assistant-suite-dev-title', asText(data.title, '开发通知')))
    body.appendChild(element('div', 'assistant-suite-dev-text', asText(data.text || data.message, '这是一条右下角开发测试通知。')))
    appendIcon(badge, data)
    surface.appendChild(badge)
    surface.appendChild(body)
    surface.appendChild(close)
    timer.appendChild(progress)
    surface.appendChild(timer)
    toast.appendChild(surface)
    trimVisibleToasts(container)
    container.appendChild(toast)

    const startCountdown = function () { progress.style.transform = 'scaleX(0)' }
    if (typeof global.requestAnimationFrame === 'function') global.requestAnimationFrame(startCountdown)
    else global.setTimeout(startCountdown, 0)
    global.setTimeout(function () { dismiss(toast) }, duration)
    return toast
  }

  function clear() {
    const host = global.document.getElementById(HOST_ID)
    const root = host && host.shadowRoot
    const container = root && root.querySelector('#' + CONTAINER_ID)
    if (!container) return
    Array.prototype.slice.call(container.children).forEach(dismiss)
  }

  function getSteamAchievementTag() {
    const kag = global.TYRANO && global.TYRANO.kag
    const tags = kag && kag.ftag && kag.ftag.master_tag
    return tags && tags[STEAM_ACHIEVEMENT_TAG]
  }

  function advanceScenario(context) {
    const kag = (context && context.kag) || (global.TYRANO && global.TYRANO.kag)
    if (kag && kag.ftag && typeof kag.ftag.nextOrder === 'function') kag.ftag.nextOrder()
  }

  function scheduleSteamHook() {
    if (steamHookRetryTimer !== null) return
    steamHookRetryTimer = global.setTimeout(function () {
      steamHookRetryTimer = null
      installSteamAchievementHook()
    }, STEAM_HOOK_RETRY_INTERVAL)
  }

  function installSteamAchievementHook() {
    const tag = getSteamAchievementTag()
    if (!tag || typeof tag.start !== 'function') {
      scheduleSteamHook()
      return false
    }
    if (tag.start === patchedSteamAchievementStart || tag.start.__assistantSuiteSteamAchievementWrapped) {
      patchedSteamAchievementStart = tag.start
      return true
    }

    const originalStart = tag.start
    patchedSteamAchievementStart = function (pm) {
      const achievementId = pm && pm.name !== undefined && pm.name !== null ? String(pm.name) : ''
      if (!achievementId) return originalStart.apply(this, arguments)

      if (suite.isEnabled('virtualAchievements')) {
        try {
          unlock(achievementId)
        } catch (error) {
          console.error('[游戏辅助合集] 虚拟成就触发失败: ' + achievementId, error)
        }
        advanceScenario(this)
        return undefined
      }

      const steamApi = global.api
      if (!steamApi || typeof steamApi.activateAchievement !== 'function') {
        return originalStart.apply(this, arguments)
      }
      try {
        steamApi.activateAchievement(achievementId)
      } catch (error) {
        console.error('[游戏辅助合集] Steam 成就触发失败: ' + achievementId, error)
      }
      advanceScenario(this)
      return undefined
    }
    patchedSteamAchievementStart.__assistantSuiteSteamAchievementWrapped = true
    tag.start = patchedSteamAchievementStart
    return true
  }

  function startAchievementStatePolling() {
    if (typeof global.setInterval === 'function') {
      global.setInterval(handleClearRequest, ACHIEVEMENT_STATE_POLL_INTERVAL)
    }
  }

  const api = {
    show: show,
    unlock: unlock,
    getAchievement: getAchievement,
    reloadAchievements: function () {
      return refreshAchievementConfig(true)
    },
    clearUnlockedAchievements: clearAchievementState,
    test: function () {
      return show({
        title: '开发测试',
        text: '右下角通知已成功显示。',
        color: '#a66bff',
      })
    },
    clear: clear,
  }

  global[MODULE_KEY] = api
  global[API_KEY] = api
  startAchievementStatePolling()
  installSteamAchievementHook()
})(window)