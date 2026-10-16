import type { ButtonHTMLAttributes, ReactNode } from 'react'

const variants = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent shadow-sm',
  secondary:
    'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-main)] hover:bg-[var(--bg-elevated)]',
  ghost:
    'bg-transparent text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)]',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-transparent',
  purple:
    'bg-purple-600 text-white hover:bg-purple-700 border-transparent shadow-sm',
  cyan: 'bg-cyan-600 text-white hover:bg-cyan-700 border-transparent shadow-sm',
} as const

const sizes = {
  sm: 'h-8 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
