---
name: add-module
description: 新增一个业务 CRUD 模块（契约 + Mock + 页面 + 测试 + 注册）。当用户要"加一个 xx 管理模块 / 新增 xx 列表页"时使用。
---

# 新增业务模块

## 步骤

1. **和用户确认字段**（名称、类型、中文标签、枚举值）。类型只能是：`string | text | number | boolean | date | enum(a|b|c)`。
   没说清的用合理默认值，不要反复追问。
2. **运行脚手架**（不要手写样板）：
   ```bash
   npm run gen:module -- <复数英文名> --label <中文名> --icon <lucide 图标名> \
     --fields "name:string:名称,status:enum(active|disabled):状态,amount:number:金额,note?:text:备注"
   ```
   先加 `--dry-run` 看将生成/修改哪些文件，再正式运行。
3. **人工润色**（脚手架只能生成通用版）：
   - `src/contracts/<singular>.ts`：枚举中文 Labels、校验规则（长度、范围）、`searchFields`
   - `src/modules/<name>/columns.tsx`：Badge 颜色、金额用 `formatMoney`、列顺序
   - `src/mocks/seeds/<name>.ts`：让种子数据像真的（中文名、合理数值）
   - 如需关联其他模块（如下拉选客户），参考 `src/modules/orders/OrderForm.tsx` 用对方的 `hooks.useList`
4. **业务规则**写在 `src/mocks/handlers/<name>.ts` 的 `create / update / beforeRemove` 回调中。
5. **验证**：`npm run check:quick`（生成的 `*Page.test.tsx` 必须通过）→ `npm run dev` 浏览器点一遍。

## 产出检查

- 侧边栏出现新模块，列表 / 搜索 / 过滤 / 新建 / 编辑 / 删除可用
- `docs/API.md` 若有新增非标准接口（非 CRUD 五件套）需补充说明
