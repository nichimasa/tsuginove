'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Room, RoomParticipant, Post, Profile } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import {
  ChevronLeft, Users, Copy, Check, BookOpen, Play,
  SkipForward, XCircle, Pen, Trophy, Link as LinkIcon, Lock, Eye
} from 'lucide-react'

interface Props {
  room: Room
  participants: RoomParticipant[]
  posts: Post[]
  currentUserId: string
}

export function RoomDetailClient({ room, participants, posts, currentUserId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [skipLoading, setSkipLoading] = useState<string | null>(null)
  const [cancelModal, setCancelModal] = useState(false)
  const [visibilityModal, setVisibilityModal] = useState(false)
  const [visibilityLoading, setVisibilityLoading] = useState(false)

  const isCreator = room.creator_id === currentUserId
  const lastPost = posts[posts.length - 1]
  const nextTurnOrder = lastPost ? lastPost.turn_order + 1 : 1
  const currentTurnParticipant = participants.find(p => p.turn_order === nextTurnOrder && p.status === 'joined')
  const isMyTurn = currentTurnParticipant?.user_id === currentUserId

  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${room.invite_token}`

  async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    toast('招待リンクをコピーしました')
    setTimeout(() => setCopied(false), 2000)
  }

  function shareViaLine() {
    const text = `「${room.title}」のリレー小説に参加しよう！\n${inviteUrl}`
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(text)}`)
  }

  async function handleStart() {
    if (participants.length < 2) {
      toast('2人以上必要です', 'error')
      return
    }
    setStartLoading(true)
    const supabase = createClient()

    // Assign turn orders based on settings
    let orderedParticipants = [...participants]
    if (room.turn_order === 'random') {
      orderedParticipants = orderedParticipants.sort(() => Math.random() - 0.5)
    }

    // Update turn orders
    await Promise.all(
      orderedParticipants.map((p, i) =>
        supabase.from('room_participants').update({ turn_order: i + 1 }).eq('id', p.id)
      )
    )

    await supabase.from('rooms').update({ status: 'active' }).eq('id', room.id)

    // Notify all participants
    await supabase.from('notifications').insert(
      participants.map(p => ({
        user_id: p.user_id,
        room_id: room.id,
        type: 'room_started',
      }))
    )

    // Notify first participant it's their turn
    const firstP = orderedParticipants[0]
    await supabase.from('notifications').insert({
      user_id: firstP.user_id,
      room_id: room.id,
      type: 'your_turn',
    })

    toast('ルームを開始しました！')
    router.refresh()
    setStartLoading(false)
  }

  async function handleSkip(participantId: string, participantUserId: string) {
    setSkipLoading(participantId)
    const supabase = createClient()
    await supabase.from('room_participants').update({ status: 'skipped' }).eq('id', participantId)

    // Notify skipped user
    await supabase.from('notifications').insert({
      user_id: participantUserId,
      room_id: room.id,
      type: 'skipped',
    })

    // Check if all others have posted
    const remainingParticipants = participants.filter(p => p.id !== participantId && p.status === 'joined')
    if (remainingParticipants.length === 0) {
      // Complete the room
      await supabase.from('rooms').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', room.id)
      await supabase.from('notifications').insert(
        participants.map(p => ({ user_id: p.user_id, room_id: room.id, type: 'room_completed' }))
      )
    } else {
      // Notify next participant
      const nextTurn = (posts.length + 1)
      const nextP = participants.find(p => p.turn_order === nextTurn + 1 && p.status === 'joined')
      if (nextP) {
        await supabase.from('notifications').insert({ user_id: nextP.user_id, room_id: room.id, type: 'your_turn' })
      }
    }

    toast('スキップしました')
    router.refresh()
    setSkipLoading(null)
  }

  async function handleCancel() {
    const supabase = createClient()
    await supabase.from('rooms').update({ status: 'cancelled' }).eq('id', room.id)
    toast('ルームを中止しました')
    router.push('/')
  }

  async function handleVisibilityChange(v: 'private' | 'limited') {
    setVisibilityLoading(true)
    const supabase = createClient()
    await supabase.from('rooms').update({ visibility: v }).eq('id', room.id)
    toast('公開設定を変更しました')
    setVisibilityModal(false)
    setVisibilityLoading(false)
    router.refresh()
  }

  const statusConfig = {
    waiting: { label: '募集中', color: 'yellow' as const },
    active: { label: '進行中', color: 'indigo' as const },
    completed: { label: '完成', color: 'green' as const },
    cancelled: { label: '中止', color: 'red' as const },
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="p-1.5 rounded-full hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-800 truncate">{room.title}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge color={statusConfig[room.status].color}>{statusConfig[room.status].label}</Badge>
            <span className="text-xs text-gray-400">{room.genre}</span>
          </div>
        </div>
      </div>

      {/* My turn banner */}
      {isMyTurn && room.status === 'active' && (
        <div className="bg-indigo-600 rounded-2xl p-4 text-white">
          <p className="font-bold text-lg mb-1">あなたの番です！</p>
          <p className="text-indigo-200 text-sm mb-3">直前の投稿を読んで、続きを書きましょう。</p>
          <Link href={`/rooms/${room.id}/post`}>
            <Button variant="secondary" fullWidth>
              <Pen className="w-4 h-4" />
              投稿する
            </Button>
          </Link>
        </div>
      )}

      {/* Completed banner */}
      {room.status === 'completed' && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5" />
            <p className="font-bold text-lg">作品が完成しました！</p>
          </div>
          <p className="text-indigo-200 text-sm mb-3">みんなで作った物語を読もう</p>
          <Link href={`/rooms/${room.id}/complete`}>
            <Button variant="secondary" fullWidth>
              <BookOpen className="w-4 h-4" />
              完成作品を読む
            </Button>
          </Link>
        </div>
      )}

      {/* Room info */}
      <Card>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-indigo-600">{participants.length}</p>
            <p className="text-xs text-gray-500">/{room.max_participants}人</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-600">{room.max_chars}</p>
            <p className="text-xs text-gray-500">文字/人</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-600">{posts.length}</p>
            <p className="text-xs text-gray-500">/{participants.filter(p => p.status !== 'skipped').length}投稿</p>
          </div>
        </div>
      </Card>

      {/* Participants */}
      <Card>
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Users className="w-4 h-4" />参加メンバー
        </h3>
        <div className="space-y-2">
          {participants.map((p, i) => {
            const profile = p.profiles as unknown as Profile
            const isCurrent = room.status === 'active' && p.turn_order === nextTurnOrder && p.status === 'joined'
            const hasPosted = p.status === 'posted'
            const isSkipped = p.status === 'skipped'
            return (
              <div key={p.id} className={`flex items-center gap-3 p-2 rounded-xl ${isCurrent ? 'bg-indigo-50' : ''}`}>
                <div className="relative">
                  <Avatar src={profile?.avatar_url} name={profile?.display_name ?? '?'} size="sm" />
                  {isCurrent && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {profile?.display_name ?? '不明なユーザー'}
                    {p.user_id === currentUserId && <span className="text-indigo-500 ml-1 text-xs">(あなた)</span>}
                    {p.user_id === room.creator_id && <span className="text-gray-400 ml-1 text-xs">作成者</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {room.status !== 'waiting' && p.turn_order ? `${p.turn_order}番目` : `${i + 1}番目に参加`}
                  </p>
                </div>
                {hasPosted && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
                {isSkipped && <span className="text-xs text-red-400">スキップ</span>}
                {isCurrent && <span className="text-xs text-indigo-600 font-medium">投稿中</span>}
                {isCreator && room.status === 'active' && isCurrent && p.user_id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={skipLoading === p.id}
                    onClick={() => handleSkip(p.id, p.user_id)}
                    className="text-xs text-orange-500"
                  >
                    <SkipForward className="w-3.5 h-3.5" />スキップ
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {room.status === 'waiting' && (
          <p className="text-center text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
            あと{room.max_participants - participants.length}人で開始できます
          </p>
        )}
      </Card>

      {/* Invite section */}
      {room.status === 'waiting' && (
        <Card>
          <h3 className="font-semibold text-gray-700 mb-3">招待する</h3>
          <div className="flex gap-2">
            <button
              onClick={copyInviteLink}
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 text-left"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              <span className="truncate">{inviteUrl}</span>
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="secondary" fullWidth size="sm" onClick={copyInviteLink}>
              <Copy className="w-4 h-4" />リンクをコピー
            </Button>
            <Button variant="secondary" fullWidth size="sm" onClick={shareViaLine} className="text-green-600 border-green-200">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              LINEで共有
            </Button>
          </div>
        </Card>
      )}

      {/* Creator actions */}
      {isCreator && (
        <Card>
          <h3 className="font-semibold text-gray-700 mb-3">管理</h3>
          <div className="space-y-2">
            {room.status === 'waiting' && (
              <Button
                fullWidth
                loading={startLoading}
                onClick={handleStart}
                disabled={participants.length < 2}
              >
                <Play className="w-4 h-4" />
                ルームを開始する {participants.length < 2 && '（2人以上必要）'}
              </Button>
            )}
            {room.status === 'completed' && (
              <Button variant="secondary" fullWidth onClick={() => setVisibilityModal(true)}>
                <LinkIcon className="w-4 h-4" />
                公開設定を変更
              </Button>
            )}
            {(room.status === 'waiting' || room.status === 'active') && (
              <Button variant="danger" fullWidth onClick={() => setCancelModal(true)}>
                <XCircle className="w-4 h-4" />
                ルームを中止
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Cancel modal */}
      <Modal open={cancelModal} onClose={() => setCancelModal(false)} title="ルームを中止しますか？">
        <p className="text-gray-600 text-sm mb-4">中止すると元に戻せません。</p>
        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={() => setCancelModal(false)}>キャンセル</Button>
          <Button variant="danger" fullWidth onClick={handleCancel}>中止する</Button>
        </div>
      </Modal>

      {/* Visibility modal */}
      <Modal open={visibilityModal} onClose={() => setVisibilityModal(false)} title="公開設定">
        <div className="space-y-2">
          <button
            onClick={() => handleVisibilityChange('private')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${room.visibility === 'private' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <Lock className="w-5 h-5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-800">非公開</p>
              <p className="text-xs text-gray-500">参加メンバーのみ閲覧可能</p>
            </div>
          </button>
          <button
            onClick={() => handleVisibilityChange('limited')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${room.visibility === 'limited' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <Eye className="w-5 h-5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-800">限定公開</p>
              <p className="text-xs text-gray-500">URLを知っている人が閲覧可能</p>
            </div>
          </button>
        </div>
        {visibilityLoading && <p className="text-center text-sm text-gray-500 mt-3">変更中...</p>}
      </Modal>
    </div>
  )
}
