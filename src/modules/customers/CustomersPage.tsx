import { customerPlanOptions, customerStatusOptions } from '@/contracts/customer'
import { CrudPage } from '@/components/crud'
import { customerColumns } from './columns'
import { CustomerForm } from './CustomerForm'
import { customerHooks } from './hooks'

export default function CustomersPage() {
  return (
    <CrudPage
      hooks={customerHooks}
      columns={customerColumns}
      FormComponent={CustomerForm}
      getLabel={(c) => `${c.name} · ${c.company}`}
      description="管理 SaaS 客户的套餐、状态与月度经常性收入（MRR）"
      searchPlaceholder="搜索姓名 / 邮箱 / 公司 / 负责人"
      filters={[
        { name: 'plan', label: '套餐', options: customerPlanOptions },
        { name: 'status', label: '状态', options: customerStatusOptions },
      ]}
    />
  )
}
