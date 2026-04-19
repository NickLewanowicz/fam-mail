declare module '@storybook/react' {
  import type { ComponentType, ReactNode } from 'react'

  export interface StoryObj<T = Record<string, unknown>> {
    args?: Partial<T>
    render?: (args: T) => ReactNode
    play?: (context: { canvasElement: HTMLElement }) => Promise<void> | void
  }

  export interface Meta<T = Record<string, unknown>> {
    title: string
    component: ComponentType<T>
    args?: Partial<T>
    argTypes?: Record<string, unknown>
    parameters?: Record<string, unknown>
    tags?: string[]
    decorators?: [(Story: ComponentType, context: unknown) => ReactNode]
  }
}

declare module '@storybook/react-vite' {
  export type { Meta, StoryObj } from '@storybook/react'
}

declare module 'storybook/test' {
  export const within: (canvasElement: HTMLElement) => {
    getByText: (text: string) => HTMLElement
    getByRole: (role: string, options?: Record<string, unknown>) => HTMLElement
    getByTestId: (testId: string) => HTMLElement
  }
  export const userEvent: {
    click: (element: HTMLElement) => Promise<void>
    type: (element: HTMLElement, text: string) => Promise<void>
  }
  export const expect: {
    (actual: unknown): {
      toBeInTheDocument: () => void
      toHaveTextContent: (text: string) => void
      not: {
        toBeInTheDocument: () => void
        toHaveTextContent: (text: string) => void
      }
    }
  }
  export const fn: () => ReturnType<typeof import('vitest').vi.fn>
}
