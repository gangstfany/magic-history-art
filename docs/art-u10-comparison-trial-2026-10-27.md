# Unit 10 比较布局本地试用

用户批准将已确认的正式布局原型应用到一个Unit。本次仅Unit10；250条作品数据、原文及比较关系未修改。正式模块独立实现，不依赖原型。

- 比较卡片优先显示对应笔记；中文先读，英文可展开。独立“开始对比”按钮避免阅读误触。
- 面板覆盖课程筛选、地图及详情区域，父级首页导航和学科入口保留。底层DOM及state保持挂载。
- 桌面左右图片、手机上下排列；每件作品独立切换视角，沿用大图和出处组件；支持比较重点、形式、功能、语境及键盘切换。
- 返回恢复地图、筛选、比较页签、详情滚动和触发按钮焦点。Escape先关闭大图，再关闭比较面板。
- 其他Unit保留既有比较跳转。

验证：494项Node针对性测试、10项Python测试通过；250作品源数据校验通过；构建215个公开文件，包含新模块和样式。

实测1440×1100桌面、390×900手机；完整首页中的粉红豹与葵花籽、《门》与越战纪念碑均可比较；视角图片实际加载，分类、署名、大图与键盘返回可用。搜索Pink、地图1.5倍缩放及详情scrollTop=800.5在进入/返回前后完全一致。手机无横向溢出。最终同源完整首页流程无控制台错误。

完整首页预览：http://127.0.0.1:8041/magic-history-site/
直接课程预览：http://127.0.0.1:8033/art-history-map.html?embed=1

完整首页预览服务只读取各仓库构建结果，首页仓库git状态仍为空。脚本与截图在工作区output/art-u10-comparison-2026-10-27。8040跨源预览存在工具点击限制，最终使用8041同源路由验证。

未提交或push；其他Unit未扩展比较面板。既有完整U10区域标签在某些窄屏切换下的地图碰撞问题是独立待处理项，本轮不声称修复。

## Selected visual direction

On 2026-10-27 the user selected option 02, the comparison lens. Unit 10 now uses two image cards on the left and a sticky analysis panel on the right; mobile stacks these areas. The two works keep distinct accent colors; reading tabs are arranged as a 2x2 control group. Preview pages retain all three skins through their data-look attribute.

Built 215 public files. Verified desktop 1440x1000 and mobile 390x900, including reading-tab changes, collapse, return and no horizontal overflow. Screenshots: Unit10_ comparison lens desktop/mobile in output/art-u10-comparison-2026-10-27. No commit or push.
