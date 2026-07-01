import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Bell, BookOpen, Play, Trophy, UserPlus, SkipForward } from 'lucide-react'
import { Notification } from '@/types'

const typeConfig: Record<Notification['type'], { label: string; icon: React.ReactNode; color: string }> = {
  your_turn: { label: 'あなたの番になりました！', icon: <Play className="w-4 h-4" />, color: 'text-indigo-600' },
  room_started: { label: 'ルームが開始されました', icon: <BookOpen className="w-4 h-4" />, color: 'text-green-600' },
  room_completed: { label: '作品が完成しました！', icon: <Trophy className="w-4 h-4" />, color: 'text-yellow-600' },
  invited: { label: '招待が届きました', icon: <UserPlus className="w-4 h-4" />, color: 'text-purple-600' },
  skipped: { label: 'スキップされました', icon: <SkipForward className="w-4 h-4" />, color: 'text-orange-600' },
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, rooms(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Mark all as read
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">通知</h2>

      {!notifications?.length ? (
        <div className="text-center py-16 text-gray-500">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>通知はありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const config = typeConfig[n.type as Notification['type']]
            const room = n.rooms as { title: string } | null
            return (
              <Link key={n.id} href={n.room_id ? `/rooms/${n.room_id}` : '#'}>
                <Card className={`hover:shadow-md transition-shadow ${!n.is_read ? 'border-indigo-200 bg-indigo-50/30' : ''}`} padding="sm">
                  <div className="flex items-start gap-3 px-1 py-1">
                    <div className={`${config.color} mt-0.5`}>{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{config.label}</p>
                      {room && <p className="text-xs text-gray-500 mt-0.5 truncate">「{room.title}」</p>}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(n.created_at).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1" />}
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
