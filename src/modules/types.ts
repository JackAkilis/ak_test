import type { LucideIcon } from 'lucide-react'
import type { ComponentType, LazyExoticComponent } from 'react'

/** 业务模块元信息：路由、导航、页面都由此派生 */
export interface ModuleDef {
  id: string
  title: string
  /** 以 / 开头的路径 */
  path: string
  icon: LucideIcon
  Page: LazyExoticComponent<ComponentType>
}
