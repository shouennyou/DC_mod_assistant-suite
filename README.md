# 辅助合集

将心声通知、战斗辅助和库皮亚相关功能集中管理的 mod.

## 依赖

- `modloader-api`

## 功能

| 配置项 | 说明 | 默认 |
| --- | --- | --- |
| 心声通知 | 触发心声标签时显示右上角通知. | 开启 |
| 一拳超人 | 首次触发后将 Neo 计数归零. | 关闭 |
| 魔力助手 | 九州魔力判定固定为 Perfect. | 关闭 |
| 魔眼助手 | 魔眼判定固定为 Perfect. | 关闭 |
| 邪眼助手 | 邪眼判定固定为 Perfect. | 关闭 |
| 常驻多艾露二世 | 取消多艾露二世剧情的愚人节日期限制. | 开启 |
| 库皮亚常驻书架 | 解锁库皮亚后持续显示在书架场景中. | 开启 |
| 存档读取缓存 | 打开存档或读档菜单期间复用存档数据，避免翻页时反复读取本地存档；关闭菜单或读档后自动释放。 | 开启 |
| 使用虚拟成就 | 拦截游戏的 Steam 成就标签，改为显示模组成就通知。 | 关闭 |
| 虚拟成就持久化 | 每项虚拟成就只显示一次，记录保存在配置文件。 | 开启 |
| 清除虚拟成就记录 | 保存开启后清空记录，并自动关闭该开关。 | 关闭 |

## 使用

在 Mod Manager 中打开 `辅助合集` 的配置, 按需启用或关闭各功能.

配置保存后约 1 秒会刷新. 心声通知会立即按新配置显示. 剧本类功能会在下次读取对应剧本时应用, 可重新进入相关场景或重启游戏.

配置数据保存在 `config/assistant-suite.json`.

“使用虚拟成就”开启后，游戏的 `[steam_achievement_activate name="成就ID"]` 标签不会调用 Steam，而会按内置成就表显示通知；关闭时标签会调用 `window.api.activateAchievement(成就ID)`，保持原版 Steam 成就行为。

虚拟成就记录保存在 `config/assistant-suite-achievement-state.json` 的 `unlocked` 对象中。开启“虚拟成就持久化”时，已记录的 ID 不会再次显示；关闭该项时，每次标签触发都会显示通知且不读取或写入记录。若需重新测试全部成就，可打开“清除虚拟成就记录”并保存，模组清空记录后会自动关闭该开关。

## 开发测试：右下角通知

启用模组后，可在游戏开发者控制台手动调用以下 API；此通知目前不接入游戏事件或配置项。

```js
window.assistantSuiteDevNotification.test()

window.assistantSuiteDevNotification.unlock('OMAKE')

window.assistantSuiteDevNotification.unlock('MP_6666', {
  hidden: true,
})

window.assistantSuiteDevNotification.show({
  status: '成就已解锁',
  title: '测试标题',
  text: '这是一条右下角通知。',
  color: '#a66bff',
  duration: 6000,
})

window.assistantSuiteDevNotification.show({
  hidden: true,
  title: '命运的缝隙',
  text: '解锁一项隐藏成就。',
})

window.assistantSuiteDevNotification.clear()
```

`hidden: true` 表示隐藏成就已经解锁，会显示特殊金色光晕样式，不会隐藏标题或说明。

也可在开发者控制台执行 `window.assistantSuiteDevNotification.clearUnlockedAchievements()` 清空持久化记录。

成就定义内置在 `assets/assistant-suite/achievements.json`。`achievements` 的键名就是 `unlock()` 使用的成就 ID；每一项可设置 `title`、`text`、`icon`、`hidden`、`status`、`color` 和 `duration`。

`icon` 必须包含完整文件名和扩展名，例如 `omake.png`、`medal.webp` 或 `badge.jpg`；脚本不会追加固定扩展名。无路径的文件名会拼接 JSON 顶层的 `iconBasePath`，加载失败时回退到 `fallbackIcon`。也可在 `unlock(id, overrides)` 的第二个参数中临时覆盖任意字段。
