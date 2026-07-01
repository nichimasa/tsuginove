import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Room, RoomParticipant, Post } from '@/types'
import { RoomDetailClient } from './RoomDetailClient'

export default async function RoomDetailPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single()

  if (!room) notFound()

  const { data: participants } = await supabase
    .from('room_participants')
    .select('*, profiles(*)')
    .eq('room_id', roomId)
    .order('turn_order', { ascending: true })

  // Check if current user is a participant
  const myParticipation = participants?.find(p => p.user_id === user.id)

  // For completed rooms, anyone with the link (limited/public) can view
  if (!myParticipation && room.visibility === 'private') {
    redirect('/')
  }

  // Get the latest post (for showing whose turn it is)
  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles(*)')
    .eq('room_id', roomId)
    .order('turn_order', { ascending: true })

  return (
    <RoomDetailClient
      room={room as Room}
      participants={(participants ?? []) as RoomParticipant[]}
      posts={(posts ?? []) as Post[]}
      currentUserId={user.id}
    />
  )
}
