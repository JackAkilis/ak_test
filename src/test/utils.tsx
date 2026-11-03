import { QueryClient } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, RouterProvider } from 'react-router'
import { AppProviders } from '@/app/providers'
import { createTestRouter } from '@/app/router'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  })
}

/** 渲染单个组件（带 Query + Toast + MemoryRouter） */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', ...options }: RenderOptions & { route?: string } = {},
) {
  const client = createTestQueryClient()
  return {
    client,
    ...render(
      <AppProviders client={client}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AppProviders>,
      options,
    ),
  }
}

/** 渲染完整应用路由（AppShell + 页面） */
export function renderApp(route = '/') {
  const client = createTestQueryClient()
  const router = createTestRouter([route])
  return {
    client,
    router,
    ...render(
      <AppProviders client={client}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  }
}
