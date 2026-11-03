import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import type { ListQuery, Paginated } from '@/contracts/common'
import type { ResourceDef } from '@/contracts/resource'
import { createResourceApi, type ResourceApi } from './resource-api'

export interface CrudHooks<TEntity extends { id: string }, TInput, TQuery extends ListQuery> {
  resource: ResourceDef<TEntity, TInput, TQuery>
  api: ResourceApi<TEntity, TInput, TQuery>
  keys: {
    all: readonly [string]
    lists: () => readonly [string, 'list']
    list: (query: TQuery) => readonly [string, 'list', TQuery]
    detail: (id: string) => readonly [string, 'detail', string]
  }
  useList: (
    query: TQuery,
    options?: Omit<UseQueryOptions<Paginated<TEntity>>, 'queryKey' | 'queryFn'>,
  ) => ReturnType<typeof useQuery<Paginated<TEntity>>>
  useOne: (id: string | undefined) => ReturnType<typeof useQuery<TEntity>>
  useCreate: () => ReturnType<typeof useMutation<TEntity, Error, TInput>>
  useUpdate: () => ReturnType<typeof useMutation<TEntity, Error, { id: string; input: TInput }>>
  useRemove: () => ReturnType<typeof useMutation<void, Error, string>>
}

/**
 * 由资源定义生成一组 react-query hooks：
 * 查询 key 统一管理，任何写操作成功后自动失效该资源的全部缓存。
 */
export function createCrudHooks<TEntity extends { id: string }, TInput, TQuery extends ListQuery>(
  resource: ResourceDef<TEntity, TInput, TQuery>,
): CrudHooks<TEntity, TInput, TQuery> {
  const api = createResourceApi(resource)
  const keys = {
    all: [resource.name] as const,
    lists: () => [resource.name, 'list'] as const,
    list: (query: TQuery) => [resource.name, 'list', query] as const,
    detail: (id: string) => [resource.name, 'detail', id] as const,
  }

  function useList(
    query: TQuery,
    options?: Omit<UseQueryOptions<Paginated<TEntity>>, 'queryKey' | 'queryFn'>,
  ) {
    return useQuery<Paginated<TEntity>>({
      queryKey: keys.list(query),
      queryFn: ({ signal }) => api.list(query, signal),
      placeholderData: keepPreviousData,
      ...options,
    })
  }

  function useOne(id: string | undefined) {
    return useQuery<TEntity>({
      queryKey: keys.detail(id ?? ''),
      queryFn: ({ signal }) => api.get(id!, signal),
      enabled: Boolean(id),
    })
  }

  function useCreate() {
    const qc = useQueryClient()
    return useMutation<TEntity, Error, TInput>({
      mutationFn: (input) => api.create(input),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  function useUpdate() {
    const qc = useQueryClient()
    return useMutation<TEntity, Error, { id: string; input: TInput }>({
      mutationFn: ({ id, input }) => api.update(id, input),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  function useRemove() {
    const qc = useQueryClient()
    return useMutation<void, Error, string>({
      mutationFn: (id) => api.remove(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  return { resource, api, keys, useList, useOne, useCreate, useUpdate, useRemove }
}
