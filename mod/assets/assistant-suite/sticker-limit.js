'use strict';

(function registerStickerLimit(global) {
  const suite = global.__gameAssistantSuite
  if (!suite) return

  const DEFAULT_LIMIT = 10
  const stickerLimitStatement = /tf\.stickerLimit\s*=\s*\d+/
  const defaultColorLogic = /const color =[ \t]*\r?\n[ \t]*tf\.stickers\.length >= 10 \? '#c44459'\r?\n[ \t]*: tf\.stickers\.length >= 9 \? '#c19e43'\r?\n[ \t]*: '#6db7ab'/
  let isRegistered = false

  function getKsApi() {
    const modloader = global.modloaderApi
    if (!modloader || !modloader.ks || !modloader.ks.register) return null
    const register = modloader.ks.register
    if (typeof register.raw !== 'function') return null
    return register
  }

  function getStickerLimit() {
    const value = suite.getNumber('stickerLimit')
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.floor(value))
      : DEFAULT_LIMIT
  }

  function createColorLogic(lineEnding) {
    return [
      'const color =',
      "  tf.stickers.length >= tf.stickerLimit ? '#c44459'",
      "    : tf.stickers.length >= tf.stickerLimit * 0.75 ? '#c19e43'",
      "    : '#6db7ab'",
    ].join(lineEnding)
  }

  function transform(text) {
    const source = String(text)
    const replacement = 'tf.stickerLimit = ' + getStickerLimit()
    const lineEnding = source.indexOf('\r\n') >= 0 ? '\r\n' : '\n'
    return source
      .replace(stickerLimitStatement, replacement)
      .replace(defaultColorLogic, createColorLogic(lineEnding))
  }

  function registerTransform() {
    if (isRegistered) return

    const register = getKsApi()
    if (!register) {
      global.setTimeout(registerTransform, 3000)
      return
    }

    const result = register.raw([{
      target: 'deco.ks',
      description: '照片装饰贴纸上限',
      transform: transform,
    }])

    if (Array.isArray(result) && result.length > 0) isRegistered = true
  }

  registerTransform()
})(window)
