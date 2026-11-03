import { customersModule } from './customers'
import { dashboardModule } from './dashboard'
import { ordersModule } from './orders'
// <harness:module-imports>

/** 模块注册表：侧边栏顺序即数组顺序。新增模块只需在此登记。 */
export const modules = [
  dashboardModule,
  customersModule,
  ordersModule,
  // <harness:modules>
]
