import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface OverlayBaseProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** 提交中禁止关闭 */
  locked?: boolean
}

/** 共享：ESC 关闭 + 打开时聚焦面板 + 锁定 body 滚动 */
function useOverlayBehavior(open: boolean, onClose: () => void, locked?: boolean) {
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const first = panelRef.current?.querySelector<HTMLElement>(
      'input:not([type=hidden]), select, textarea, button:not([data-close])',
    )
    ;(first ?? panelRef.current)?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose, locked])
  return panelRef
}

export interface DrawerProps extends OverlayBaseProps {
  width?: 'md' | 'lg'
}

/** 右侧抽屉：用于新建 / 编辑表单 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  locked,
  width = 'md',
}: DrawerProps) {
  const panelRef = useOverlayBehavior(open, onClose, locked)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity"
        onClick={locked ? undefined : onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        className={cn(
          'relative flex h-full flex-col bg-white shadow-2xl outline-none',
          'anim-slide-in-right',
          width === 'md' ? 'w-full max-w-md' : 'w-full max-w-2xl',
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="drawer-title" className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={locked}
            aria-label="关闭"
            data-close
          >
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}

export interface DialogProps extends OverlayBaseProps {
  tone?: 'default' | 'danger'
}

/** 居中对话框：用于确认操作 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  locked,
}: DialogProps) {
  const panelRef = useOverlayBehavior(open, onClose, locked)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div
        className="fixed inset-0 bg-slate-900/40"
        onClick={locked ? undefined : onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl outline-none"
      >
        <h2 id="dialog-title" className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export interface ConfirmDialogProps {
  open: boolean
  title: ReactNode
  description?: ReactNode
  confirmText?: string
  tone?: 'default' | 'danger'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  tone = 'default',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      locked={loading}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      {null}
    </Dialog>
  )
}
