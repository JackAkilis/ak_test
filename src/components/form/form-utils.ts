import { zodResolver } from '@hookform/resolvers/zod'
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form'
import type { z } from 'zod'
import { ApiError } from '@/lib/http'

/** zod schema 驱动的表单：类型、校验、默认值一处定义 */
export function useZodForm<TSchema extends z.ZodType<FieldValues>>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.output<TSchema>>, 'resolver'>,
) {
  return useForm<z.output<TSchema>>({
    // zod 4 与 resolver 的泛型暂不完全兼容，此处显式断言
    resolver: zodResolver(schema as never) as never,
    mode: 'onBlur',
    reValidateMode: 'onChange',
    ...options,
  })
}

export type { DefaultValues }

/**
 * 把后端返回的字段级错误写回表单；非字段错误抛出给调用方（通常 toast 提示）。
 * @returns 是否全部映射到了字段
 */
export function applyServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  err: unknown,
): boolean {
  if (!ApiError.is(err) || !err.fieldErrors) return false
  let mapped = false
  for (const [field, messages] of Object.entries(err.fieldErrors)) {
    if (field in form.getValues()) {
      form.setError(field as Path<T>, { type: 'server', message: messages[0] })
      mapped = true
    }
  }
  return mapped
}

/** 控件应传入 id={fieldId(name)} 以关联 label */
export function fieldId(name: string) {
  return `field-${name}`
}
