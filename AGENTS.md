# AGENTS.md

## 项目概述
单文件 HTML 简历生成工具，纯前端、无后端，双击 `index.html` 即可在浏览器运行。

## 技术栈
- Tailwind CSS v3（CDN）
- 原生 JavaScript (ES2020+)
- 无构建步骤，无 npm 依赖

## 核心功能
- 左右分栏布局：左侧表单（40%）+ 右侧 A4 预览（60%）
- LocalStorage 自动缓存
- File System Access API 本地文件同步（新建/保存/打开 `.json` 简历文件）
- 头像上传（Base64）
- 工作经历/教育经历动态增删
- 技能标签输入
- A4 比例画布实时预览
- 打印优化（`@media print`）

## 文件说明
- `index.html`：唯一入口，包含全部 HTML/CSS/JS
- `styles/main.css`：模板遗留文件，实际未使用

## 开发注意事项
- 所有样式使用内联 `<style>` 或 Tailwind CDN
- 数据以 JSON 格式存储于 LocalStorage 或本地 `.json` 文件
- 头像以 Base64 编码存储在 JSON 中
- 打印时自动隐藏左侧表单面板