'use strict';

// 在存档/读档菜单打开期间复用同一份存档对象，避免每次翻页重复读取并解析本地存储。
(function initializeGameAssistantSaveDataCache(global) {
  const suite = global.__gameAssistantSuite
  if (!suite || typeof suite.isEnabled !== 'function') return

  const MODULE_KEY = '__gameAssistantSaveDataCache'
  const MODULE_VERSION = '1'
  const RETRY_INTERVAL = 100
  const MAX_RETRIES = 300

  if (global[MODULE_KEY] === MODULE_VERSION) return
  global[MODULE_KEY] = MODULE_VERSION

  function isEnabled() {
    return suite.isEnabled('saveDataCache')
  }

  function clearCache(menu) {
    if (menu) menu.__assistantSuiteSaveDataCache = null
  }

  function install() {
    const kag = global.TYRANO && global.TYRANO.kag
    const menu = kag && kag.menu
    if (!menu || typeof menu.getSaveData !== 'function') return false
    if (menu.__assistantSuiteSaveDataCacheVersion === MODULE_VERSION) return true

    const original = {
      getSaveData: menu.getSaveData,
      displaySaveList: menu.displaySaveList,
      displaySavePage: menu.displaySavePage,
      displayLoadPage: menu.displayLoadPage,
      setMenu: menu.setMenu,
      loadGame: menu.loadGame,
      loadAutoSave: menu.loadAutoSave,
    }

    menu.getSaveData = function () {
      if (!isEnabled()) {
        clearCache(this)
        return original.getSaveData.apply(this, arguments)
      }
      return this.__assistantSuiteSaveDataCache || original.getSaveData.apply(this, arguments)
    }

    // 首次打开菜单时读取一次；其后的 displaySaveList 调用（包括翻页）复用缓存。
    ;['displaySavePage', 'displayLoadPage'].forEach(function (name) {
      if (typeof original[name] !== 'function') return
      menu[name] = function () {
        if (isEnabled()) {
          this.__assistantSuiteSaveDataCache = original.getSaveData.call(this)
        } else {
          clearCache(this)
        }
        return original[name].apply(this, arguments)
      }
    })

    // 兼容其他模组或游戏代码直接调用 displaySaveList 的情形。
    if (typeof original.displaySaveList === 'function') {
      menu.displaySaveList = function () {
        if (isEnabled() && !this.__assistantSuiteSaveDataCache) {
          this.__assistantSuiteSaveDataCache = original.getSaveData.call(this)
        }
        return original.displaySaveList.apply(this, arguments)
      }
    }

    // 菜单关闭后释放引用；下次打开时重新读取，保证显示最新存档。
    if (typeof original.setMenu === 'function') {
      menu.setMenu = function (jObj, cb) {
        const result = original.setMenu.apply(this, arguments)
        if (jObj && typeof jObj.find === 'function') {
          jObj.find('.menu_close')
            .off('click.assistantSuiteSaveDataCache')
            .one('click.assistantSuiteSaveDataCache', () => clearCache(this))
        }
        return result
      }
    }

    // 读档会深拷贝需要的数据，随后即可释放缓存。
    ;['loadGame', 'loadAutoSave'].forEach(function (name) {
      if (typeof original[name] !== 'function') return
      menu[name] = function () {
        try {
          return original[name].apply(this, arguments)
        } finally {
          clearCache(this)
        }
      }
    })

    menu.__assistantSuiteSaveDataCacheVersion = MODULE_VERSION
    menu.__assistantSuiteSaveDataCacheOriginal = original
    console.info('[游戏辅助合集] 存档读取缓存 Hook 已就绪')
    return true
  }

  if (install()) return

  let attempts = 0
  const timer = global.setInterval(function () {
    attempts += 1
    if (install() || attempts >= MAX_RETRIES) {
      global.clearInterval(timer)
      if (attempts >= MAX_RETRIES) {
        console.warn('[游戏辅助合集] 未找到存档菜单，存档读取缓存未启用')
      }
    }
  }, RETRY_INTERVAL)
})(window)
