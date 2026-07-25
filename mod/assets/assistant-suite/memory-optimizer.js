'use strict';

(function initializeGameAssistantMemoryOptimizer(global) {
  const suite = global.__gameAssistantSuite
  if (!suite || typeof suite.isEnabled !== 'function') return

  const MODULE_KEY = '__gameAssistantMemoryOptimizer'
  const MODULE_VERSION = '1'
  const RETRY_INTERVAL = 100
  const MAX_RETRIES = 300
  const CACHE_TTL = 30000
  const CLEANUP_INTERVAL = 5000
  const DECODE_TIMEOUT = 30000
  const WORKER_PATH = './tyrano/libs/apng.js'

  if (global[MODULE_KEY] === MODULE_VERSION) return
  global[MODULE_KEY] = MODULE_VERSION

  const paths = Object.create(null)
  const decoding = Object.create(null)
  const lastUsed = Object.create(null)
  const activeUntil = Object.create(null)
  let decodeQueue = Promise.resolve()

  function warn(message, error) {
    if (!global.console || typeof global.console.warn !== 'function') return
    global.console.warn('[内存优化] ' + message, error || '')
  }

  function info(message) {
    if (!global.console || typeof global.console.log !== 'function') return
    global.console.log('[内存优化] ' + message)
  }

  function isEnabled() {
    return suite.isEnabled('memoryOptimizer')
  }

  function toError(message, error) {
    if (error instanceof Error) return error
    if (error && error.message) return new Error(message + ': ' + error.message)
    if (error !== undefined && error !== null) return new Error(message + ': ' + String(error))
    return new Error(message)
  }

  function advance(tag, name) {
    try {
      tag.kag.ftag.nextOrder()
    } catch (error) {
      warn('推进剧本失败: ' + name, error)
    }
  }

  function rememberPath(name, path) {
    if (!name || !path) return
    paths[String(name)] = String(path)
  }

  function rememberQueuedPaths(apng) {
    if (!apng || !Array.isArray(apng.loads)) return
    apng.loads.forEach(function (entry) {
      if (!entry) return
      rememberPath(entry.name, entry.path)
    })
  }

  function getAnimationDuration(apng, name) {
    const cached = apng.apngs[name]
    if (!cached || !Array.isArray(cached.delays)) return 0

    let duration = 0
    for (let index = 0; index < cached.delays.length - 1; index += 1) {
      const delay = Number(cached.delays[index])
      if (Number.isFinite(delay) && delay > 0) duration += delay
    }
    return duration
  }

  function markUsed(apng, name) {
    if (!name) return
    const now = Date.now()
    const endsAt = now + getAnimationDuration(apng, name)
    activeUntil[name] = Math.max(activeUntil[name] || 0, endsAt)
    lastUsed[name] = Math.max(lastUsed[name] || 0, endsAt || now)
  }

  function loadFrameImage(frame, registerAbort) {
    return new Promise(function (resolve, reject) {
      if (!frame || !frame.blob) {
        reject(new Error('APNG 帧数据无效'))
        return
      }
      if (typeof global.Image !== 'function') {
        reject(new Error('Image API 不可用'))
        return
      }

      const image = new global.Image()
      const urlApi = global.URL || global.webkitURL
      let reader = null
      let objectUrl = ''
      let settled = false

      function cleanup() {
        image.onload = null
        image.onerror = null
        if (reader) {
          reader.onload = null
          reader.onerror = null
          try {
            reader.abort()
          } catch (error) {}
          reader = null
        }
        if (objectUrl && urlApi && typeof urlApi.revokeObjectURL === 'function') {
          urlApi.revokeObjectURL(objectUrl)
          objectUrl = ''
        }
      }

      function finish(error) {
        if (settled) return
        settled = true
        cleanup()
        if (error) reject(error)
        else resolve(image)
      }

      registerAbort(function () {
        finish(new Error('APNG 解码已取消'))
      })

      image.onload = function () {
        finish()
      }
      image.onerror = function (error) {
        finish(toError('APNG 帧图像加载失败', error))
      }

      if (urlApi && typeof urlApi.createObjectURL === 'function') {
        try {
          objectUrl = urlApi.createObjectURL(frame.blob)
          image.src = objectUrl
          return
        } catch (error) {
          objectUrl = ''
        }
      }

      if (typeof global.FileReader !== 'function') {
        finish(new Error('Object URL 和 FileReader 均不可用'))
        return
      }

      reader = new global.FileReader()
      reader.onload = function () {
        image.src = reader.result
      }
      reader.onerror = function () {
        finish(toError('APNG 帧读取失败', reader.error))
      }
      try {
        reader.readAsDataURL(frame.blob)
      } catch (error) {
        finish(toError('APNG 帧读取失败', error))
      }
    })
  }

  // 每个任务拥有独立的 Worker, 超时或失败时会立即停止所有资源.
  function decodeApng(path, name) {
    return new Promise(function (resolve, reject) {
      const readAsArrayBuffer = global.readAsArrayBuffer
      const WorkerConstructor = global.Worker
      const abortFrameLoads = []
      let worker = null
      let timer = null
      let settled = false

      function cleanup() {
        if (timer !== null) {
          global.clearTimeout(timer)
          timer = null
        }
        abortFrameLoads.splice(0).forEach(function (abort) {
          try {
            abort()
          } catch (error) {}
        })
        if (!worker) return
        worker.onmessage = null
        worker.onerror = null
        worker.onmessageerror = null
        try {
          worker.terminate()
        } catch (error) {}
        worker = null
      }

      function finish(error, value) {
        if (settled) return
        settled = true
        cleanup()
        if (error) reject(error)
        else resolve(value)
      }

      function fail(message, error) {
        finish(toError(message, error))
      }

      if (typeof readAsArrayBuffer !== 'function') {
        fail('readAsArrayBuffer 不可用')
        return
      }
      if (typeof WorkerConstructor !== 'function') {
        fail('Worker API 不可用')
        return
      }

      timer = global.setTimeout(function () {
        fail('解码超时: ' + name)
      }, DECODE_TIMEOUT)

      Promise.resolve().then(function () {
        return readAsArrayBuffer(path)
      }).then(function (buffer) {
        if (settled) return
        try {
          worker = new WorkerConstructor(WORKER_PATH)
          worker.onmessage = function (event) {
            if (settled) return
            const payload = event && event.data
            if (!payload || !Array.isArray(payload.frames) || !Array.isArray(payload.delays)) {
              fail('APNG 解码结果无效')
              return
            }
            if (payload.frames.length === 0 || payload.frames.length !== payload.delays.length) {
              fail('APNG 帧数量无效')
              return
            }

            Promise.all(payload.frames.map(function (frame) {
              return loadFrameImage(frame, function (abort) {
                abortFrameLoads.push(abort)
              })
            })).then(function (images) {
              finish(null, { images: images, delays: payload.delays })
            }, function (error) {
              fail('APNG 帧图像解码失败', error)
            })
          }
          worker.onerror = function (event) {
            if (event && typeof event.preventDefault === 'function') event.preventDefault()
            fail('APNG Worker 执行失败', event)
          }
          worker.onmessageerror = function (event) {
            fail('APNG Worker 消息失败', event)
          }
          if (typeof global.ArrayBuffer === 'function' && buffer instanceof global.ArrayBuffer) {
            worker.postMessage(buffer, [buffer])
          } else {
            worker.postMessage(buffer)
          }
        } catch (error) {
          fail('创建 APNG Worker 失败', error)
        }
      }, function (error) {
        fail('读取 APNG 文件失败', error)
      })
    })
  }

  function createDecoder(apng) {
    return function decode(name) {
      if (apng.apngs[name]) return Promise.resolve(apng.apngs[name])
      if (decoding[name]) return decoding[name]

      const path = paths[name]
      if (!path) return Promise.reject(new Error('未记录 APNG 路径: ' + name))

      // 串行解码可避免多个大型 APNG 同时占用大量内存.
      const job = decodeQueue.then(function () {
        if (apng.apngs[name]) return apng.apngs[name]
        return decodeApng(path, name).then(function (decoded) {
          apng.apngs[name] = decoded
          return decoded
        })
      })

      decodeQueue = job.catch(function () { return null })
      decoding[name] = job.then(function (value) {
        delete decoding[name]
        return value
      }, function (error) {
        delete decoding[name]
        throw error
      })
      return decoding[name]
    }
  }

  function safelyPlay(originalPlay, tag, pm, name) {
    try {
      markUsed(tag.kag.dc.apng, name)
      return originalPlay.call(tag, pm)
    } catch (error) {
      warn('播放 APNG 失败: ' + name, error)
      advance(tag, name)
      return undefined
    }
  }

  function install() {
    const kag = global.TYRANO && global.TYRANO.kag
    if (!kag || !kag.dc || !kag.dc.apng || !kag.ftag || !kag.ftag.master_tag) return false

    const apng = kag.dc.apng
    const tags = kag.ftag.master_tag
    if (apng.__startupOptimizer === MODULE_VERSION) return true
    if (!tags.load_apng || !tags.play_apng || !tags.free_apng) return false
    if (typeof apng.addToLoadQueue !== 'function') return false
    if (typeof tags.load_apng.start !== 'function') return false
    if (typeof tags.play_apng.start !== 'function' || typeof tags.free_apng.start !== 'function') return false

    rememberQueuedPaths(apng)

    const originalAddToLoadQueue = apng.addToLoadQueue
    const originalLoadTag = tags.load_apng.start
    const originalPlayTag = tags.play_apng.start
    const originalFreeTag = tags.free_apng.start
    const originalRegisterTag = tags.register_apng && tags.register_apng.start
    const decode = createDecoder(apng)

    apng.addToLoadQueue = function (path, name) {
      rememberPath(name, path)
      return originalAddToLoadQueue.apply(this, arguments)
    }

    if (typeof originalRegisterTag === 'function') {
      tags.register_apng.start = function (pm) {
        if (pm && pm.name && pm.storage) {
          rememberPath(pm.name, './data/' + (pm.folder || 'fgimage') + '/' + pm.storage)
        }
        return originalRegisterTag.apply(this, arguments)
      }
    }

    tags.load_apng.start = function () {
      rememberQueuedPaths(apng)
      if (!isEnabled()) return originalLoadTag.apply(this, arguments)
      apng.loads = []
      this.kag.ftag.nextOrder()
    }

    tags.play_apng.start = function (pm) {
      const tag = this
      const name = pm && pm.name ? String(pm.name) : ''
      rememberQueuedPaths(apng)

      if (!isEnabled()) return originalPlayTag.apply(this, arguments)
      if (!name || apng.apngs[name]) return safelyPlay(originalPlayTag, tag, pm, name)
      if (!paths[name]) {
        warn('未找到 APNG 路径, 已跳过动画: ' + name)
        advance(tag, name)
        return undefined
      }

      decode(name).then(function () {
        safelyPlay(originalPlayTag, tag, pm, name)
      }, function (error) {
        warn('按需解码失败: ' + name, error)
        advance(tag, name)
      })
      return undefined
    }

    tags.free_apng.start = function (pm) {
      const result = originalFreeTag.apply(this, arguments)
      const name = pm && pm.name ? String(pm.name) : ''
      if (isEnabled() && name) lastUsed[name] = Math.max(lastUsed[name] || 0, Date.now())
      return result
    }

    global.setInterval(function () {
      if (!isEnabled()) return
      const now = Date.now()
      Object.keys(apng.apngs).forEach(function (name) {
        if (!paths[name] || apng.played[name] || decoding[name]) return
        if ((activeUntil[name] || 0) > now) return
        if (now - (lastUsed[name] || 0) < CACHE_TTL) return
        delete apng.apngs[name]
        delete apng.frames[name]
        delete lastUsed[name]
        delete activeUntil[name]
      })
    }, CLEANUP_INTERVAL)

    apng.__startupOptimizer = MODULE_VERSION
    apng.decodeOnDemand = decode
    apng.apngPaths = paths
    info('内存优化 Hook 已就绪, 功能默认关闭')
    return true
  }

  if (install()) return

  let attempts = 0
  const retryTimer = global.setInterval(function () {
    attempts += 1
    if (install()) {
      global.clearInterval(retryTimer)
      return
    }
    if (attempts >= MAX_RETRIES) {
      global.clearInterval(retryTimer)
      warn('未找到 APNG 插件, 按需解码未启用')
    }
  }, RETRY_INTERVAL)
})(window)
