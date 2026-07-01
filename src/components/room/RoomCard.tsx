import Link from 'next/link'
import { Room } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Users, BookOpen, Clock } from 'lucide-react'

interface RoomCardProps {
  room: Room & { participant_count?: number; is_my_turn?: boolean }
}

const statusConfig = {
  waiting: { label: '募集中', color: 'yellow' as const },
  active: { label: '進行中', color: 'indigo' as const },
  completed: { label: '完成', color: 'green' as const },
  cancelled: { label: '中止', color: 'red' as const },
}

export function RoomCard({ room }: RoomCardProps) {
  const { label, color } = statusConfig[room.status]

  return (
    <Link href={`/rooms/${room.id}`}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer ${room.is_my_turn ? 'border-indigo-300 ring-2 ring-indigo-200' : ''}`}>
        {room.is_my_turn && (
          <div className="mb-2 flex items-center gap-1.5 text-indigo-600 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            あなたの番です！
          </div>
        )}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2">{room.title}</h3>
          <Badge color={color} className="flex-shrink-0">{label}</Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />{room.genre}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {room.participant_count ?? '?'}/{room.max_participants}人
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />{room.max_chars}文字
          </span>
        </div>
      </Card>
    </Link>
  )
}
