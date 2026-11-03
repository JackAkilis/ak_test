import { useState } from 'react'
import { RouterProvider } from 'react-router'
import { createQueryClient } from '@/lib/query-client'
import { AppProviders } from './app/providers'
import { createAppRouter } from './app/router'

export default function App() {
  const [client] = useState(createQueryClient)
  const [router] = useState(createAppRouter)
  return (
    <AppProviders client={client}>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
