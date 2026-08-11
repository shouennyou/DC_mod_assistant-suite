'use strict';

(function registerMagicEye(global) {
  const suite = global.__gameAssistantSuite
  if (!suite) return

  const originalValue = 'f.judge = tf.judges[tf.result.indexOf(tf.cursor_left)]'
  const nextValue = "f.judge = 'perfect'"
  let isRegistered = false

  function getKsApi() {
    const modloader = global.modloaderApi
    if (!modloader || !modloader.ks || !modloader.ks.register) return null
    const register = modloader.ks.register
    if (typeof register.json !== 'function') return null
    return register
  }

  function transform(data) {
    if (!suite.isEnabled('magicEye') || !Array.isArray(data)) return data

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
      target: 'zyagan_player.ks',
      description: '魔眼助手',
      transform: transform,
    }])

    if (Array.isArray(result) && result.length > 0) isRegistered = true
  }

  registerTransform()
})(window)
