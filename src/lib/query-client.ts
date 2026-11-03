import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './http'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        // 4xx 是确定性错误，重试无意义
        retry: (count, err) => !(ApiError.is(err) && err.status < 500) && count < 2,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: 0 },
    },
  })
}
