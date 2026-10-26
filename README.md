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

数据来自原公开仓库 `https://github.com/gangstfany/magic-history` 的已提交版本 `475615116516c5feab4b17daa308027d3431e4f1`（feature/ap-art-history-u6）。导出使用 Git committed tree，未复制原工作区的未提交文件，也没有修改旧仓库。`source-manifest.json` 记录原页面SHA256；自动测试确认除新增通信模块script外，完整课程HTML与原提交逐字一致。

已核对早期 `fe9737e` 的Unit3来源限定语显示修复：其 `provenanceQualifier ?? siteQualifier` 已在本基线实现，没有用旧页面覆盖新作品。

本库仅纳入原提交已公开的34MB WebP、公开JSON、作品来源/权利记录、相关脚本和测试。作品来源与授权见页内图注及 `data/*-rights.json`、`docs/data-sources/`。受限图片继续显示原有占位说明，私有媒体目录 `.private-media/` 没有复制或发布。外部图片仍依赖原图片站点可用性。

原 `.worktrees/ap-art-history-u4` 的未提交作品、资料和私有媒体均保留原处；没有自动上传。它们之后应按作品和授权状态单独审阅后迁入本仓库。此目录不含账号配置、世界史、APUSH或教材PDF。
