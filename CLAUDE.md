# Nimbus Admin — AI 协作须知（CLAUDE.md）

> React 19 + TypeScript + Vite 的 SaaS 运营后台。本文件是给 AI 编码助手（Claude Code / Codex）的"操作手册"，
> 目标：让每一次迭代都**快**（几分钟内闭环）且**可靠**（类型、lint、测试自动守门）。

## 1. 一句话架构

**契约驱动的 CRUD**：每个业务模块 = 一个 `ResourceDef`（zod 契约）+ 列定义 + 表单组件。
前端 hooks、通用页面 `CrudPage`、Mock 后端 handlers 全部由同一份契约派生，所以：

- 改字段 → 只改 `src/contracts/<entity>.ts`，表单校验 / 类型 / Mock 校验同步变化
- 加模块 → `npm run gen:module`（30 秒），不手写样板

```
src/
├─ contracts/      ★ 前后端共享契约（zod）：实体 / 入参 / 查询参数 / ResourceDef
├─ lib/            http 客户端(唯一 fetch 出口) · createResourceApi · createCrudHooks · env
├─ components/
│  ├─ ui/          Button Input Select Badge Drawer Dialog Toast …（无第三方 UI 库）
│  ├─ data-table/  DataTable（TanStack Table，服务端排序分页）· useListQueryState（URL 同步）
│  ├─ form/        useZodForm · Form · Field · applyServerErrors
│  └─ crud/        ★ CrudPage：列表+搜索+过滤+抽屉表单+删除确认，模块只传契约/列/表单
├─ modules/        业务模块：customers（客户）· orders（订单）· dashboard（总览）
│  └─ registry.ts  ★ 模块注册表 → 路由 + 侧边栏自动生成
├─ mocks/          MSW Mock 后端：crud-handlers（通用 REST）· store（内存+localStorage）· seeds
├─ app/            路由、布局（AppShell / Sidebar / Topbar）、Providers
└─ test/           vitest 环境（MSW Node）、renderWithProviders
```

详细：`docs/ARCHITECTURE.md`（设计）· `docs/API.md`（接口契约）· `docs/HARNESS.md`（本 harness 说明）

## 2. 常用命令

| 目的     | 命令                                                         | 说明                                             |
| -------- | ------------------------------------------------------------ | ------------------------------------------------ |
| 开发     | `npm run dev`                                                | http://localhost:5173 ，默认 MSW Mock            |
| 快速门禁 | `npm run check:quick`                                        | typecheck + lint + 单测（~5s，Stop hook 自动跑） |
| 全量门禁 | `npm run check`                                              | 以上 + prettier + 生产构建（CI 同款）            |
| 新模块   | `npm run gen:module -- <name> --label <中文> --fields "..."` | 见 `.claude/skills/add-module`                   |
| 单测     | `npm test` / `npx vitest run <file>`                         | **不要**裸跑 `vitest`（watch 会卡住会话）        |
| E2E      | `npm run test:e2e`                                           | Playwright，自动 build + preview                 |

## 3. 硬性约定（违反会被 lint / hook 拦住）

1. **禁止直接 `fetch`**，统一走 `@/lib/http`（ESLint `no-restricted-globals`），错误统一为 `ApiError`。
2. **契约是唯一事实来源**：新字段先改 `contracts/`，再改 mock seed / handlers，再改 UI；不要在 UI 里重复定义类型。
3. **列表接口语义固定**：`page/pageSize/q/sort/order/<filters>` → `{data,total,page,pageSize}`，Mock 的 `applyListQuery` 即参考实现。
4. **模块之间不互相 import 页面**，只能复用对方的 `hooks`（如订单表单用 `customerHooks.useList`）。
5. **UI 文案中文**，代码标识符英文；枚举值用 `xxxLabels` 映射中文，不要在 JSX 里写 if-else 翻译。
6. **类型导入用 `import type`**（lint 强制），`any` 不允许。
7. **每个模块必须有页面级集成测试**（`*Page.test.tsx`，走真实 MSW handlers）。
8. 不手改 `public/mockServiceWorker.js`（MSW 生成）。

## 4. 新增 / 修改功能的标准流程

```
改契约(contracts) → 改 Mock(seeds/handlers) → 改 UI(columns/form/page) → 补测试 → npm run check:quick
```

- 新模块：`npm run gen:module -- tickets --label 工单 --fields "subject:string:标题,status:enum(open|closed):状态"`
  生成后调整枚举中文、列展示，即可在侧边栏看到。
- 新字段：在 `xxxSchema`/`xxxInputSchema` 增加 → seed 补值 → `columns.tsx` 加列 → `XxxForm.tsx` 加 `Field`。
- 新业务规则（如"有订单不可删"）：写在 Mock handler 的 `beforeRemove/create/update` 回调，返回 `ApiErrorBody`，前端自动 toast / 映射字段错误。
- 接真实后端：`.env` 里 `VITE_USE_MOCK=false`，`VITE_API_BASE_URL=https://api.xxx`（或 `VITE_PROXY_TARGET` 用 vite proxy），后端按 `docs/API.md` 实现即可零改前端。

## 5. 自动化 harness（.claude/settings.json）

| Hook                      | 做什么                                            | 失败时                         |
| ------------------------- | ------------------------------------------------- | ------------------------------ |
| `SessionStart`            | 注入项目须知、检查依赖                            | —                              |
| `PreToolUse(Bash)`        | 拦截危险命令（递归删根目录、强推、裸 `vitest`等） | 阻断并说明原因                 |
| `PostToolUse(Edit/Write)` | 对改动文件 prettier → eslint --fix → 增量 tsc     | **立即反馈**错误，请马上修     |
| `Stop`                    | 本回合有源码改动则跑 `check:quick`                | 阻止结束，必须修复后再宣布完成 |

所以：**不需要手动跑格式化**；看到 `[harness]` 开头的反馈就是门禁结果，优先处理。

## 6. 完成定义（Definition of Done）

- [ ] `npm run check` 全绿（hook 会替你跑 quick 版）
- [ ] 新增/修改的模块有页面级测试覆盖主流程（列表加载、新建、校验）
- [ ] 契约、Mock、UI 三者一致（字段名、枚举值、错误文案）
- [ ] 在浏览器里实际点过一遍（`npm run dev`），加载 / 空 / 错误三态正常
- [ ] 不留 `console.log`、无主 `TODO`、未使用的导出

## 7. 不要做的事

- 不要引入新的 UI 组件库 / 状态库；现有 ui + react-query 足够，先复用 `components/`。
- 不要为了绕过类型用 `as any` / `@ts-ignore`；去修契约或泛型。
- 不要在 `CrudPage` 里加某个模块专属逻辑；用 props（`filters`、`can`、`FormComponent`）扩展。
- 不要修改 `scripts/harness/*` 来"让检查通过"。
