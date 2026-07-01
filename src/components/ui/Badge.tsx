import { HTMLAttributes } from 'react'

type Color = 'indigo' | 'green' | 'yellow' | 'red' | 'gray' | 'purple'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: Color
}

const colorClasses: Record<Color, string> = {
  indigo: 'bg-indigo-100 text-indigo-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-600',
  purple: 'bg-purple-100 text-purple-700',
}

export function Badge({ color = 'gray', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
