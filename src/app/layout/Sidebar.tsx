import { Sparkles } from 'lucide-react'
import { NavLink } from 'react-router'
import { env } from '@/lib/env'
import { cn } from '@/lib/utils'
import { modules } from '@/modules/registry'

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
      aria-label="侧边导航"
    >
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="text-base font-semibold tracking-tight text-slate-900">Nimbus</span>
        <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
          ADMIN
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="主导航">
        {modules.map((m) => (
          <NavLink
            key={m.id}
            to={m.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <m.icon className="h-4 w-4 shrink-0" aria-hidden />
            {m.title}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              env.useMock ? 'bg-amber-400' : 'bg-emerald-500',
            )}
            aria-hidden
          />
          {env.useMock ? 'Mock 数据模式' : '已连接后端'}
        </div>
        <div className="mt-1 text-slate-400">v{__APP_VERSION__}</div>
      </div>
    </aside>
  )
}
