import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RoomCard } from '@/components/room/RoomCard'
import { Room } from '@/types'
import { LogoutButton } from './LogoutButton'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: participations } = await supabase
    .from('room_participants')
    .select('room_id, rooms(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const rooms = participations?.map(p => p.rooms as unknown as Room).filter(Boolean) ?? []
  const completedRooms = rooms.filter(r => r.status === 'completed')
  const createdRooms = rooms.filter(r => r.creator_id === user.id)

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">マイページ</h2>

      <Card>
        <div className="flex items-center gap-4">
          <Avatar src={profile?.avatar_url} name={profile?.display_name ?? '?'} size="lg" />
          <div>
            <h3 className="text-lg font-bold text-gray-800">{profile?.display_name}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge color="indigo">参加 {rooms.length}ルーム</Badge>
              <Badge color="green">完成 {completedRooms.length}作品</Badge>
            </div>
          </div>
        </div>
      </Card>

      {completedRooms.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 mb-2">完成した作品</h3>
          <div className="space-y-3">
            {completedRooms.map(r => <RoomCard key={r.id} room={r} />)}
          </div>
        </section>
      )}

      {createdRooms.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 mb-2">作成したルーム</h3>
          <div className="space-y-3">
            {createdRooms.map(r => <RoomCard key={r.id} room={r} />)}
          </div>
        </section>
      )}

      <LogoutButton />
    </div>
  )
}
