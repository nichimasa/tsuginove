import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InviteClient } from './InviteClient'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('*, profiles!rooms_creator_id_fkey(display_name)')
    .eq('invite_token', token)
    .single()

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-2xl mb-2">😔</p>
          <p className="font-bold text-gray-800">招待リンクが無効です</p>
          <p className="text-sm text-gray-500 mt-1">リンクの有効期限が切れているか、存在しません</p>
        </div>
      </div>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()

  // If user is logged in, check if already joined
  if (user) {
    const { data: existing } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      redirect(`/rooms/${room.id}`)
    }
  }

  const { data: participants } = await supabase
    .from('room_participants')
    .select('id')
    .eq('room_id', room.id)

  const participantCount = participants?.length ?? 0

  return (
    <InviteClient
      room={room}
      participantCount={participantCount}
      isLoggedIn={!!user}
      token={token}
    />
  )
}
