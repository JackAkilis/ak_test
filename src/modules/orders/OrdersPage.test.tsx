import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderWithProviders } from '@/test/utils'
import OrdersPage from './OrdersPage'

function newestOrder() {
  return [...db.orders.all()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

describe('OrdersPage', () => {
  it('展示订单列表与金额格式', async () => {
    renderWithProviders(<OrdersPage />, { route: '/orders' })
    const first = newestOrder()
    await screen.findByText(first.orderNo)
    expect(screen.getByText(String(db.orders.all().length))).toBeInTheDocument()
  })

  it('按状态过滤', async () => {
    renderWithProviders(<OrdersPage />, { route: '/orders' })
    await screen.findByText(newestOrder().orderNo)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '状态' }), 'refunded')
    await waitFor(() => {
      const total = db.orders.all().filter((o) => o.status === 'refunded').length
      expect(screen.getByText(String(total))).toBeInTheDocument()
    })
    const table = screen.getByRole('table')
    expect(within(table).getAllByText('已退款').length).toBeGreaterThan(0)
    expect(within(table).queryByText('已支付')).not.toBeInTheDocument()
  })

  it('新建订单：选择客户（跨模块数据）并提交，服务端生成订单号与客户名快照', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OrdersPage />, { route: '/orders' })
    await screen.findByText(newestOrder().orderNo)

    await user.click(screen.getByRole('button', { name: '新建订单' }))
    const form = screen.getByRole('form', { name: '新建订单表单' })
    const customerSelect = within(form).getByLabelText(/客户/) as HTMLSelectElement
    await waitFor(() => expect(customerSelect.options.length).toBeGreaterThan(1))

    const customer = db.customers.all()[3]
    await user.selectOptions(customerSelect, customer.id)
    await user.type(within(form).getByLabelText(/商品/), '企业版 · 年付')
    const amount = within(form).getByLabelText(/金额/)
    await user.clear(amount)
    await user.type(amount, '12000')
    await user.selectOptions(within(form).getByLabelText(/^状态/), 'paid')
    await user.click(within(form).getByRole('button', { name: '创建' }))

    expect(await screen.findByText(/已创建/)).toBeInTheDocument()
    const created = db.orders
      .all()
      .find((o) => o.product === '企业版 · 年付' && o.amount === 12000)!
    expect(created.customerName).toBe(customer.name)
    expect(created.orderNo).toMatch(/^NB-\d{8}-\d{4}$/)
    expect(created.paidAt).not.toBeNull()
    expect(await screen.findByText(created.orderNo)).toBeInTheDocument()
  })
})
