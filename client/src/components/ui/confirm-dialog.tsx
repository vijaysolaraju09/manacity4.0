import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-surface-2/50 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl border border-borderc/40 bg-surface-1 p-6 shadow-2xl dark:border-borderc/40 dark:bg-surface-1">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary dark:text-slate-50">{title}</h2>
          {description ? (
            <p className="text-sm text-text-muted dark:text-text-secondary">{description}</p>
          ) : null}
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-full px-6 py-2 text-sm font-semibold sm:w-auto"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            className={cn(
              'w-full rounded-full px-6 py-2 text-sm font-semibold sm:w-auto',
              destructive && 'bg-rose-600 text-white hover:bg-rose-500',
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmDialog;
