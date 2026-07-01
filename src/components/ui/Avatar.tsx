import Image from 'next/image'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
}

function getInitials(name: string) {
  return name.slice(0, 1).toUpperCase()
}

function getColor(name: string) {
  const colors = ['bg-indigo-400', 'bg-purple-400', 'bg-pink-400', 'bg-blue-400', 'bg-teal-400']
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const sizeClass = sizeClasses[size]

  if (src) {
    return (
      <div className={`${sizeClass} relative rounded-full overflow-hidden flex-shrink-0`}>
        <Image src={src} alt={name} fill className="object-cover" />
      </div>
    )
  }

  return (
    <div className={`${sizeClass} ${getColor(name)} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {getInitials(name)}
    </div>
  )
}
