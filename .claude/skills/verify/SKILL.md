---
name: verify
description: 在宣布任务完成前做全量验证（check + e2e + 浏览器手测）。当用户说"验证一下 / 跑一下测试 / 检查是否能交付"时使用。
---

# 全量验证流程

1. `npm run check` —— typecheck、lint、prettier、单测、生产构建，必须全绿。
2. `npm run test:e2e` —— Playwright（首次需 `npx playwright install chromium`）。
   失败时查看 `playwright-report/`，优先怀疑测试选择器是否因文案改动失效。
3. 浏览器手测（`npm run dev`）至少覆盖：
   - 每个模块：列表加载、搜索、过滤、排序、翻页、新建（含校验错误）、编辑、删除
   - 刷新页面后 URL 状态（页码 / 过滤）保留
   - 顶栏「重置 Mock 数据」能恢复种子
4. 向用户报告时：**逐项列出通过 / 未通过**，未通过的给出原因与下一步，不要笼统说"都好了"。
