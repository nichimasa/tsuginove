import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RoomCard } from '@/components/room/RoomCard'
import { Room } from '@/types'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get rooms where user is participant
  const { data: participations } = await supabase
    .from('room_participants')
    .select(`
      room_id, turn_order, status,
      rooms (*)
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  // Get current turn for each active room
  const activeRoomIds = participations
    ?.filter(p => (p.rooms as unknown as Room)?.status === 'active')
    .map(p => p.room_id) ?? []

  // Get latest post turn_order for each active room
  const currentTurns: Record<string, number> = {}
  if (activeRoomIds.length > 0) {
    const { data: lastPosts } = await supabase
      .from('posts')
      .select('room_id, turn_order')
      .in('room_id', activeRoomIds)
      .order('turn_order', { ascending: false })

    lastPosts?.forEach(post => {
      if (!currentTurns[post.room_id]) {
        currentTurns[post.room_id] = post.turn_order
      }
    })
  }

  // Participant counts per room
  const roomIds = participations?.map(p => p.room_id) ?? []
  const { data: counts } = await supabase
    .from('room_participants')
    .select('room_id')
    .in('room_id', roomIds)

  const countMap: Record<string, number> = {}
  counts?.forEach(c => { countMap[c.room_id] = (countMap[c.room_id] ?? 0) + 1 })

  const rooms = participations?.map(p => {
    const room = p.rooms as unknown as Room
    const lastTurn = currentTurns[p.room_id] ?? 0
    const nextTurn = lastTurn + 1
    const is_my_turn = room?.status === 'active' && p.turn_order === nextTurn && p.status === 'joined'
    return {
      ...room,
      participant_count: countMap[p.room_id] ?? 0,
      is_my_turn,
      _myTurnOrder: p.turn_order,
    }
  }).filter(Boolean) ?? []

  const myTurnRooms = rooms.filter(r => r.is_my_turn)
  const waitingRooms = rooms.filter(r => r.status === 'waiting' && !r.is_my_turn)
  const activeRooms = rooms.filter(r => r.status === 'active' && !r.is_my_turn)
  const completedRooms = rooms.filter(r => r.status === 'completed')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ホーム</h2>
        </div>
        <Link href="/rooms/new">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            ルーム作成
          </Button>
        </Link>
      </div>

      {myTurnRooms.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-indigo-600 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            あなたの番！
          </h3>
          <div className="space-y-3">
            {myTurnRooms.map(room => <RoomCard key={room.id} room={room} />)}
          </div>
        </section>
      )}

      {waitingRooms.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 mb-2">募集中</h3>
          <div className="space-y-3">
            {waitingRooms.map(room => <RoomCard key={room.id} room={room} />)}
          </div>
        </section>
      )}

      {activeRooms.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 mb-2">進行中</h3>
          <div className="space-y-3">
            {activeRooms.map(room => <RoomCard key={room.id} room={room} />)}
          </div>
        </section>
      )}

      {completedRooms.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 mb-2">完成した作品</h3>
          <div className="space-y-3">
            {completedRooms.map(room => <RoomCard key={room.id} room={room} />)}
          </div>
        </section>
      )}

      {rooms.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">📖</div>
          <p className="font-medium">まだルームがありません</p>
          <p className="text-sm mt-1 mb-4">ルームを作成して友達を招待しましょう！</p>
          <Link href="/rooms/new">
            <Button>
              <Plus className="w-4 h-4" />
              ルームを作成する
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
