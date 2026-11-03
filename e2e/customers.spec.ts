import { expect, test } from '@playwright/test'

test.describe('客户模块 CRUD', () => {
  test('新建 → 搜索 → 编辑 → 删除 全流程', async ({ page }) => {
    await page.goto('/customers')
    await expect(page.getByRole('heading', { name: '客户管理' })).toBeVisible()
    await expect(page.getByRole('row')).toHaveCount(11) // 表头 + 10 行

    // 新建
    await page.getByRole('button', { name: '新建客户' }).click()
    const form = page.getByRole('form', { name: '新建客户表单' })
    await form.getByRole('button', { name: '创建' }).click()
    await expect(form.getByText('请输入联系人姓名')).toBeVisible()
    await form.getByLabel(/联系人/).fill('E2E 客户')
    await form.getByLabel(/邮箱/).fill('e2e@example.com')
    await form.getByLabel(/公司/).fill('端到端测试公司')
    await form.getByLabel(/套餐/).selectOption('enterprise')
    await form.getByLabel(/状态/).selectOption('active')
    await form.getByLabel(/MRR/).fill('9999')
    await form.getByLabel(/负责人/).fill('周雨欣')
    await form.getByRole('button', { name: '创建' }).click()
    await expect(page.getByRole('status').filter({ hasText: '已创建' })).toBeVisible()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByRole('row').filter({ hasText: 'e2e@example.com' })).toBeVisible()

    // 搜索（URL 同步）
    await page.getByRole('searchbox', { name: '搜索' }).fill('e2e@example.com')
    await expect(page.getByRole('row')).toHaveCount(2)
    await expect(page).toHaveURL(/q=e2e%40example\.com/)

    // 编辑
    await page.getByRole('button', { name: /编辑 E2E 客户/ }).click()
    const edit = page.getByRole('form', { name: '编辑客户表单' })
    await expect(edit.getByLabel(/公司/)).toHaveValue('端到端测试公司')
    await edit.getByLabel(/公司/).fill('已改名公司')
    await edit.getByRole('button', { name: '保存' }).click()
    await expect(page.getByRole('status').filter({ hasText: '已更新' })).toBeVisible()
    await expect(page.getByRole('cell', { name: '已改名公司', exact: true })).toBeVisible()

    // 删除
    await page.getByRole('button', { name: /删除 E2E 客户/ }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('status').filter({ hasText: '已删除' })).toBeVisible()
    await expect(page.getByText('没有符合条件的客户')).toBeVisible()
  })

  test('过滤与排序状态保存在 URL，刷新后保留', async ({ page }) => {
    await page.goto('/customers')
    await page.getByRole('combobox', { name: '状态' }).selectOption('churned')
    await page.getByRole('button', { name: /^MRR/ }).click()
    await expect(page).toHaveURL(/status=churned/)
    await expect(page).toHaveURL(/sort=mrr/)
    await page.reload()
    await expect(page.getByRole('combobox', { name: '状态' })).toHaveValue('churned')
    const table = page.getByRole('table')
    await expect(table.getByText('已流失').first()).toBeVisible()
    await expect(table.getByText('已付费')).toHaveCount(0)
  })

  test('有订单的客户删除被拒绝并提示原因', async ({ page }) => {
    await page.goto('/customers')
    // 第一页任取一行，若无订单则换下一行；种子数据中绝大多数客户都有订单
    const rows = page.getByRole('row')
    await expect(rows).toHaveCount(11)
    await rows.nth(1).getByRole('button', { name: /删除/ }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: '删除' }).click()
    const status = page.getByRole('status')
    await expect(status.filter({ hasText: /已删除|删除失败/ })).toBeVisible()
  })
})
