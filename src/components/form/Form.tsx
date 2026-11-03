import type { FormHTMLAttributes, ReactNode } from 'react'
import { FormProvider, useFormContext, type FieldValues, type UseFormReturn } from 'react-hook-form'
import { cn } from '@/lib/utils'

export interface FormProps<T extends FieldValues> extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'onSubmit'
> {
  form: UseFormReturn<T>
  onSubmit: (values: T) => void | Promise<void>
  children: ReactNode
}

export function Form<T extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
  ...props
}: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('flex flex-col gap-5', className)}
        {...props}
      >
        {children}
      </form>
    </FormProvider>
  )
}

export interface FieldProps {
  name: string
  label: ReactNode
  required?: boolean
  hint?: ReactNode
  children: ReactNode
  className?: string
}

/** 字段容器：label + 控件 + 提示 / 错误。错误从 RHF context 自动读取。 */
export function Field({ name, label, required, hint, children, className }: FieldProps) {
  const { formState } = useFormContext()
  const error = getErrorMessage(formState.errors, name)
  const id = `field-${name}`
  return (
    <div className={cn('flex flex-col gap-1', className)} data-field={name}>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {/* 固定高度的提示区：错误出现时不改变布局，避免按钮在点击瞬间位移 */}
      <div className="min-h-4 text-xs leading-4">
        {error ? (
          <p className="text-red-600" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p className="text-slate-500">{hint}</p>
        ) : null}
      </div>
    </div>
  )
}

function getErrorMessage(errors: Record<string, unknown>, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, errors)
  if (value && typeof value === 'object' && 'message' in value) {
    return String((value as { message?: unknown }).message ?? '')
  }
  return undefined
}

export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-5 sm:grid-cols-2', className)}>{children}</div>
}
