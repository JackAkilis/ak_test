import { orderStatusOptions } from '@/contracts/order'
import { CrudPage } from '@/components/crud'
import { orderColumns } from './columns'
import { OrderForm } from './OrderForm'
import { orderHooks } from './hooks'

export default function OrdersPage() {
  return (
    <CrudPage
      hooks={orderHooks}
      columns={orderColumns}
      FormComponent={OrderForm}
      getLabel={(o) => o.orderNo}
      description="客户的购买 / 续费订单，支持按状态筛选与按金额、时间排序"
      searchPlaceholder="搜索订单号 / 客户 / 商品"
      filters={[{ name: 'status', label: '状态', options: orderStatusOptions }]}
    />
  )
}
