import { useState, useCallback } from "react"

export interface Toast {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: "default" | "destructive"
  open?: boolean
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = { ...toast, id, open: true }
    setToasts((prev) => [...prev, newToast])

    if (toast.variant !== "destructive") {
      setTimeout(() => {
        removeToast(id)
      }, 3000)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (props: Omit<Toast, "id">) => {
      addToast(props)
    },
    [addToast]
  )

  return { toasts, toast, addToast, removeToast }
}
