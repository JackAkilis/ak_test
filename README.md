# Nimbus Admin

> 一个「订阅型 SaaS 运营后台」：客户管理 + 订单管理 + 总览，React 19 / TypeScript / Vite 实现，
> 内置 MSW Mock 后端与一套面向 AI 协作的 **harness**（CLAUDE.md · hooks · 脚手架 · 门禁）。

## 快速开始

```bash
npm install
npm run dev          # http://localhost:5173（默认 Mock 模式，数据持久化在 localStorage）
```

```bash
npm run check        # typecheck + lint + prettier + 单测 + 构建（≈10s）
npm run test:e2e     # Playwright（首次：npx playwright install chromium）
```

## 题目要求 ↔ 实现

| 要求                        | 实现                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| ≥2 个业务模块，含增删改查   | **客户**（套餐/状态/MRR）与**订单**（关联客户、服务端生成订单号）+ 总览。搜索 / 过滤 / 排序 / 分页 / 新建 / 编辑 / 删除 / 校验 / 业务规则拒绝    |
| 复用表格、表单等公共组件    | `DataTable`（TanStack，三态 + 服务端排序分页）、`Form/Field/useZodForm`、`Drawer/Dialog/Toast`，再上一层 `CrudPage` 让模块只剩"契约 + 列 + 表单" |
| 快速、高质量迭代            | 契约驱动 + 模块脚手架（`npm run gen:module`，30 秒一个模块）+ Claude hooks 即时反馈 + Stop 门禁 + 30 个单测/集成测试 + e2e                       |
| 快速前后端协作，后端可 Mock | zod 契约即接口文档（`docs/API.md`）；MSW 完整实现契约（校验、业务错误、延迟、持久化）；`VITE_USE_MOCK=false` 一键切真实后端                      |
| 可运行项目及 harness        | 本仓库；harness 见 `CLAUDE.md`、`.claude/`、`scripts/harness/`、`docs/HARNESS.md`                                                                |

## 功能一览

- **总览**：客户数 / MRR / 本月订单 / 本月收入、订单状态分布、最近订单
- **客户**：按姓名/邮箱/公司/负责人搜索；按套餐、状态过滤；MRR/时间排序；新建/编辑抽屉（zod 校验、服务端字段错误回显）；删除确认；**有订单的客户不可删（409）**
- **订单**：按订单号/客户/商品搜索；状态过滤；金额/时间排序；新建时从客户模块拉下拉；服务端生成订单号、客户名快照、支付时间
- **通用**：列表状态在 URL（刷新/分享/后退都保留）、加载/空/错误三态、键盘 ESC 关闭、顶栏一键重置 Mock 数据、移动端侧栏折叠

## 目录结构

```
src/contracts    前后端共享 zod 契约（实体 / 入参 / 查询 / ResourceDef）
src/lib          http · createResourceApi · createCrudHooks · env
src/components   ui（原子）· data-table · form · crud（CrudPage）
src/modules      customers · orders · dashboard · registry（路由+导航自动派生）
src/mocks        MSW handlers（通用 CRUD 生成器）· store · seeds
src/test         Vitest 基座（MSW Node）
e2e              Playwright
scripts          check.sh 门禁 · scaffold-module.mjs 脚手架 · harness/ hooks
.claude          settings.json（hooks）· skills/（add-module / api-contract / verify）
docs             ARCHITECTURE.md · API.md · HARNESS.md
```

## 新增一个模块（演示"快速迭代"）

```bash
npm run gen:module -- tickets --label 工单 --icon Ticket \
  --fields "subject:string:标题,priority:enum(low|medium|high):优先级,status:enum(open|closed):状态,estimate:number:预估工时,dueAt:date:截止日期,urgent:boolean:紧急,description?:text:描述"
npm run check:quick   # 生成的模块自带页面测试，直接通过
npm run dev           # 侧边栏出现「工单」，CRUD 全部可用
```

生成 9 个文件并自动注册到契约导出 / Mock 数据库 / handlers / 模块注册表；之后只需润色枚举中文与列展示。

## 对接真实后端

1. 后端按 `docs/API.md` 实现 REST 五件套与列表查询语义（Mock 的 `src/mocks/list-query.ts` 是参考实现，`src/mocks/handlers/*.test.ts` 可作为契约测试用例）。
2. `.env`：`VITE_USE_MOCK=false`，`VITE_API_BASE_URL=https://api.example.com`（或设置 `VITE_PROXY_TARGET` 走 Vite 代理）。
3. 前端代码零改动。

## Harness 一览

| 时机               | 自动发生的事                                           |
| ------------------ | ------------------------------------------------------ |
| 会话开始           | 注入项目须知、检查依赖与 git 状态                      |
| 执行 Bash 前       | 拦截强推 / 递归删目录 / 裸 `vitest` 等危险命令         |
| 每次编辑文件后     | prettier → eslint --fix → 增量 tsc，问题立刻回传给模型 |
| 模型准备结束回合时 | 有源码改动则跑 `check:quick`，不通过不能结束           |

详见 [docs/HARNESS.md](docs/HARNESS.md)。

## 技术栈

React 19 · TypeScript 5.9 (strict) · Vite 7 · Tailwind CSS 4 · react-router 7 · TanStack Query 5 · TanStack Table 8 · react-hook-form 7 · zod 4 · MSW 2 · Vitest 3 · Testing Library · Playwright · ESLint 9 · Prettier
