'use strict';

(function registerEvilEye(global) {
  const suite = global.__gameAssistantSuite
  if (!suite) return

  const originalValue = 'f.judge = tf.judges[tf.result.indexOf(tf.cursor_left)]'
  const nextValue = "f.judge = 'perfect'"
  let isRegistered = false

  function getKsApi() {
    const modloader = global.modloader
    if (!modloader || !modloader.api || !modloader.api.ks || !modloader.api.ks.register) return null
    const register = modloader.api.ks.register
    if (typeof register.json !== 'function') return null
    return register
  }

  function transform(data) {
    if (!suite.isEnabled('evilEye') || !Array.isArray(data)) return data

    return data.map(function (entry) {
      if (!entry || typeof entry !== 'object') return entry

      const nextEntry = Object.assign({}, entry)
      if (nextEntry.val === originalValue) nextEntry.val = nextValue

      if (nextEntry.pm && typeof nextEntry.pm === 'object' && nextEntry.pm.val === originalValue) {
        nextEntry.pm = Object.assign({}, nextEntry.pm, { val: nextValue })
      }

      return nextEntry
    })
  }

  function registerTransform() {
    if (isRegistered) return

    const register = getKsApi()
    if (!register) {
      global.setTimeout(registerTransform, 3000)
      return
    }

    const result = register.json([{
      target: 'zyagan.ks',
      description: '邪眼助手',
      transform: transform,
    }])

    if (Array.isArray(result) && result.length > 0) isRegistered = true
  }

  registerTransform()
})(window)
