# Harness Engineering 说明

> "Harness" = 让 AI 编码助手（以及人）在这个仓库里**快速、安全、高质量**迭代的全部脚手架：
> 上下文（CLAUDE.md / skills）· 自动反馈回路（hooks）· 生成器（scaffold）· 门禁（check / CI）· 可测性（MSW + 测试基座）。

## 1. 设计原则

1. **反馈越早越便宜**：每次 Edit/Write 后立刻 prettier / eslint / tsc（秒级），而不是最后跑一次 CI。
2. **把约定变成机器可检查的东西**：能用 lint 规则表达的（禁止裸 fetch、import type）就不写进文档靠自觉。
3. **一处定义，多处派生**：契约 → 类型 / 校验 / Mock / 文档，减少 AI 需要"同步修改多处"的失误面。
4. **生成器优于模板文档**：新模块 30 秒生成 9 个文件并自动注册，比"照着 customers 抄一份"可靠。
5. **完成有定义**：Stop hook 在回合结束前跑 `check:quick`，不通过就不能宣布完成。
6. **护栏而非笼子**：危险命令拦截（强推、递归删目录、watch 模式）只拦明显错误，不阻碍正常工作。

## 2. 组成清单

| 组件                             | 位置                                | 作用                                                          |
| -------------------------------- | ----------------------------------- | ------------------------------------------------------------- |
| 项目须知                         | `CLAUDE.md`                         | 架构速览、命令、硬约定、流程、DoD、禁区                       |
| 技能（可复用工作流）             | `.claude/skills/*/SKILL.md`         | `add-module` / `api-contract` / `verify`                      |
| Hooks 配置                       | `.claude/settings.json`             | 四个生命周期钩子 + 常用命令免确认                             |
| SessionStart                     | `scripts/harness/session-start.mjs` | 注入环境状态与流程提示                                        |
| PreToolUse(Bash) 护栏            | `scripts/harness/guard-bash.mjs`    | 拦截危险命令；忽略 heredoc 正文避免误伤                       |
| PostToolUse(Edit/Write) 即时反馈 | `scripts/harness/post-edit.mjs`     | prettier → eslint --fix → 增量 tsc，问题 exit 2 回传          |
| Stop 守门                        | `scripts/harness/stop-check.mjs`    | 有改动则跑 `check:quick`；失败阻止结束（防死循环）            |
| 统一门禁                         | `scripts/check.sh`                  | 本地 / hook / CI 同一脚本：`--quick` 与全量                   |
| 模块脚手架                       | `scripts/scaffold-module.mjs`       | 字段 DSL → 契约/种子/handlers/hooks/列/表单/页面/测试/注册    |
| 注册标记                         | `// <harness:*>` 注释               | 脚手架插入点：contracts / seeds / db / handlers / registry    |
| 测试基座                         | `src/test/`                         | MSW Node server、`renderWithProviders` / `renderApp`          |
| 质量规则                         | `eslint.config.js` `tsconfig.json`  | strict、no-restricted-globals(fetch)、consistent-type-imports |
| CI                               | `.github/workflows/ci.yml`          | `npm run check` + Playwright                                  |

## 3. 一次迭代长什么样

以"给客户加一个 `phone` 字段"为例（真实耗时约 3 分钟）：

```
1. 改 src/contracts/customer.ts：entity + input 加 phone
   └─ PostToolUse: tsc 报 seeds/customers.ts 缺字段  ← 立刻知道还要改哪
2. 改 src/mocks/seeds/customers.ts 补 phone
   └─ PostToolUse: ✓
3. 改 columns.tsx 加列、CustomerForm.tsx 加 Field
   └─ PostToolUse: ✓（prettier 已自动格式化）
4. 补测试断言
5. 回合结束 → Stop hook 跑 check:quick → 30+ 测试通过 → 允许结束
```

新模块更简单：`npm run gen:module -- tickets --label 工单 --fields "..."`，生成即通过 `check:quick`，再润色文案。

## 4. Hook 协议要点（便于维护）

- Hook 通过 **stdin JSON** 收事件（`tool_input.file_path` / `tool_input.command` / `stop_hook_active`）。
- **exit 2 + stderr** = 阻断并把信息喂回模型；exit 0 = 通过（stdout 仅记录）。
- `post-edit` 会把改动文件记到 `node_modules/.cache/harness/dirty.json`，`stop-check` 据此决定是否运行、运行后清空。
- `stop-check` 看到 `stop_hook_active=true`（上一次已阻断过）时只报告不再阻断，防止无限循环。
- 所有脚本用 Node 编写、零依赖（不要求 jq），`$CLAUDE_PROJECT_DIR` 定位项目根。

## 5. 如何验证 harness 本身

```bash
# 护栏：应被拦截（exit 2）
echo '{"tool_input":{"command":"git push origin main --force"}}' | node scripts/harness/guard-bash.mjs
# 护栏：heredoc 正文里的危险词不应被拦截（exit 0）
printf '{"tool_input":{"command":"cat > a.md <<EOF\\nrm -rf /\\nEOF"}}' | node scripts/harness/guard-bash.mjs
# 即时反馈：故意写个类型错误再触发
echo '{"tool_input":{"file_path":"'$PWD'/src/lib/utils.ts"}}' | node scripts/harness/post-edit.mjs
# 脚手架：dry-run
npm run gen:module -- demos --label 演示 --fields "name:string:名称" --dry-run
```

## 6. 有意不做的

- 不用 git pre-commit hook（husky）：Claude hooks 已覆盖编辑期，CI 覆盖提交后；避免双重等待。
- 不在 PostToolUse 跑测试：tsc + lint 秒级即可；测试放 Stop hook，一回合跑一次。
- 不自动修 lint 之外的问题：自动修改应可预期（格式、import 顺序），逻辑修复交给模型并留痕。
