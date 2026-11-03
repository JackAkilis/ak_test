# 接口契约（前后端协作约定）

> 本文档与 `src/contracts/*.ts` 中的 zod schema 一一对应；**代码是权威，文档是说明**。
> Mock 后端（`src/mocks/`）严格按本契约实现，真实后端实现同样契约即可直接替换（前端零改动）。

## 1. 通用约定

### 1.1 资源 REST 五件套

每个资源 `<name>`（复数、kebab-case）暴露：

| 方法   | 路径              | 说明         | 成功响应             |
| ------ | ----------------- | ------------ | -------------------- |
| GET    | `/api/<name>`     | 列表（分页） | `200` `Paginated<T>` |
| GET    | `/api/<name>/:id` | 详情         | `200` `T`            |
| POST   | `/api/<name>`     | 新建         | `201` `T`            |
| PUT    | `/api/<name>/:id` | 全量更新     | `200` `T`            |
| DELETE | `/api/<name>/:id` | 删除         | `204` 无 body        |

请求 / 响应均为 `application/json`。

### 1.2 列表查询参数

```
GET /api/customers?page=2&pageSize=20&q=星云&sort=mrr&order=desc&status=active
```

| 参数       | 类型               | 默认                           | 语义                                                             |
| ---------- | ------------------ | ------------------------------ | ---------------------------------------------------------------- |
| `page`     | int ≥ 1            | 1                              | 页码                                                             |
| `pageSize` | int 1–100          | 10                             | 每页条数                                                         |
| `q`        | string             | —                              | 关键字，对资源的 `searchFields` 做**不区分大小写子串**匹配（OR） |
| `sort`     | 字段名             | 资源默认                       | 排序字段                                                         |
| `order`    | `asc` \| `desc`    | 有 sort 时 `asc`，否则资源默认 | 排序方向                                                         |
| `<filter>` | 资源声明的过滤字段 | —                              | 精确匹配（AND）；空字符串视为不过滤                              |

非法参数值**不报错**，回落默认值（前端 URL 容错；后端建议同样宽容）。
参考实现：`src/mocks/list-query.ts`（搜索 → 过滤 → 排序 → 分页）。

### 1.3 分页响应

```json
{ "data": [], "total": 48, "page": 2, "pageSize": 20 }
```

### 1.4 错误响应（所有非 2xx）

```json
{
  "code": "VALIDATION_ERROR",
  "message": "提交的数据不合法，请检查表单",
  "fieldErrors": { "email": ["邮箱格式不正确"], "mrr": ["MRR 不能为负数"] }
}
```

| HTTP | code               | 场景                            | 前端行为                     |
| ---- | ------------------ | ------------------------------- | ---------------------------- |
| 400  | `VALIDATION_ERROR` | 入参不符合 `xxxInputSchema`     | `fieldErrors` 映射到表单字段 |
| 404  | `NOT_FOUND`        | id 不存在                       | toast                        |
| 409  | 业务 code          | 业务规则拒绝（如 `HAS_ORDERS`） | toast 显示 `message`         |
| 5xx  | 任意               | 服务端错误                      | 列表显示重试；写操作 toast   |

### 1.5 时间与金额

- 时间字段均为 ISO 8601 字符串（UTC），由服务端生成；`createdAt`/`updatedAt` 每个实体都有。
- 金额为数字（元），不做分转换；币种单独字段。

## 2. 资源：客户 `customers`

`src/contracts/customer.ts`

| 字段    | 类型                             | 入参 | 说明                     |
| ------- | -------------------------------- | ---- | ------------------------ |
| id      | string                           | ✗    | 服务端生成 `cus_xxx`     |
| name    | string 1–50                      | ✓    | 联系人                   |
| email   | email                            | ✓    |                          |
| company | string 1–100                     | ✓    |                          |
| plan    | `free` \| `pro` \| `enterprise`  | ✓    | 套餐                     |
| status  | `trial` \| `active` \| `churned` | ✓    | 试用中 / 已付费 / 已流失 |
| mrr     | number ≥ 0                       | ✓    | 月度经常性收入           |
| owner   | string                           | ✓    | 客户成功负责人           |
| notes   | string ≤ 500                     | ✓    | 可为空串                 |

- 搜索字段：`name, email, company, owner`；过滤字段：`plan, status`；默认排序 `createdAt desc`
- 业务规则：**存在订单的客户不可删除** → `409 HAS_ORDERS`

## 3. 资源：订单 `orders`

`src/contracts/order.ts`

| 字段         | 类型                                             | 入参 | 说明                                          |
| ------------ | ------------------------------------------------ | ---- | --------------------------------------------- |
| id           | string                                           | ✗    | `ord_xxx`                                     |
| orderNo      | string                                           | ✗    | 服务端生成 `NB-YYYYMMDD-NNNN`                 |
| customerId   | string                                           | ✓    | 必须存在，否则 `400` `fieldErrors.customerId` |
| customerName | string                                           | ✗    | 服务端冗余快照，避免列表 N+1                  |
| product      | string 1–100                                     | ✓    |                                               |
| amount       | number > 0                                       | ✓    |                                               |
| currency     | `CNY` \| `USD`                                   | ✓    |                                               |
| status       | `pending` \| `paid` \| `refunded` \| `cancelled` | ✓    |                                               |
| paidAt       | string \| null                                   | ✗    | status 变为 paid/refunded 时服务端写入        |
| remark       | string ≤ 200                                     | ✓    |                                               |

- 搜索字段：`orderNo, customerName, product`；过滤字段：`status, customerId`

## 4. 总览 `GET /api/dashboard/summary`

`src/contracts/dashboard.ts`

```ts
{
  customerTotal: number
  activeCustomers: number
  trialCustomers: number
  mrr: number                   // 所有客户 mrr 之和
  ordersThisMonth: number       // 自然月内创建
  revenueThisMonth: number      // 本月 status=paid 且 currency=CNY 的 amount 之和
  statusBreakdown: { status: OrderStatus; count: number }[]
  recentOrders: Order[]         // 最近 8 条
}
```

## 5. 新增资源的流程

见 `.claude/skills/api-contract/SKILL.md`；脚手架 `npm run gen:module` 会生成符合本约定的契约与 Mock。
