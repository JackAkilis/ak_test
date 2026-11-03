import { Button } from '@/components/ui/button'

export interface FormFooterProps {
  mode: 'create' | 'edit'
  submitting: boolean
  onCancel: () => void
}

/** 抽屉表单底部按钮，所有模块表单复用 */
export function FormFooter({ mode, submitting, onCancel }: FormFooterProps) {
  return (
    <div className="mt-2 flex justify-end gap-2 border-t border-slate-200 pt-5">
      <Button variant="outline" onClick={onCancel} disabled={submitting}>
        取消
      </Button>
      <Button type="submit" loading={submitting}>
        {mode === 'create' ? '创建' : '保存'}
      </Button>
    </div>
  )
}
