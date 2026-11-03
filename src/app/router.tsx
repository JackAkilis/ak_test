import { createBrowserRouter, createMemoryRouter, Navigate, type RouteObject } from 'react-router'
import { modules } from '@/modules/registry'
import { EmptyState } from '@/components/ui/misc'
import { AppShell } from './layout/AppShell'
import { RouteError } from './RouteError'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to={modules[0].path} replace /> },
      ...modules.map((m) => ({ path: m.path.replace(/^\//, ''), element: <m.Page /> })),
      { path: '*', element: <EmptyState title="404" description="页面不存在" /> },
    ],
  },
]

export const createAppRouter = () => createBrowserRouter(routes)
export const createTestRouter = (initialEntries: string[]) =>
  createMemoryRouter(routes, { initialEntries })
