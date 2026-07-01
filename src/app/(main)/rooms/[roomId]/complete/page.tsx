import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Room, Post, RoomParticipant, Profile } from '@/types'
import { CompleteClient } from './CompleteClient'

export default async function CompletePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single()
  if (!room) notFound()
  if (room.status !== 'completed') redirect(`/rooms/${roomId}`)

  const { data: participants } = await supabase
    .from('room_participants')
    .select('*, profiles(*)')
    .eq('room_id', roomId)
    .order('turn_order', { ascending: true })

  // Check access
  const isParticipant = participants?.some(p => p.user_id === user.id)
  if (!isParticipant && room.visibility === 'private') redirect('/')

  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles(*)')
    .eq('room_id', roomId)
    .order('turn_order', { ascending: true })

  return (
    <CompleteClient
      room={room as Room}
      posts={(posts ?? []) as (Post & { profiles: Profile })[]}
      participants={(participants ?? []) as (RoomParticipant & { profiles: Profile })[]}
      currentUserId={user.id}
      isCreator={room.creator_id === user.id}
    />
  )
}
