'use strict';

(function registerKupyaShelf(global) {
  const suite = global.__gameAssistantSuite
  if (!suite) return

  const originalValue = "tf.bgPrefix = sf.characters.includes('クピャドエル') && Math.random()*100+1>=100 ? '_' : ''"
  const nextValue = "tf.bgPrefix = sf.characters.includes('クピャドエル') ? '_' : ''"
  let isRegistered = false

  function getKsApi() {
    const modloader = global.modloader
    if (!modloader || !modloader.api || !modloader.api.ks || !modloader.api.ks.register) return null
    const register = modloader.api.ks.register
    if (typeof register.json !== 'function') return null
    return register
  }

  function transform(data) {
    if (!suite.isEnabled('kupyaShelf') || !Array.isArray(data)) return data

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
      target: 'collection.ks',
      description: '库皮亚常驻书架',
      transform: transform,
    }])

    if (Array.isArray(result) && result.length > 0) isRegistered = true
  }

  registerTransform()
})(window)
