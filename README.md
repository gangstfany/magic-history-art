# Magic History · AP 艺术史

艺术史独立仓库，完整保留 Units 1–10 的250件作品、世界地图、筛选搜索、作品学习、比较及图片查看界面。以后修改艺术史，只提交本仓库；不会触发首页、账号或世界史仓库的发布。

## 开发、构建与发布

需要 Node 22+、Python 3，静态发布无需 npm 安装。

```sh
node --test --test-skip-pattern='U5 restricted authority matches runtime|assembled U3 verifier rejects' tests/*.test.mjs
node scripts/validate-art-history-data.mjs art-history-map.html
python3 scripts/build.py
python3 -m http.server 8033 --directory _site
```

访问 `http://127.0.0.1:8033/` 或直接打开 `/art-history-map.html`。修改课程页、相关 `data/ap-art-history-*.json` 与 `assets/art-history/` 后，运行验证再提交到本库 main。

`.github/workflows/pages.yml` 仅在本库 main 提交或手动执行时构建和发布。GitHub Settings → Pages → Source 选择 GitHub Actions。预期公开入口为 `https://gangstfany.github.io/magic-history-art/`。发布目录 `_site` 从明确白名单创建，每次清除旧产物，不复制开发脚本、测试、私有媒体或其他学科。

测试说明：485项静态/数据/样式契约/隐私扫描/模块通信/发布契约测试通过，严格校验250作品及全部十个Unit。原仓库的4项浏览器执行测试依赖额外Playwright运行时，上述命令和CI明确排除它们；没有把它们称为通过。其余原测试保留。旧脚本 `verify-art-history-release.mjs` 和全站浏览器矩阵仍用于原单库结构，不是本独立仓库发布入口。当前页面的真实浏览器集成由完整首页联合验证。

旧测试中3项世界史内容冻结检查、1项直接读取首页世界史DOM检查已从艺术史边界移出；艺术史不再带世界史页面或旧首页。地区颜色基线保留为 `tests/fixtures/legacy-region-palette.json`，保留颜色契约而不需要另一门课程源码。

## 首页嵌入接口 v1

首页通过下列地址加载，无需读取本模块DOM：

```
art-history-map.html?embed=1&hostOrigin=<URL编码的首页origin>
```

`embed=1` 继续使用原有嵌入布局。`hostOrigin` 必须是完整HTTPS origin，或开发用的 localhost/127.0.0.1/[::1] HTTP origin；不接受通配符、路径、用户名、非回环HTTP。

模块加载完成会向显式目标origin发送：

```js
{namespace:'magic-history',version:1,module:'art',type:'ready',height:900}
```

高度变化会防抖发送相同格式的 `type:'resize'`，高度限于650–10000像素，重复高度不发送，避免ResizeObserver反馈循环。父窗口可以发：

```js
{namespace:'magic-history',version:1,module:'art',type:'init'}
```

模块仅接受 `event.source === parent`、`event.origin === hostOrigin`、namespace/version/module/type完全匹配的初始化，再回复ready。独立打开时不发送跨窗口消息。课程发布不修改首页源码；首页的模块地址配置在首页仓库维护。

## 来源、公开资源与草稿

初始版本来自旧公开仓库 `gangstfany/magic-history` 的已提交版本 `475615116516c5feab4b17daa308027d3431e4f1`。2026-10-26按用户“全部push”的要求，追加迁入原工作区的18张公开补图（14件作品）、配套来源/权利记录、测试、本地预览脚本和原型。

`source-manifest.json`保留初始提交及页面哈希，并另记追加补图后的源页面哈希；自动测试确认250件作品的全部非图片字段未变，新增模块通信代码也保留。没有改动首页、账号、世界史仓库。

补图记录见 `docs/data-sources/2026-10-19-media-additions.md`、`docs/data-sources/2026-10-20-media-additions.md`；原型在`prototypes/`、`keypoint-cards.html`和`map-keypoints-offline.html`，仅作历史预览归档，不作为正式入口或部署文件。旧仓库的原文件保留。

`.private-media/`中的81张本地学习图片尚待用户选择上传到私有备份还是公开库；它们没有混入公开发布。`scripts/serve_art_history_study.py`与配套测试已归档，运行完整学习预览仍需本地媒体目录。Python缓存不提交。

公开部署仍使用 `scripts/build.py` 的明确文件清单，只发布正式课程、模块通信脚本及公开媒体/数据；不会因归档原型、脚本或说明文档而覆盖首页框架。外部图片仍依赖原图片站点可用性。本地记录中的既有偶发地图标点排布问题并未在本次媒体迁移中声称修复。
