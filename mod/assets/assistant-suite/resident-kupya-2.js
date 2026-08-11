'use strict';

(function registerResidentKupya2(global) {
  const suite = global.__gameAssistantSuite
  if (!suite) return

  const originalValue = 'tf.aprilFool = today.getMonth() == 3 && today.getDate() == 1 && f.currentLoop == 1'
  const nextValue = 'tf.aprilFool = f.currentLoop == 1;'
  let isRegistered = false

  function getKsApi() {
    const modloader = global.modloaderApi
    if (!modloader || !modloader.ks || !modloader.ks.register) return null
    const register = modloader.ks.register
    if (typeof register.json !== 'function') return null
    return register
  }

  function replaceTargetEntry(data) {
    if (!suite.isEnabled('residentKupya2') || !Array.isArray(data)) return data

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
      target: 'kupya_2.ks',
      description: '常驻多艾露二世',
      transform: replaceTargetEntry,
    }])

    if (Array.isArray(result) && result.length > 0) isRegistered = true
  }

  registerTransform()
})(window)
