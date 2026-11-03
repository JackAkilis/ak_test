---
name: api-contract
description: 修改接口契约 / 字段 / 枚举，或对接真实后端。当用户要"加字段 / 改枚举 / 改接口 / 接后端"时使用。
---

# 契约变更的闭环

契约在 `src/contracts/`，是前端类型、表单校验、Mock 校验的**唯一来源**。改契约时沿以下顺序走，每步都有编译器 / 测试兜底：

1. **contracts/<entity>.ts**
   - 实体 `xxxSchema`：响应结构
   - 入参 `xxxInputSchema`：新建/编辑共用，带中文错误文案
   - 查询 `xxxQuerySchema`：新增可过滤字段 → 同时加进 `filterFields`
   - 枚举：`xxxSchema` + `xxxLabels` + `xxxOptions` 三件套
2. **mocks/seeds/<name>.ts**：种子补字段（tsc 会报缺字段）
3. **mocks/handlers/<name>.ts**：若字段由服务端生成（如订单号、快照字段），在 `create/update` 回调里填
4. **modules/<name>/columns.tsx + XxxForm.tsx**：展示与录入
5. **测试**：契约单测（`contracts/*.test.ts`）+ 页面测试补新字段的断言
6. **docs/API.md**：若影响接口形状，更新对应小节

## 对接真实后端

- 后端按 `docs/API.md` 实现五个 REST 端点 + 列表查询语义（参考 `src/mocks/list-query.ts`）
- 错误体统一 `{ code, message, fieldErrors? }`，`fieldErrors` 会自动映射到表单字段
- 前端切换：`.env` → `VITE_USE_MOCK=false` + `VITE_API_BASE_URL`（或 `VITE_PROXY_TARGET` 走 vite 代理）
- 建议用 Mock 的 `src/mocks/handlers/*.test.ts` 作为后端契约测试的用例来源
