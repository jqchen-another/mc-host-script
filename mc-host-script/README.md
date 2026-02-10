# 主持稿生成器（静态网页 / 文件夹版）

## 功能
- 多页面向导：基础信息 → 主题 → 风格 → 人物 → 环节选择 → 生成主持稿
- 每个主题都有独立环节库；环节完全手动勾选
- 最终生成：流程目录 + 每个环节（环节说明 + 主持台词 + 可选备选说法/注意事项）+ 通用救场句库
- 支持：复制全文 / 打印（导出 PDF）/ 下载 TXT
- 纯前端，无后端；数据保存在浏览器 localStorage

## 本地打开
直接双击 `index.html` 即可（建议用 Chrome/Edge）。

> 若浏览器限制本地 `fetch`（少数环境会出现），可以用任意静态服务器启动：
- Python：
  - `python -m http.server 8000`
  - 打开 `http://localhost:8000`

## 部署到 GitHub Pages
1. 新建一个 GitHub 仓库（公开或私有均可，Pages 对公开更友好）
2. 把整个文件夹内容上传到仓库根目录
3. Settings → Pages
   - Source：Deploy from a branch
   - Branch：main / root
4. 等待 Pages 生成链接即可访问

## 扩展主题/环节
- `data/themes.json` 添加主题条目
- `data/<theme>.json` 添加该主题的 segments：
  - `id`, `title`, `group`, `explain`, `hostLines`, 可选 `altLines`, `notes`
  - 文案支持占位符：`{{HOST}} {{VENUE}} {{DATE}} {{GROOM}} {{BRIDE}} {{MAIN}} {{GROOM_FATHER}} {{GROOM_MOTHER}} {{BRIDE_FATHER}} {{BRIDE_MOTHER}}`
