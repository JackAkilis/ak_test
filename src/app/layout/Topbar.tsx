import { DatabaseZap, Menu } from 'lucide-react'
import { useLocation } from 'react-router'
import { env } from '@/lib/env'
import { modules } from '@/modules/registry'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-context'

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  const current = modules.find((m) => pathname.startsWith(m.path))
  const toast = useToast()

  const resetMock = async () => {
    const { resetDb } = await import('@/mocks/db')
    resetDb()
    toast.success('Mock 数据已重置', '页面即将刷新')
    setTimeout(() => window.location.reload(), 600)
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenu}
          aria-label="打开菜单"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <nav className="text-sm text-slate-500" aria-label="面包屑">
          <span>Nimbus</span>
          {current && (
            <>
              <span className="mx-2 text-slate-300">/</span>
              <span className="font-medium text-slate-900">{current.title}</span>
            </>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {env.useMock && (
          <Button variant="ghost" size="sm" onClick={resetMock} title="清空本地修改，恢复种子数据">
            <DatabaseZap className="h-4 w-4" />
            重置 Mock 数据
          </Button>
        )}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white"
          aria-label="当前用户：运营管理员"
          title="运营管理员"
        >
          运
        </div>
      </div>
    </header>
  )
}
