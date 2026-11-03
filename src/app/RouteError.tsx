import { isRouteErrorResponse, useRouteError } from 'react-router'
import { EmptyState } from '@/components/ui/misc'

export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : '未知错误'
  return <EmptyState title="页面出错了" description={message} />
}
