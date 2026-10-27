# 第二阶段：艺术史缺图接入

用户“继续下一步”批准执行上一阶段提出的缺图接入。只改独立艺术史仓库，本地验证，不自动提交或push。

**目标：**把公开归档中74个restoredViews按作品ID/视角ID接入构建产物；7个remoteFallbacks保留归档，现有可用远程图片不替换。

**架构：**新建 `scripts/publish_study_media.py`，由 `scripts/build.py` 在发布前调用。先验证清单、文件哈希/大小、路径及作品视角，再生成仅含图片字段和图片出处改动的HTML。源课程JSON、现有授权账本保持原始记录；产物中的署名明确这是学习图片且不新增开放授权。构建只复制这74个验证过的文件，不复制整个归档目录。

- [x] 新增 `tests/test_publish_study_media.py`：真实74视图全部填充、其余307视图不变、非图片字段与原始HTML不变、出处和视角对应、7备用图不采用、非法/重复/错误哈希清单失败；先运行观察失败。
- [x] 实现独立发布转换函数，拒绝清单路径逃逸/符号链接/未知视图/非空视图覆盖，校验SHA256和字节数；JSON内转义 `<` 以保护script边界。
- [x] 构建接入转换和74文件白名单；补Node发布契约，验证HTML指向的全部本地图片存在。
- [x] 更新README、归档说明、source-manifest，明确网页集成与保留原始授权记录的关系。
- [x] 运行Node全套针对性测试、Python测试、250作品校验及构建；实测手机和桌面缺图作品、同作品多个视角、大图及署名；保存截图。
- [x] 记录覆盖与后续项，保留本地预览，核对未改其他仓库。

验证命令：`python3 -m unittest discover -s tests -p 'test_*.py'`；`node --test --test-skip-pattern='U5 restricted authority matches runtime|assembled U3 verifier rejects' tests/*.test.mjs`；`node scripts/validate-art-history-data.mjs art-history-map.html`；`python3 scripts/build.py`。
