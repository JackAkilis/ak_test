#!/usr/bin/env node
/**
 * 模块脚手架：按项目约定一次性生成一个完整 CRUD 模块（契约 / Mock / 页面 / 测试 / 注册）。
 *
 *   npm run gen:module -- tickets \
 *     --label 工单 --singular ticket --icon Ticket \
 *     --fields "subject:string:标题,priority:enum(low|medium|high):优先级,status:enum(open|closed):状态,estimate:number:预估工时,dueAt:date:截止日期,urgent:boolean:紧急,description?:text:描述"
 *
 * 字段 DSL：name[?]:type[:中文标签]
 *   type ∈ string | text | number | boolean | date | enum(a|b|c)
 *   name 末尾加 ? 表示可为空（string/text 允许空串，date 允许 null）
 *
 * 选项：--dry-run 只打印将生成的文件；--force 覆盖已存在的模块目录
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ---------- 参数解析 ----------
const argv = process.argv.slice(2)
if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
  console.log(
    readFileSync(fileURLToPath(import.meta.url), 'utf-8')
      .split('*/')[0]
      .replace(/^\/\*\*?\s?/gm, ''),
  )
  process.exit(0)
}
const name = argv[0]
if (!/^[a-z][a-z0-9-]*$/.test(name))
  fail(`模块名需为小写 kebab-case 复数，如 tickets、audit-logs；收到：${name}`)
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d
}
const flag = (k) => argv.includes(`--${k}`)

const label = opt('label', name)
const singular = opt('singular', singularize(name))
const icon = opt('icon', 'Boxes')
const fieldsRaw = opt('fields', '')
if (!fieldsRaw) fail('必须通过 --fields 指定至少一个字段')
const dryRun = flag('dry-run')
const force = flag('force')

const fields = fieldsRaw.split(',').map(parseField)
if (!fields.some((f) => f.type === 'string')) fail('至少需要一个 string 字段作为搜索与显示字段')

const camel = toCamel(singular) // ticket
const Pascal = toPascal(singular) // Ticket
const camelPlural = toCamel(name) // tickets / auditLogs
const PascalPlural = toPascal(name) // Tickets / AuditLogs
const idPrefix = singular.replace(/[^a-z]/g, '').slice(0, 3)

const moduleDir = join(ROOT, 'src', 'modules', name)
if (existsSync(moduleDir) && !force)
  fail(`模块目录已存在：${relative(ROOT, moduleDir)}（加 --force 覆盖）`)

// ---------- 生成内容 ----------
const files = new Map()
files.set(`src/contracts/${singular}.ts`, renderContract())
files.set(`src/mocks/seeds/${name}.ts`, renderSeed())
files.set(`src/mocks/handlers/${name}.ts`, renderHandlers())
files.set(`src/modules/${name}/hooks.ts`, renderHooks())
files.set(`src/modules/${name}/columns.tsx`, renderColumns())
files.set(`src/modules/${name}/${Pascal}Form.tsx`, renderForm())
files.set(`src/modules/${name}/${PascalPlural}Page.tsx`, renderPage())
files.set(`src/modules/${name}/${PascalPlural}Page.test.tsx`, renderTest())
files.set(`src/modules/${name}/index.ts`, renderModuleDef())

const edits = [
  ['src/contracts/index.ts', '// <harness:contract-exports>', `export * from './${singular}'`],
  ['src/mocks/seeds/index.ts', '// <harness:seed-exports>', `export * from './${name}'`],
  [
    'src/mocks/db.ts',
    '// <harness:db-imports>',
    `import type { ${Pascal} } from '@/contracts/${singular}'\nimport { seed${PascalPlural} } from './seeds/${name}'`,
  ],
  [
    'src/mocks/db.ts',
    '// <harness:db-tables>',
    `${camelPlural}: createStore<${Pascal}>('${name}', () => seed${PascalPlural}()),`,
  ],
  [
    'src/mocks/handlers/index.ts',
    '// <harness:handler-imports>',
    `import { ${camel}Handlers } from './${name}'`,
  ],
  ['src/mocks/handlers/index.ts', '// <harness:handlers>', `...${camel}Handlers,`],
  [
    'src/modules/registry.ts',
    '// <harness:module-imports>',
    `import { ${camelPlural}Module } from './${name}'`,
  ],
  ['src/modules/registry.ts', '// <harness:modules>', `${camelPlural}Module,`],
].map(([file, marker, line]) => ({ file, marker, line }))

// 校验标记都存在（dry-run 也能提前发现）
for (const e of edits) {
  if (!readFileSync(join(ROOT, e.file), 'utf-8').includes(e.marker))
    fail(`${e.file} 缺少标记 ${e.marker}，无法自动注册`)
}

// ---------- 写入 ----------
console.log(`\n📦 生成模块 ${name}（${label}）：${fields.length} 个字段\n`)
for (const [p] of files) console.log(`  + ${p}`)
for (const e of edits) console.log(`  ~ ${e.file}  （${e.marker}）`)
if (dryRun) {
  console.log('\n--dry-run：未写入任何文件。')
  process.exit(0)
}
for (const [p, content] of files) {
  const abs = join(ROOT, p)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)
}
// 逐条应用：同一文件可能有多处标记，必须每次重新读盘再写
for (const e of edits) insertAtMarker(e.file, e.marker, e.line)

const touched = [...files.keys(), ...new Set(edits.map((e) => e.file))]
spawnSync('npx', ['prettier', '--write', '--log-level', 'warn', ...touched], {
  cwd: ROOT,
  stdio: 'inherit',
})

console.log(`
✅ 完成。下一步：
  1. 调整 src/contracts/${singular}.ts 中的枚举中文标签与校验规则
  2. 按需修改 src/modules/${name}/columns.tsx 的列展示
  3. npm run check:quick   # 类型 / lint / 单测（已包含生成的 ${PascalPlural}Page.test.tsx）
  4. npm run dev           # 侧边栏已出现「${label}」
`)

// ---------- 模板 ----------
function renderContract() {
  const enums = fields
    .filter((f) => f.type === 'enum')
    .map(
      (f) => `export const ${camel}${f.Pascal}Schema = z.enum([${f.values.map(q).join(', ')}])
export type ${Pascal}${f.Pascal} = z.infer<typeof ${camel}${f.Pascal}Schema>
export const ${camel}${f.Pascal}Labels: Record<${Pascal}${f.Pascal}, string> = {
${f.values.map((v) => `  ${v}: ${q(v)},`).join('\n')}
}
export const ${camel}${f.Pascal}Options = toOptions(${camel}${f.Pascal}Labels)
`,
    )
    .join('\n')

  const entityFields = fields.map((f) => `  ${f.name}: ${entityZod(f)},`).join('\n')
  const inputFields = fields.map((f) => `  ${f.name}: ${inputZod(f)},`).join('\n')
  const queryExt = fields
    .filter((f) => f.type === 'enum')
    .map((f) => `  ${f.name}: ${camel}${f.Pascal}Schema.optional().catch(undefined),`)
    .join('\n')
  const searchFields = fields.filter((f) => f.type === 'string').map((f) => q(f.name))
  const filterFields = fields.filter((f) => f.type === 'enum').map((f) => q(f.name))

  return `import { z } from 'zod'
import { idSchema, listQuerySchema, timestampFields } from './common'
import { defineResource, toOptions } from './resource'

${enums}
export const ${camel}Schema = z.object({
  id: idSchema,
${entityFields}
  ...timestampFields,
})
export type ${Pascal} = z.infer<typeof ${camel}Schema>

export const ${camel}InputSchema = z.object({
${inputFields}
})
export type ${Pascal}Input = z.infer<typeof ${camel}InputSchema>

export const ${camel}QuerySchema = listQuerySchema.extend({
${queryExt}
})
export type ${Pascal}Query = z.infer<typeof ${camel}QuerySchema>

export const ${camel}Resource = defineResource<${Pascal}, ${Pascal}Input, ${Pascal}Query>({
  name: ${q(name)},
  label: ${q(label)},
  entity: ${camel}Schema,
  input: ${camel}InputSchema,
  query: ${camel}QuerySchema,
  searchFields: [${searchFields.join(', ')}],
  filterFields: [${filterFields.join(', ')}],
  defaultSort: { field: 'createdAt', order: 'desc' },
})
`
}

function entityZod(f) {
  switch (f.type) {
    case 'string':
    case 'text':
      return 'z.string()'
    case 'number':
      return 'z.number()'
    case 'boolean':
      return 'z.boolean()'
    case 'date':
      return f.optional ? 'z.string().nullable()' : 'z.string()'
    case 'enum':
      return `${camel}${f.Pascal}Schema`
  }
}
function inputZod(f) {
  switch (f.type) {
    case 'string':
      return f.optional
        ? `z.string().trim().max(100, '最多 100 个字符')`
        : `z.string().trim().min(1, '请输入${f.label}').max(100, '最多 100 个字符')`
    case 'text':
      return f.optional
        ? `z.string().max(1000, '最多 1000 个字符')`
        : `z.string().trim().min(1, '请输入${f.label}').max(1000, '最多 1000 个字符')`
    case 'number':
      return `z.number({ error: '请输入有效数字' }).min(0, '${f.label}不能为负数')`
    case 'boolean':
      return 'z.boolean()'
    case 'date':
      return f.optional ? `z.string().nullable()` : `z.string().min(1, '请选择${f.label}')`
    case 'enum':
      return `${camel}${f.Pascal}Schema`
  }
}

function renderSeed() {
  const gen = fields
    .map((f) => {
      switch (f.type) {
        case 'string':
          return `      ${f.name}: \`${f.label} \${i + 1}\`,`
        case 'text':
          return `      ${f.name}: rng.next() > 0.5 ? '这是一段示例${f.label}。' : '',`
        case 'number':
          return `      ${f.name}: rng.int(1, 100),`
        case 'boolean':
          return `      ${f.name}: rng.next() > 0.6,`
        case 'date':
          return `      ${f.name}: new Date(Date.now() + rng.int(-30, 60) * DAY).toISOString().slice(0, 10),`
        case 'enum':
          return `      ${f.name}: rng.pick(${camel}${f.Pascal}Schema.options),`
      }
    })
    .join('\n')
  const enumImports = fields
    .filter((f) => f.type === 'enum')
    .map((f) => `${camel}${f.Pascal}Schema`)
  return `import { ${[`type ${Pascal}`, ...enumImports].join(', ')} } from '@/contracts/${singular}'
import { DAY, createRng } from './rng'

export function seed${PascalPlural}(count = 24, seed = ${hash(name)}): ${Pascal}[] {
  const rng = createRng(seed)
  const list: ${Pascal}[] = []
  for (let i = 0; i < count; i++) {
    const createdAt = new Date(Date.now() - rng.int(0, 120) * DAY - rng.int(0, DAY)).toISOString()
    list.push({
      id: \`${idPrefix}_\${String(i + 1).padStart(4, '0')}\`,
${gen}
      createdAt,
      updatedAt: createdAt,
    })
  }
  return list
}
`
}

function renderHandlers() {
  return `import { ${camel}Resource, type ${Pascal}, type ${Pascal}Input } from '@/contracts/${singular}'
import { createCrudHandlers } from '../crud-handlers'
import { db } from '../db'
import { newId, nowIso } from '../store'

export const ${camel}Handlers = createCrudHandlers(${camel}Resource, db.${camelPlural}, {
  create: (input: ${Pascal}Input): ${Pascal} => {
    const now = nowIso()
    return { id: newId(${q(idPrefix)}), ...input, createdAt: now, updatedAt: now }
  },
  update: (current, input) => ({ ...current, ...input, updatedAt: nowIso() }),
})
`
}

function renderHooks() {
  return `import { ${camel}Resource } from '@/contracts/${singular}'
import { createCrudHooks } from '@/lib/crud-hooks'

export const ${camel}Hooks = createCrudHooks(${camel}Resource)
`
}

function renderColumns() {
  const needsBadge = fields.some((f) => f.type === 'enum')
  const needsDate = fields.some((f) => f.type === 'date')
  const enumImports = fields
    .filter((f) => f.type === 'enum')
    .map((f) => `${camel}${f.Pascal}Labels`)
  const cols = fields
    .map((f) => {
      switch (f.type) {
        case 'string':
          return `  col.accessor('${f.name}', { header: ${q(f.label)}, meta: { sortable: true } }),`
        case 'text':
          return `  col.accessor('${f.name}', {
    header: ${q(f.label)},
    cell: ({ getValue }) => <span className="line-clamp-1 max-w-xs text-slate-500">{getValue() || '—'}</span>,
  }),`
        case 'number':
          return `  col.accessor('${f.name}', { header: ${q(f.label)}, meta: { sortable: true, align: 'right' } }),`
        case 'boolean':
          return `  col.accessor('${f.name}', {
    header: ${q(f.label)},
    cell: ({ getValue }) => (getValue() ? <Badge tone="green">是</Badge> : <Badge tone="gray">否</Badge>),
  }),`
        case 'date':
          return `  col.accessor('${f.name}', {
    header: ${q(f.label)},
    meta: { sortable: true },
    cell: ({ getValue }) => <span className="text-slate-500">{formatDate(getValue())}</span>,
  }),`
        case 'enum':
          return `  col.accessor('${f.name}', {
    header: ${q(f.label)},
    cell: ({ getValue }) => <Badge tone="blue">{${camel}${f.Pascal}Labels[getValue()]}</Badge>,
  }),`
      }
    })
    .join('\n')
  return `import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { ${[`type ${Pascal}`, ...enumImports].join(', ')} } from '@/contracts/${singular}'
import { formatDate } from '@/lib/utils'
${needsBadge || fields.some((f) => f.type === 'boolean') ? `import { Badge } from '@/components/ui/badge'` : ''}

const col = createColumnHelper<${Pascal}>()

export const ${camel}Columns = [
${cols}
  col.accessor('createdAt', {
    header: '创建时间',
    meta: { sortable: true },
    cell: ({ getValue }) => <span className="text-slate-500">{formatDate(getValue())}</span>,
  }),
] as ColumnDef<${Pascal}, unknown>[]
${needsDate ? '' : ''}`
}

function renderForm() {
  const enumImports = fields
    .filter((f) => f.type === 'enum')
    .map((f) => `${camel}${f.Pascal}Options`)
  const defaults = fields
    .map((f) => {
      switch (f.type) {
        case 'string':
        case 'text':
          return `  ${f.name}: '',`
        case 'number':
          return `  ${f.name}: 0,`
        case 'boolean':
          return `  ${f.name}: false,`
        case 'date':
          return `  ${f.name}: ${f.optional ? 'null' : `''`},`
        case 'enum':
          return `  ${f.name}: ${q(f.values[0])},`
      }
    })
    .join('\n')
  const controls = fields
    .map((f) => {
      const req = f.optional ? '' : ' required'
      switch (f.type) {
        case 'string':
          return `      <Field name="${f.name}" label=${q(f.label)}${req}>
        <Input id={fieldId('${f.name}')} invalid={invalid('${f.name}')} {...register('${f.name}')} />
      </Field>`
        case 'text':
          return `      <Field name="${f.name}" label=${q(f.label)}${req}>
        <Textarea id={fieldId('${f.name}')} invalid={invalid('${f.name}')} {...register('${f.name}')} />
      </Field>`
        case 'number':
          return `      <Field name="${f.name}" label=${q(f.label)} required>
        <Input id={fieldId('${f.name}')} type="number" step="any" invalid={invalid('${f.name}')} {...register('${f.name}', { valueAsNumber: true })} />
      </Field>`
        case 'boolean':
          return `      <Field name="${f.name}" label=${q(f.label)}>
        <label className="flex h-9 items-center gap-2 text-sm text-slate-700">
          <input id={fieldId('${f.name}')} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" {...register('${f.name}')} />
          是
        </label>
      </Field>`
        case 'date':
          return `      <Field name="${f.name}" label=${q(f.label)}${req}>
        <Input id={fieldId('${f.name}')} type="date" invalid={invalid('${f.name}')} {...register('${f.name}'${f.optional ? ", { setValueAs: (v) => (v === '' ? null : v) }" : ''})} />
      </Field>`
        case 'enum':
          return `      <Field name="${f.name}" label=${q(f.label)} required>
        <Select id={fieldId('${f.name}')} options={${camel}${f.Pascal}Options} invalid={invalid('${f.name}')} {...register('${f.name}')} />
      </Field>`
      }
    })
    .join('\n')
  const usesInput = fields.some((f) => ['string', 'number', 'date'].includes(f.type))
  const usesTextarea = fields.some((f) => f.type === 'text')
  const usesSelect = fields.some((f) => f.type === 'enum')
  const uiImports = [
    usesInput && 'Input',
    usesSelect && 'Select',
    usesTextarea && 'Textarea',
  ].filter(Boolean)
  return `import { ${[`${camel}InputSchema`, ...enumImports, `type ${Pascal}`, `type ${Pascal}Input`].join(', ')} } from '@/contracts/${singular}'
import { Field, Form, applyServerErrors, fieldId, useZodForm } from '@/components/form'
${uiImports.length ? `import { ${uiImports.join(', ')} } from '@/components/ui/input'` : ''}
import { useToast } from '@/components/ui/toast-context'
import { FormFooter, type EntityFormProps } from '@/components/crud'
import { ApiError } from '@/lib/http'

const emptyValues: ${Pascal}Input = {
${defaults}
}

export function ${Pascal}Form({ mode, entity, onSubmit, onCancel, submitting }: EntityFormProps<${Pascal}, ${Pascal}Input>) {
  const toast = useToast()
  const form = useZodForm(${camel}InputSchema, {
    defaultValues: entity ? ${camel}InputSchema.parse(entity) : emptyValues,
  })
  const { register, formState } = form
  const invalid = (name: keyof ${Pascal}Input) => Boolean(formState.errors[name])

  const submit = async (values: ${Pascal}Input) => {
    try {
      await onSubmit(values)
    } catch (err) {
      if (!applyServerErrors(form, err)) {
        toast.error('保存失败', ApiError.is(err) ? err.message : '请稍后重试')
      }
    }
  }

  return (
    <Form form={form} onSubmit={submit} aria-label={mode === 'create' ? '新建${label}表单' : '编辑${label}表单'}>
${controls}
      <FormFooter mode={mode} submitting={submitting} onCancel={onCancel} />
    </Form>
  )
}
`
}

function renderPage() {
  const enumFields = fields.filter((f) => f.type === 'enum')
  const labelField = fields.find((f) => f.type === 'string')
  const filters = enumFields
    .map(
      (f) =>
        `        { name: '${f.name}', label: ${q(f.label)}, options: ${camel}${f.Pascal}Options },`,
    )
    .join('\n')
  return `${enumFields.length ? `import { ${enumFields.map((f) => `${camel}${f.Pascal}Options`).join(', ')} } from '@/contracts/${singular}'\n` : ''}import { CrudPage } from '@/components/crud'
import { ${camel}Columns } from './columns'
import { ${Pascal}Form } from './${Pascal}Form'
import { ${camel}Hooks } from './hooks'

export default function ${PascalPlural}Page() {
  return (
    <CrudPage
      hooks={${camel}Hooks}
      columns={${camel}Columns}
      FormComponent={${Pascal}Form}
      getLabel={(item) => item.${labelField.name}}
      description="${label}管理（由脚手架生成，请按业务调整文案）"
${enumFields.length ? `      filters={[\n${filters}\n      ]}\n` : ''}    />
  )
}
`
}

function renderModuleDef() {
  return `import { ${icon} } from 'lucide-react'
import { lazy } from 'react'
import type { ModuleDef } from '../types'

export const ${camelPlural}Module: ModuleDef = {
  id: ${q(name)},
  title: ${q(label)},
  path: ${q('/' + name)},
  icon: ${icon},
  Page: lazy(() => import('./${PascalPlural}Page')),
}
`
}

function renderTest() {
  const labelField = fields.find((f) => f.type === 'string')
  return `import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderWithProviders } from '@/test/utils'
import ${PascalPlural}Page from './${PascalPlural}Page'

function newest() {
  return [...db.${camelPlural}.all()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

describe('${PascalPlural}Page', () => {
  it('加载并展示列表', async () => {
    renderWithProviders(<${PascalPlural}Page />, { route: '/${name}' })
    await screen.findByText(newest().${labelField.name})
    expect(screen.getByText(String(db.${camelPlural}.all().length))).toBeInTheDocument()
  })

  it('新建后出现在列表中', async () => {
    const user = userEvent.setup()
    renderWithProviders(<${PascalPlural}Page />, { route: '/${name}' })
    await screen.findByText(newest().${labelField.name})

    await user.click(screen.getByRole('button', { name: '新建${label}' }))
    const form = screen.getByRole('form', { name: '新建${label}表单' })
${fields
  .filter((f) => !f.optional && (f.type === 'string' || f.type === 'text' || f.type === 'date'))
  .map((f) =>
    f.type === 'date'
      ? `    await user.type(within(form).getByLabelText(/${f.label}/), '2030-01-01')`
      : `    await user.type(within(form).getByLabelText(/${f.label}/), '测试${f.label}')`,
  )
  .join('\n')}
    await user.click(within(form).getByRole('button', { name: '创建' }))

    expect(await screen.findByText(/已创建/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(db.${camelPlural}.all().some((x) => x.${labelField.name} === '测试${labelField.label}')).toBe(true)
  })
})
`
}

// ---------- 工具 ----------
function parseField(raw) {
  const m =
    /^([a-zA-Z][a-zA-Z0-9]*)(\?)?:(string|text|number|boolean|date|enum\(([^)]+)\))(?::(.+))?$/.exec(
      raw.trim(),
    )
  if (!m)
    fail(
      `字段定义不合法：${raw}\n格式：name[?]:type[:标签]，type ∈ string|text|number|boolean|date|enum(a|b|c)`,
    )
  const [, name, optional, typeRaw, enumValues, label] = m
  const type = typeRaw.startsWith('enum') ? 'enum' : typeRaw
  const values = type === 'enum' ? enumValues.split('|').map((v) => v.trim()) : []
  if (type === 'enum' && values.some((v) => !/^[a-z][a-zA-Z0-9_]*$/.test(v)))
    fail(`枚举值需为小写标识符：${raw}`)
  return {
    name,
    optional: Boolean(optional),
    type,
    values,
    label: label ?? name,
    Pascal: toPascal(name),
  }
}
function insertAtMarker(file, marker, line) {
  const abs = join(ROOT, file)
  const src = readFileSync(abs, 'utf-8')
  if (src.includes(line)) return // 幂等：已注册则跳过
  const indent = src
    .split('\n')
    .find((l) => l.includes(marker))
    .match(/^\s*/)[0]
  const next = src.replace(marker, `${line.split('\n').join('\n' + indent)}\n${indent}${marker}`)
  writeFileSync(abs, next)
}
function singularize(n) {
  if (n.endsWith('ies')) return n.slice(0, -3) + 'y'
  if (n.endsWith('ses') || n.endsWith('xes')) return n.slice(0, -2)
  if (n.endsWith('s')) return n.slice(0, -1)
  return n
}
function toCamel(s) {
  return s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
}
function toPascal(s) {
  const c = toCamel(s)
  return c[0].toUpperCase() + c.slice(1)
}
function q(s) {
  return `'${String(s).replace(/'/g, "\\'")}'`
}
function hash(s) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 100000
  return h
}
function fail(msg) {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}
