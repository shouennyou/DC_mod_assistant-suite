'use strict';

(function initializeGameAssistantSuite(global) {
  const MODULE_KEY = '__gameAssistantSuite'
  const CONFIG_PATH = 'config/assistant-suite.json'
  const RETRY_INTERVAL = 250
  const CONFIG_POLL_INTERVAL = 750
  const defaults = Object.freeze({
    mindVoice: true,
    onePunch: false,
    magicAssistant: false,
    magicEye: false,
    evilEye: false,
    residentKupya2: true,
    kupyaShelf: true,
  })

  if (global[MODULE_KEY]) return

  function parseSettings(content) {
    const next = Object.assign({}, defaults)
    if (!content) return next
    const saved = JSON.parse(content)
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return next
    Object.keys(defaults).forEach(function (key) {
      if (typeof saved[key] === 'boolean') next[key] = saved[key]
    })
    return next
  }

  let lastConfigContent = null

  function loadSettings() {
    const api = global.api && global.api.modloader
    if (!api || typeof api.readFileSync !== 'function') return Object.assign({}, defaults)
    try {
      lastConfigContent = api.readFileSync(CONFIG_PATH)
      return parseSettings(lastConfigContent)
    } catch (error) {
      console.warn('[游戏辅助合集] 配置读取失败, 将使用默认值.', error)
    }
    return Object.assign({}, defaults)
  }

  const settings = loadSettings()
  const transformers = new Map()
  let retryTimer = null
  let patchedEval = null
  let configReading = false

  function applySettings(next) {
    Object.keys(defaults).forEach(function (key) {
      settings[key] = next[key]
    })
  }

  function refreshSettings() {
    const api = global.api && global.api.modloader
    if (configReading || !api || typeof api.readFile !== 'function') return
    configReading = true
    Promise.resolve().then(function () {
      return api.readFile(CONFIG_PATH)
    }).then(function (content) {
      if (content === lastConfigContent) return
      lastConfigContent = content
      applySettings(parseSettings(content))
    }).catch(function (error) {
      console.warn('[游戏辅助合集] 配置刷新失败, 将保留当前设置.', error)
    }).then(function () {
      configReading = false
    })
  }

  function startSettingsPolling() {
    if (typeof global.setInterval === 'function') {
      global.setInterval(refreshSettings, CONFIG_POLL_INTERVAL)
    }
  }

  function getKag() {
    return global.TYRANO && global.TYRANO.kag
  }

  function scheduleEvalHook() {
    if (retryTimer !== null) return
    retryTimer = global.setTimeout(function () {
      retryTimer = null
      installEvalHook()
    }, RETRY_INTERVAL)
  }

  function installEvalHook() {
    const kag = getKag()
    if (!kag || typeof kag.evalScript !== 'function') {
      scheduleEvalHook()
      return false
    }
    if (kag.evalScript === patchedEval) return true

    const originalEval = kag.evalScript
    patchedEval = function (code) {
      let processed = code
      if (typeof code === 'string') {
        transformers.forEach(function (transform, id) {
          try {
            const next = transform(processed)
            if (typeof next === 'string') processed = next
          } catch (error) {
            console.error('[游戏辅助合集] 模块处理失败: ' + id, error)
          }
        })
      }
      return originalEval.call(this, processed)
    }
    patchedEval.__gameAssistantSuiteWrapped = true
    kag.evalScript = patchedEval
    return true
  }

  const suite = {
    isEnabled: function (key) {
      return settings[key] === true
    },
    registerEvalTransform: function (id, transform) {
      if (typeof id !== 'string' || typeof transform !== 'function' || transformers.has(id)) return
      transformers.set(id, transform)
      installEvalHook()
    },
  }

  global[MODULE_KEY] = suite
  startSettingsPolling()
})(window)
