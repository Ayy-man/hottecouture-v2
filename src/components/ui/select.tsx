"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectContextValue {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

function useSelectContext() {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error("Select components must be used within a Select")
  }
  return context
}

const Select = ({
  value,
  onValueChange,
  children,
  defaultValue
}: {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  defaultValue?: string
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const [open, setOpen] = React.useState(false)

  const currentValue = value !== undefined ? value : internalValue
  const handleChange = onValueChange || setInternalValue

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleChange,
        open,
        setOpen
      }}
    >
      {children}
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    placeholder?: string
  }
>(({ className, children, placeholder, ...props }, ref) => {
  const { value, open, setOpen } = useSelectContext()

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children || (value ? value : <span className="text-muted-foreground">{placeholder}</span>)}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value } = useSelectContext()

  return value || <span className="text-muted-foreground">{placeholder}</span>
}

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useSelectContext()
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, setOpen])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
      <div
        ref={contentRef}
        className={cn(
          "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          "absolute top-full mt-1",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
        ref={contentRef}
      >
        <div className="p-1">
          {children}
        </div>
      </div>
    </div>
  )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
  }
>(({ className, children, value, ...props }, ref) => {
  const { onValueChange, setOpen } = useSelectContext()

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground hover:bg-accent cursor-pointer",
        className
      )}
      onClick={() => {
        onValueChange?.(value)
        setOpen(false)
      }}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {/* You can add a check icon here if needed */}
      </span>
      {children}
    </div>
  )
})
SelectItem.displayName = "SelectItem"

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
}