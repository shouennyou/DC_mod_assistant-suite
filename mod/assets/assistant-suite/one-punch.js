'use strict';

(function registerOnePunch(global) {
  const suite = global.__gameAssistantSuite
  if (!suite) return

  const originalValue = 'f.neoCount -= sf.lightMode && f.point == 3 ? 2 : 1'
  const nextValue = 'f.neoCount = 0;'
  let isRegistered = false

  function getKsApi() {
    const modloader = global.modloaderApi
    if (!modloader || !modloader.ks || !modloader.ks.register) return null
    const register = modloader.ks.register
    if (typeof register.json !== 'function') return null
    return register
  }

  function transform(data) {
    if (!suite.isEnabled('onePunch') || !Array.isArray(data)) return data

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
      target: 'Chapter4_2kuitomeru.ks',
      description: '一拳超人',
      transform: transform,
    }])

    if (Array.isArray(result) && result.length > 0) isRegistered = true
  }

  registerTransform()
})(window)
