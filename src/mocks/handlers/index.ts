import { customerHandlers } from './customers'
import { dashboardHandlers } from './dashboard'
import { orderHandlers } from './orders'
// <harness:handler-imports>

/** 所有 Mock 接口。新增模块：在此 spread 其 handlers。 */
export const handlers = [
  ...customerHandlers,
  ...orderHandlers,
  ...dashboardHandlers,
  // <harness:handlers>
]
