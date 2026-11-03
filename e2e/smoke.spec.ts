import { expect, test } from '@playwright/test'

test('总览页展示指标并可导航到订单页进行过滤', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: '总览' })).toBeVisible()
  await expect(page.getByText('客户总数')).toBeVisible()
  await expect(page.getByText('最近订单')).toBeVisible()
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(9) // 表头 + 8

  await page.getByRole('link', { name: '订单' }).click()
  await expect(page.getByRole('heading', { name: '订单管理' })).toBeVisible()
  await page.getByRole('combobox', { name: '状态' }).selectOption('paid')
  const table = page.getByRole('table')
  await expect(table.getByText('已支付').first()).toBeVisible()
  await expect(table.getByText('待支付')).toHaveCount(0)
})

test('新建订单时客户下拉来自客户模块，订单号由服务端生成', async ({ page }) => {
  await page.goto('/orders')
  await page.getByRole('button', { name: '新建订单' }).click()
  const form = page.getByRole('form', { name: '新建订单表单' })
  const customer = form.getByLabel(/客户/)
  await expect
    .poll(async () => customer.locator('option').count(), { timeout: 5000 })
    .toBeGreaterThan(10)
  await customer.selectOption({ index: 1 })
  await form.getByLabel(/商品/).fill('E2E 套餐')
  await form.getByLabel(/金额/).fill('1234.5')
  await form.getByLabel(/^状态/).selectOption('paid')
  await form.getByRole('button', { name: '创建' }).click()
  await expect(page.getByRole('status').filter({ hasText: /已创建/ })).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: 'E2E 套餐' })
  await expect(row).toBeVisible()
  await expect(row.getByText(/^NB-\d{8}-\d{4}$/)).toBeVisible()
  await expect(row.getByText('¥1,234.50')).toBeVisible()
})
