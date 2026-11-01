# 净化 / XSS 扩展策略

> 对应改进项 **I12**。目标：预览可扩展，但不为省事放开不安全 HTML。

## 原则

1. **源码默认无 HTML**：`markdown-it` 配置 `html: false`。用户写的 `<script>` / 裸 HTML 不会进入 token 流。  
2. **渲染后再消毒**：所有进入 `v-html` 的预览 HTML 必须先过 `sanitizePreviewHtml`（`src/lib/markdown/sanitize.ts`）。  
3. **白名单扩展，禁止黑名单凑合**：需要新标签 / 属性时，显式加入 `PREVIEW_ADD_TAGS` / `PREVIEW_ADD_ATTR`，并在下方登记。  
4. **后置增强可信**：Shiki / Mermaid / 复制按钮等在消毒**之后**由本机代码注入；不要把用户可控字符串直接拼进未消毒片段。  
5. **自定义主题是 CSS，不是 HTML**：走 `sanitizeCss`（禁 `@import`、禁外链 `url(http…)`），见 [themes/THEME_PACK.md](../themes/THEME_PACK.md)。

## 预览管线（顺序）

```text
Markdown 源码
  → 方言展开（wiki / 图片尺寸 / 路径 normalize …）
  → markdown-it（html:false；attrs 仅 width|height|class）
  → sanitizePreviewHtml（DOMPurify）
  → enhanceFencedBlocks（Shiki / Mermaid / 复制钮）
  → applyPreviewThemeClasses（内容钩子类名）
  → resolvePreviewImages（相对路径 → asset:；仅改 img.src）
  → PreviewPane v-html
```

图片尺寸值另经 `sanitizeSizeValue`（仅数字 / `%` / `px`），避免 attrs 注入异常尺寸。

## 当前白名单摘要

| 类别 | 内容 | 原因 |
|---|---|---|
| Profile | `html` + `svg` + `svgFilters` | 正文 + Mermaid SVG |
| ADD_TAGS | MathML 子集、`foreignObject`、`details`/`summary` | KaTeX / Mermaid / tip·details 容器 |
| ADD_ATTR | 常见 SVG 绘制字段、`style`/`class`/`id`、`width`/`height`、`data-line` / `data-line-highlight`、部分 ARIA | 高亮行、图片尺寸、无障碍 |
| 明确不加 | `script`、`iframe`、`object`、`embed`、`form`、任意 `on*` | XSS 面 |

配置常量：`PREVIEW_ADD_TAGS` / `PREVIEW_ADD_ATTR` / `PREVIEW_SANITIZE_CONFIG`。

## 如何扩展白名单

需要新预览能力（例如未来允许有限 HTML 方言）时：

1. **优先**用 Markdown 方言或本机后置注入（像 tip 容器、`enhance.ts`），避免放开 `html: true`。  
2. 若必须保留某标签 / 属性：  
   - 改 `src/lib/markdown/sanitize.ts`；  
   - 在本文件「登记表」加一行（标签、用途、风险、日期）；  
   - 补 `sanitize.test.ts` 断言「该标签保留 + 危险载荷仍剥离」。  
3. **禁止**：为调试临时关掉 DOMPurify；禁止在预览路径直接 `innerHTML = userString` 且跳过消毒。  
4. attrs 插件只放行已消毒语义的键（现仅 `width` / `height` / `class`）；新增键须同步消毒函数。

### 登记表（扩展时追加）

| 日期 | 标签/属性 | 用途 | 风险备注 |
|---|---|---|---|
| 既有 | MathML / SVG / details | KaTeX、Mermaid、容器 | `style` 仍允许，依赖 DOMPurify 剥离表达式类载荷 |
| 既有 | `data-line-highlight` | 代码行高亮 | 仅数字列表，fence 解析侧约束 |
| 既有 | `img width/height` | 图片尺寸语法 | `sanitizeSizeValue` |

## 其它表面

| 表面 | 策略 |
|---|---|
| 自定义主题 CSS | `sanitizeCss`；体积上限 512KB |
| Crepe / Milkdown 混合编辑 | 不走本预览 `v-html`；Mermaid 预览由 Crepe `applyPreview` 注入已渲染 SVG |
| 导出 HTML / Word / PNG | 复用 `renderMarkdown`（含消毒）；导出可再剥复制钮等 chrome |
| Front matter | 作为文本塞进 `<pre>`，仍先 `sanitizePreviewHtml` |
| 本地图 `asset:` | 消毒后再 `resolvePreviewImages` 改写 src，避免相对路径被剥后无法解析 |

## 相关代码

- `src/lib/markdown/sanitize.ts` — 唯一预览消毒入口  
- `src/lib/markdown/renderer.ts` — 调用消毒  
- `src/lib/markdown/enhance.ts` — 消毒后增强  
- `src/lib/theme/customCss.ts` — 主题 CSS 消毒  
- `src/lib/markdown/imageSize.ts` — 尺寸属性消毒  
