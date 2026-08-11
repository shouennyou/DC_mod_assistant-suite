'use strict';

(function registerMagicAssistant(global) {
  const suite = global.__gameAssistantSuite
  if (!suite) return

  const replacements = {
    "if (f.point == 0) f.judge = '0'": "f.judge = 'perfect'",
    "else if (tf.osePhase % 4 == 2) f.judge = 'perfect'": '',
    "else if (tf.osePhase % 4 == 0) f.judge = 'bad'": '',
    "else f.judge = 'good'": '',
  }
  let isRegistered = false

  function getKsApi() {
    const modloader = global.modloaderApi
    if (!modloader || !modloader.ks || !modloader.ks.register) return null
    const register = modloader.ks.register
    if (typeof register.json !== 'function') return null
    return register
  }

  function getReplacement(value) {
    if (!Object.prototype.hasOwnProperty.call(replacements, value)) return null
    return replacements[value]
  }

  function transform(data) {
    if (!suite.isEnabled('magicAssistant') || !Array.isArray(data)) return data

    return data.map(function (entry) {
      if (!entry || typeof entry !== 'object') return entry

      const nextEntry = Object.assign({}, entry)
      const nextValue = getReplacement(nextEntry.val)
      if (nextValue !== null) nextEntry.val = nextValue

      if (nextEntry.pm && typeof nextEntry.pm === 'object') {
        const nextPmValue = getReplacement(nextEntry.pm.val)
        if (nextPmValue !== null) nextEntry.pm = Object.assign({}, nextEntry.pm, { val: nextPmValue })
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

    const result = register.json([
      {
        target: 'kyushu.ks',
        description: '魔力助手',
        transform: transform,
      },
      {
        target: 'kyushu_Devil.ks',
        description: '魔力助手',
        transform: transform,
      },
    ])

    if (Array.isArray(result) && result.length > 0) isRegistered = true
  }

  registerTransform()
})(window)
