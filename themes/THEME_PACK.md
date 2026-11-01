# Lunark 主题包约定

自定义主题是一份 **CSS 文件**（可选文件头元数据）。放进应用配置目录的 `themes/`，或通过菜单「主题 → 导入主题 CSS…」导入。

## 文件头

```css
/* lunark-theme: 显示名 */
/* lunark-dark: true */
/* lunark-features: tip, line-numbers, highlight-lines */
```

| 头 | 必填 | 说明 |
|---|---|---|
| `lunark-theme` | 否 | 菜单中的显示名；缺省用文件名 |
| `lunark-dark` | 否 | `true` / `false`；缺省时按 `--bg-color` 启发式判断 |
| `lunark-features` | 否 | 本主题**声明已样式化**的预览能力（见下）；逗号 / 空格 / `\|` 分隔 |

激活自定义主题时，应用会设置：

- `html[data-theme="custom"]`
- `html[data-theme-mode="dark"|"light"]`
- `html[data-lunark-features="tip line-numbers …"]`（有声明时）

`lunark-features` **不会**强行改用户 prefs（例如不会自动打开「代码行号」）；只作约定与 CSS / 内省标记。

## 可选 features

| id | 含义 | 建议选择器 |
|---|---|---|
| `tip` | tip / info / warning / danger 提示块 | `#write .lunark-container-tip` 等 |
| `containers` | 含 details 在内的容器总称 | `#write .lunark-container` |
| `line-numbers` | 预览代码行号外观 | `#write pre.has-line-numbers` |
| `highlight-lines` | fence `{1,3-5}` 高亮行 | `#write pre .line.highlighted` |
| `task-list` | 任务列表 | `#write .md-task-list-item` |
| `footnotes` | 脚注区 | `#write .md-footnote` |

预览内容钩子类名（始终注入，与 features 无关）：`md-fences` / `md-task-list-item` / `md-image` / `md-footnote`。

## 样式写法

覆盖 CSS 变量（推荐）：

```css
[data-theme="custom"] {
  --bg-color: #2b3036;
  --text-color: #c5ccd3;
  /* … */
}
```

或按能力细化预览（可用 features 属性收窄作用域）：

```css
:root[data-lunark-features~="tip"] #write .lunark-container-tip {
  border-left: 3px solid var(--primary-color);
}
```

## 限制

- 单文件 ≤ 512KB  
- `@import` 与 `http(s)` / 协议相对 `url()` 会被剥离  
- 未知壳层选择器仅 `console.info` 提示，不阻断加载  
- 主题只改样式；预览 HTML 净化见 [docs/SECURITY-XSS.md](../docs/SECURITY-XSS.md)  


## 示例

| 文件 | 说明 |
|---|---|
| `examples/slate.css` | 暗色变量包 |
| `examples/paper.css` | 亮色变量包 |
| `examples/content-hooks.css` | 内容区类名演示 |
| `examples/preview-kit.css` | 声明 features 并样式化 tip / 行号 / 高亮行 |
