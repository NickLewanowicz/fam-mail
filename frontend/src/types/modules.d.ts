declare module 'lodash' {
  type DebouncedFn<T extends (...args: never[]) => void> = T & {
    cancel: () => void
    flush: () => void
  }

  export function debounce<T extends (...args: never[]) => void>(
    func: T,
    wait?: number,
    options?: {
      leading?: boolean
      maxWait?: number
      trailing?: boolean
    }
  ): DebouncedFn<T>
}

declare module '@radix-ui/react-dialog' {
  import type { ComponentType, ReactNode } from 'react'

  interface DialogProps {
    children?: ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    modal?: boolean
  }

  interface DialogContentProps {
    children?: ReactNode
    className?: string
    onInteractOutside?: (event: Event) => void
    onEscapeKeyDown?: (event: KeyboardEvent) => void
    forceMount?: boolean
  }

  export const Root: ComponentType<DialogProps>
  export const Trigger: ComponentType<{ children?: ReactNode; asChild?: boolean; className?: string }>
  export const Portal: ComponentType<{ children?: ReactNode; forceMount?: boolean }>
  export const Overlay: ComponentType<{ className?: string; forceMount?: boolean }>
  export const Content: ComponentType<DialogContentProps>
  export const Title: ComponentType<{ children?: ReactNode; className?: string }>
  export const Description: ComponentType<{ children?: ReactNode; className?: string }>
  export const Close: ComponentType<{ children?: ReactNode; asChild?: boolean; className?: string }>
}

declare module 'lucide-react' {
  import type { ComponentType, SVGProps } from 'react'

  interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: number | string
    color?: string
    strokeWidth?: number | string
  }

  export const X: ComponentType<LucideProps>
  export const ChevronDown: ComponentType<LucideProps>
  export const ChevronUp: ComponentType<LucideProps>
  export const ChevronLeft: ComponentType<LucideProps>
  export const ChevronRight: ComponentType<LucideProps>
}
