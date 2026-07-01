'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Users, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'

interface Props {
  room: {
    id: string
    title: string
    genre: string
    max_participants: number
    max_chars: number
    status: string
  }
  participantCount: number
  isLoggedIn: boolean
  token: string
}

export function InviteClient({ room, participantCount, isLoggedIn, token }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    if (!isLoggedIn) {
      // Save the invite URL and redirect to login
      sessionStorage.setItem('pendingInvite', token)
      router.push(`/login?next=/invite/${token}`)
      return
    }

    if (room.status !== 'waiting') {
      toast('このルームは参加を受け付けていません', 'error')
      return
    }

    if (participantCount >= room.max_participants) {
      toast('参加人数が上限に達しています', 'error')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('room_participants').insert({
      room_id: room.id,
      user_id: user.id,
      turn_order: participantCount + 1,
    })

    if (error) {
      toast('参加に失敗しました', 'error')
      setLoading(false)
      return
    }

    // Notify creator
    const { data: roomData } = await supabase.from('rooms').select('creator_id').eq('id', room.id).single()
    if (roomData) {
      await supabase.from('notifications').insert({
        user_id: roomData.creator_id,
        room_id: room.id,
        type: 'invited',
      })
    }

    toast('ルームに参加しました！')
    router.push(`/rooms/${room.id}`)
  }

  const isFull = participantCount >= room.max_participants
  const isActive = room.status === 'active'
  const isCompleted = room.status === 'completed'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-indigo-50 to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-3">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-500 text-sm">リレー小説への招待</p>
        </div>

        <Card padding="lg">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-1">{room.title}</h2>
          <p className="text-center text-indigo-600 text-sm font-medium mb-4">{room.genre}</p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-700 font-bold text-lg">
                <Users className="w-4 h-4" />{participantCount}/{room.max_participants}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">参加人数</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-700 font-bold text-lg">
                <FileText className="w-4 h-4" />{room.max_chars}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">文字数/人</p>
            </div>
          </div>

          {room.status === 'waiting' && (
            <p className="text-center text-sm text-gray-500 mb-4">
              現在{participantCount}/{room.max_participants}人が参加中です。
              {!isFull && `あと${room.max_participants - participantCount}人で開始できます。`}
            </p>
          )}

          {isFull && room.status === 'waiting' && (
            <p className="text-center text-sm text-red-500 mb-4">参加人数が上限に達しています</p>
          )}
          {isActive && (
            <p className="text-center text-sm text-orange-500 mb-4">このルームはすでに進行中です</p>
          )}
          {isCompleted && (
            <p className="text-center text-sm text-green-600 mb-4">この作品は完成しています</p>
          )}

          {room.status === 'waiting' && !isFull ? (
            <Button fullWidth size="lg" loading={loading} onClick={handleJoin}>
              {isLoggedIn ? '参加する' : 'ログインして参加する'}
            </Button>
          ) : (
            <div className="space-y-2">
              {isCompleted && isLoggedIn && (
                <Link href={`/rooms/${room.id}/complete`}>
                  <Button fullWidth variant="secondary">完成作品を読む</Button>
                </Link>
              )}
              <Link href="/">
                <Button fullWidth variant="ghost">ホームへ</Button>
              </Link>
            </div>
          )}
        </Card>

        {!isLoggedIn && (
          <p className="text-center text-sm text-gray-500 mt-4">
            アカウントをお持ちでない方は{' '}
            <Link href={`/register?next=/invite/${token}`} className="text-indigo-600 font-medium hover:underline">
              新規登録
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
