# 艺术史本轮改动审查与整改

审查范围：3d56a9f 之后修改的筛选、时期大类、英文选项、Unit 气泡、文字层级、面板焦点、地图返回、比较浮窗，以及首页独立加载艺术史的方式。250 件作品原始资料与 3d56a9f 逐项比较一致；本轮未改写原始作品事实内容。

## 发现并处理

1. U1 只有 Global Prehistory，归并过粗。现分 Palaeolithic（AP1–3）、Neolithic（AP4–8）、Regional Prehistoric Traditions（AP9–11）。这是浏览分类，不把不同地区按统一年份切割；原始时期、跨期年代和地区传统继续在详情中显示。
2. U6、U9 单一总类的筛选价值不足。按已有作品资料分别提供三个大类；Djenné 的重建、byeri 的修订年代等细节继续保留。
3. 先前批准的“具体类型收入更多筛选”未落实。现主栏为 Unit、时期、作品类别、搜索；具体类型收于可展开区域，已选条件可在外部清除。
4. 独立代码审查发现：更多筛选折叠后移除类型条件，焦点落到 BODY。已在浏览器复现并修正；现在返回可见 SUMMARY，展开时返回类型选择框。独立复审确认问题解决，无其他已确认代码问题。

## 内容依据

- Apollo 11 的史前/旧石器归类：https://smarthistory.org/apollo-11-cave-stones/
- Running horned woman 的新石器归类：https://smarthistory.org/running-horned-woman-tassili-najjer-algeria/
- Susa 器物的新石器浏览归类：https://smarthistory.org/bushel-with-ibex-motifs/
- Anthropomorphic stele：https://smarthistory.org/anthropomorphic-stele/
- Tlatilco 的 Early Formative 地区语境：https://smarthistory.org/tlatilco-figurines/
- Ambum 地区史前传统：https://smarthistory.org/ambum/
- Lapita：https://www.metmuseum.org/de/essays/lapita-pottery-ca-1500-500-b-c
- AP 官方课程框架：https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf

## 验证记录

- 35 个大类逐一在浏览器选择，显示数量与菜单数量一致；250 件分类覆盖且无遗漏或重复。
- U1 Palaeolithic 3/11、Neolithic 5/11、Regional 3/11；Neolithic + Objects + ritual jade 为 1/11；清除恢复 11/11。
- U3 大类筛选后打开 AP60，详情保留 High Gothic；搜索后返回 France，地图 transform 与原地区一致。
- 键盘打开作品后焦点到标题；改变窗口后原卡片焦点保留。
- All Units 十个气泡不含 pieces；主栏四控件均为 44px。
- 比较视图标题/英文副标题/标签分别匹配共享层级；390px 对话框和页面均无横向溢出，手机详情 overflow 为 visible。
- 完整 Node 测试 522 项、Python 10 项、250 件数据校验及公开构建均通过。另有独立静态代码审查与针对性测试。
