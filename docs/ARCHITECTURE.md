# 架构设计

## 1. 目标与取舍

这是一个"**题目规模**"的 SaaS 后台（两个 CRUD 模块 + 总览），但按**可持续迭代**的标准搭建：

| 目标           | 做法                                                                                    |
| -------------- | --------------------------------------------------------------------------------------- |
| 新模块成本极低 | 契约驱动：一个 `ResourceDef` 派生 API / hooks / Mock / 页面；脚手架一键生成             |
| 前后端并行     | zod 契约即接口文档；MSW Mock 完整实现契约（含校验、业务错误、延迟），一个开关切真实后端 |
| 质量不靠自觉   | TS strict + ESLint 边界规则 + 页面级集成测试 + Claude hooks 自动门禁（见 HARNESS.md）   |
| 不过度设计     | 无状态库（react-query 够用）、无 UI 库（十来个原子组件）、无 monorepo                   |

## 2. 分层

```
┌──────────────────────────────────────────────────────────────┐
│ modules/  业务模块（薄）：契约引用 + 列定义 + 表单 + 注册        │
├──────────────────────────────────────────────────────────────┤
│ components/crud  CrudPage：列表/搜索/过滤/排序/分页/抽屉/删除    │
│ components/data-table · form · ui   通用组件（无业务）           │
├──────────────────────────────────────────────────────────────┤
│ lib/  createCrudHooks(resource) → react-query hooks            │
│       createResourceApi(resource) → REST 客户端                 │
│       http  唯一 fetch 出口，统一 ApiError                      │
├──────────────────────────────────────────────────────────────┤
│ contracts/  zod：Entity / Input / Query / ResourceDef   ★ 共享  │
├──────────────────────────────────────────────────────────────┤
│ mocks/  MSW：createCrudHandlers(resource, store, rules)         │
│         store（内存 + localStorage）· seeds（确定性随机）        │
└──────────────────────────────────────────────────────────────┘
```

**依赖方向只能向下**。`contracts/` 不依赖 React；`mocks/` 只依赖 `contracts/` 与 `lib/env`。

## 3. 核心抽象

### 3.1 `ResourceDef`（契约）

```ts
export const customerResource = defineResource<Customer, CustomerInput, CustomerQuery>({
  name: 'customers', // → /api/customers、query key
  label: '客户', // → 标题、toast 文案
  entity: customerSchema, // 响应结构
  input: customerInputSchema, // 新建/编辑入参 + 中文校验文案
  query: customerQuerySchema, // URL 查询参数（含过滤字段）
  searchFields: ['name', 'email', 'company', 'owner'],
  filterFields: ['plan', 'status'],
  defaultSort: { field: 'createdAt', order: 'desc' },
})
```

同一个对象被四处消费：

| 消费方                       | 用到什么                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `createCrudHooks`            | `name` → 路径与缓存 key                                                      |
| `CrudPage`                   | `query` 解析 URL；`label` 文案；`defaultSort`                                |
| `useZodForm(resource.input)` | 表单类型 + 校验                                                              |
| `createCrudHandlers`         | `input` 校验请求、`query` 解析参数、`searchFields/filterFields` 实现列表语义 |

### 3.2 `CrudPage`

一个泛型页面组件承载整个 CRUD 交互。模块只提供三样东西：

```tsx
<CrudPage
  hooks={customerHooks} // createCrudHooks(customerResource)
  columns={customerColumns} // TanStack ColumnDef[]（meta.sortable / align）
  FormComponent={CustomerForm} // 实现 EntityFormProps
  getLabel={(c) => c.name}
  filters={[{ name: 'status', label: '状态', options: customerStatusOptions }]}
/>
```

内部职责：URL 状态（`useListQueryState`）、防抖搜索、服务端排序分页、三态表格、新建/编辑抽屉、删除确认、toast、缓存失效。
扩展点通过 props（`can`、`filters`、`drawerWidth`），**不**允许在内部写模块专属逻辑。

### 3.3 表单：`EntityFormProps` 契约

```ts
interface EntityFormProps<TEntity, TInput> {
  mode: 'create' | 'edit'
  entity?: TEntity
  onSubmit: (input: TInput) => Promise<void> // 抛 ApiError 时表单负责映射字段错误
  onCancel: () => void
  submitting: boolean
}
```

表单用 `useZodForm(inputSchema)` 得到类型安全的 RHF 实例；`applyServerErrors` 把后端 `fieldErrors` 写回字段。
"前端校验 → 后端校验 → 字段错误回显"三者文案来自同一 schema。

### 3.4 Mock 后端

- `createCrudHandlers(resource, store, { create, update, beforeRemove })`：通用 REST 五件套，业务规则放回调。
- `store`：Map + localStorage 持久化，刷新不丢；测试环境纯内存，`afterEach` 重置。
- `seeds`：mulberry32 确定性随机 → 测试可以对种子数据做精确断言。
- `env.isTest` 下零延迟；开发态 `VITE_MOCK_LATENCY` 可观察 loading 态。

## 4. 数据流（以"编辑客户"为例）

```
点击行 → CrudPage.setDrawer(edit) → CustomerForm(defaultValues = inputSchema.parse(entity))
→ 提交 → zodResolver 校验 → hooks.useUpdate().mutateAsync → http PUT /api/customers/:id
→ MSW handler：inputSchema.safeParse → options.update → store.update → 200
→ onSuccess: invalidateQueries(['customers']) → 列表自动刷新 → toast → 关闭抽屉
失败：400 fieldErrors → applyServerErrors → 字段下方红字；409/5xx → toast.error
```

## 5. 状态管理

| 状态              | 放哪                | 原因                            |
| ----------------- | ------------------- | ------------------------------- |
| 服务端数据        | react-query         | 缓存、失效、并发、重试一次解决  |
| 列表查询条件      | URL search params   | 可刷新、可分享、可后退          |
| 表单              | react-hook-form     | 非受控、性能好、与 zod 天然配合 |
| 抽屉 / 对话框开关 | 组件局部 `useState` | 不需要跨页面                    |
| 全局 toast        | React Context       | 轻量，无需外部库                |

没有 Redux/Zustand：当前没有真正的"全局客户端状态"。

## 6. 设计决策记录（ADR-lite）

1. **zod v4 而非 yup / 手写类型**：一份 schema 同时产出 TS 类型、表单校验、Mock 校验、URL 解析（`coerce` + `catch`）。
2. **MSW 而非 json-server / 自写 express**：请求走真实 `fetch`，浏览器 DevTools 可见；同一套 handlers 在 Vitest（Node）复用，集成测试不再 mock 模块。
3. **TanStack Table（headless）+ 自写 UI**：避免重型组件库对样式与行为的锁定；DataTable 只有 ~200 行却覆盖排序/分页/三态。
4. **URL 作为列表状态源**：后台系统最常见的需求是"把这个筛选结果发给同事"。
5. **模块注册表**：路由与导航从 `modules/registry.ts` 派生，脚手架只需插一行。
6. **删除保护在"服务端"**：有订单的客户不可删是业务规则，放在 Mock handler 的 `beforeRemove`，前端只负责展示错误——与真实后端的职责划分一致。
7. **不做权限/多租户/国际化**：题目不要求；`CrudPage.can` 预留了按钮级权限入口。

## 7. 已知边界与后续

- 关联选择（订单选客户）目前是原生 `<select>` 拉前 100 条；数据量大时应换成远程搜索 Combobox。
- 列表无批量操作与列显隐，可在 `DataTable` 加 `rowSelection` / `columnVisibility`（TanStack 原生支持）。
- Mock 的 `orderNo` 序号基于当前表长度，非全局单调；真实后端应用序列/雪花 ID。
