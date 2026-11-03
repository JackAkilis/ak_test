import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderWithProviders } from '@/test/utils'
import CustomersPage from './CustomersPage'

function newestCustomer() {
  return [...db.customers.all()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

describe('CustomersPage（CrudPage 集成）', () => {
  it('加载并展示第一页客户，默认按创建时间倒序', async () => {
    renderWithProviders(<CustomersPage />, { route: '/customers' })
    const first = newestCustomer()
    await screen.findByText(first.email)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(10)
    expect(within(rows[0]).getByText(first.email)).toBeInTheDocument()
    expect(screen.getByText(String(db.customers.all().length))).toBeInTheDocument()
  })

  it('搜索关键字过滤列表（防抖后请求）', async () => {
    renderWithProviders(<CustomersPage />, { route: '/customers' })
    await screen.findByText(newestCustomer().email)
    const target = db.customers.all()[5]
    await userEvent.type(screen.getByRole('searchbox', { name: '搜索' }), target.email)
    await waitFor(() => expect(screen.getAllByRole('row').slice(1)).toHaveLength(1))
    expect(screen.getByText(target.email)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重置/ })).toBeInTheDocument()
  })

  it('状态过滤器写入 URL 并过滤', async () => {
    renderWithProviders(<CustomersPage />, { route: '/customers' })
    await screen.findByText(newestCustomer().email)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '状态' }), 'churned')
    const table = screen.getByRole('table')
    await waitFor(() => {
      const badges = within(table).getAllByText(/已流失|试用中|已付费/)
      expect(badges.length).toBeGreaterThan(0)
      expect(badges.every((b) => b.textContent === '已流失')).toBe(true)
    })
  })

  it('新建：表单校验 → 提交 → 列表出现新客户 → toast', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CustomersPage />, { route: '/customers' })
    await screen.findByText(newestCustomer().email)

    await user.click(screen.getByRole('button', { name: '新建客户' }))
    const form = screen.getByRole('form', { name: '新建客户表单' })
    await user.click(within(form).getByRole('button', { name: '创建' }))
    expect(await within(form).findByText('请输入联系人姓名')).toBeInTheDocument()

    await user.type(within(form).getByLabelText(/联系人/), '测试新客')
    await user.type(within(form).getByLabelText(/邮箱/), 'new@example.com')
    await user.type(within(form).getByLabelText(/公司/), '新建公司')
    await user.type(within(form).getByLabelText(/负责人/), '陈嘉豪')
    await user.selectOptions(within(form).getByLabelText(/套餐/), 'pro')
    await user.click(within(form).getByRole('button', { name: '创建' }))

    expect(await screen.findByText(/已创建/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('new@example.com')).toBeInTheDocument()
    expect(db.customers.all().some((c) => c.email === 'new@example.com')).toBe(true)
  })

  it('编辑：抽屉预填并保存', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CustomersPage />, { route: '/customers' })
    const first = newestCustomer()
    await screen.findByText(first.email)

    await user.click(screen.getByRole('button', { name: `编辑 ${first.name} · ${first.company}` }))
    const form = screen.getByRole('form', { name: '编辑客户表单' })
    const company = within(form).getByLabelText(/公司/) as HTMLInputElement
    expect(company.value).toBe(first.company)
    await user.clear(company)
    await user.type(company, '改名公司')
    await user.click(within(form).getByRole('button', { name: '保存' }))

    expect(await screen.findByText(/已更新/)).toBeInTheDocument()
    expect(await screen.findByText('改名公司')).toBeInTheDocument()
    expect(db.customers.get(first.id)?.company).toBe('改名公司')
  })

  it('删除：确认后移除；有订单的客户被后端拒绝并提示', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CustomersPage />, { route: '/customers' })
    await screen.findByText(newestCustomer().email)

    const orphan = db.customers
      .all()
      .find((c) => !db.orders.all().some((o) => o.customerId === c.id))!
    const withOrders = db.customers
      .all()
      .find((c) => db.orders.all().some((o) => o.customerId === c.id))!

    // 定位到无订单客户
    await user.type(screen.getByRole('searchbox', { name: '搜索' }), orphan.email)
    await waitFor(() => expect(screen.getAllByRole('row').slice(1)).toHaveLength(1))
    await user.click(
      screen.getByRole('button', { name: `删除 ${orphan.name} · ${orphan.company}` }),
    )
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '删除' }))
    expect(await screen.findByText(/已删除/)).toBeInTheDocument()
    expect(db.customers.get(orphan.id)).toBeUndefined()

    // 有订单客户：后端 409
    await user.clear(screen.getByRole('searchbox', { name: '搜索' }))
    await user.type(screen.getByRole('searchbox', { name: '搜索' }), withOrders.email)
    await waitFor(() => expect(screen.getAllByRole('row').slice(1)).toHaveLength(1))
    await user.click(
      screen.getByRole('button', { name: `删除 ${withOrders.name} · ${withOrders.company}` }),
    )
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '删除' }))
    expect(await screen.findByText('删除失败')).toBeInTheDocument()
    expect(screen.getByText(/还有 \d+ 笔订单/)).toBeInTheDocument()
    expect(db.customers.get(withOrders.id)).toBeDefined()
  })
})
