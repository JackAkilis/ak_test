import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { z } from 'zod'
import type { ListQuery } from '@/contracts/common'

/**
 * 把列表查询状态（分页 / 排序 / 搜索 / 过滤）放进 URL search params：
 * 刷新、分享、浏览器前进后退都能还原视图。
 * schema 负责解析与容错（非法值回落默认值）。
 */
export function useListQueryState<TQuery extends ListQuery>(schema: z.ZodType<TQuery>) {
  const [searchParams, setSearchParams] = useSearchParams()

  const query = useMemo(() => {
    const raw = Object.fromEntries(searchParams.entries())
    return schema.parse(raw)
  }, [searchParams, schema])

  const setQuery = useCallback(
    (patch: Partial<TQuery>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          // 非分页字段变化时重置到第一页
          const touchesNonPage = Object.keys(patch).some((k) => k !== 'page')
          if (touchesNonPage && !('page' in patch)) next.delete('page')
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === null || v === '' || (k === 'page' && v === 1))
              next.delete(k)
            else next.set(k, String(v))
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const reset = useCallback(
    () => setSearchParams(new URLSearchParams(), { replace: true }),
    [setSearchParams],
  )

  return { query, setQuery, reset }
}
