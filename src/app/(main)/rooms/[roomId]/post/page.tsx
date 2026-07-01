'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Room, RoomParticipant, Post } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { ChevronLeft, AlertCircle } from 'lucide-react'

export default function PostPage() {
  const params = useParams()
  const roomId = params.roomId as string
  const router = useRouter()
  const { toast } = useToast()

  const [room, setRoom] = useState<Room | null>(null)
  const [myParticipation, setMyParticipation] = useState<RoomParticipant | null>(null)
  const [lastPost, setLastPost] = useState<(Post & { profiles?: { display_name: string } }) | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [canPost, setCanPost] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single()
      if (!roomData) { router.push('/'); return }
      setRoom(roomData)

      const { data: myP } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single()
      setMyParticipation(myP)

      // Get last post
      const { data: posts } = await supabase
        .from('posts')
        .select('*, profiles(display_name)')
        .eq('room_id', roomId)
        .order('turn_order', { ascending: false })
        .limit(1)

      const last = posts?.[0] ?? null
      setLastPost(last)

      // Check if it's my turn
      const nextTurnOrder = last ? last.turn_order + 1 : 1
      if (myP && myP.turn_order === nextTurnOrder && myP.status === 'joined' && roomData.status === 'active') {
        setCanPost(true)
      }

      setPageLoading(false)
    }
    load()
  }, [roomId, router])

  async function handlePost() {
    if (!content.trim()) { toast('文章を入力してください', 'error'); return }
    if (!room || !myParticipation) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const nextTurnOrder = lastPost ? lastPost.turn_order + 1 : 1

    const { error } = await supabase.from('posts').insert({
      room_id: roomId,
      user_id: user.id,
      turn_order: nextTurnOrder,
      content: content.trim(),
    })

    if (error) {
      toast('投稿に失敗しました', 'error')
      setLoading(false)
      return
    }

    // Mark as posted
    await supabase.from('room_participants').update({ status: 'posted' }).eq('id', myParticipation.id)

    // Get all participants to determine next
    const { data: allParticipants } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId)
      .order('turn_order', { ascending: true })

    const postedCount = (allParticipants?.filter(p => p.status === 'posted' || p.id === myParticipation.id).length ?? 0)
    const totalActive = allParticipants?.filter(p => p.status !== 'skipped').length ?? 0

    if (postedCount >= totalActive) {
      // Complete the room
      await supabase.from('rooms').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', roomId)
      await supabase.from('notifications').insert(
        (allParticipants ?? []).map(p => ({ user_id: p.user_id, room_id: roomId, type: 'room_completed' }))
      )
      toast('全員が投稿しました！作品が完成しました！')
      router.push(`/rooms/${roomId}/complete`)
    } else {
      // Notify next participant
      const nextParticipant = allParticipants?.find(
        p => p.turn_order === nextTurnOrder + 1 && p.status === 'joined'
      )
      if (nextParticipant) {
        await supabase.from('notifications').insert({
          user_id: nextParticipant.user_id,
          room_id: roomId,
          type: 'your_turn',
        })
      }
      toast('投稿しました！')
      router.push(`/rooms/${roomId}`)
    }
    setLoading(false)
  }

  if (pageLoading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">読み込み中...</div>
  }

  if (!canPost) {
    return (
      <div className="space-y-4">
        <Link href={`/rooms/${roomId}`} className="flex items-center gap-1 text-gray-600">
          <ChevronLeft className="w-5 h-5" />戻る
        </Link>
        <Card>
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-orange-400" />
            <p className="font-medium">今はあなたの番ではありません</p>
            <p className="text-sm mt-1">他のメンバーの投稿を待っています</p>
          </div>
        </Card>
      </div>
    )
  }

  const remaining = (room?.max_chars ?? 200) - content.length
  const isOver = remaining < 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/rooms/${roomId}`} className="p-1.5 rounded-full hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{room?.title}</h2>
          <p className="text-xs text-indigo-600 font-medium">あなたの番です</p>
        </div>
      </div>

      <Card className="border-indigo-100 bg-indigo-50">
        <div className="flex items-start gap-1.5 text-indigo-700 text-xs font-medium mb-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          過去の全文は見られません。直前の投稿だけを読んで続きを書きます。
        </div>
      </Card>

      {lastPost ? (
        <Card>
          <p className="text-xs text-gray-500 mb-2">
            直前の投稿 — {(lastPost.profiles as unknown as { display_name: string })?.display_name ?? '不明'}
          </p>
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{lastPost.content}</p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-gray-500 text-center py-2">あなたが最初の投稿者です。物語を始めましょう！</p>
        </Card>
      )}

      <Card>
        <Textarea
          label="続きを書く"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={lastPost ? 'この続きを書いてください...' : '物語を始めましょう...'}
          rows={6}
          maxLength={room?.max_chars}
        />
        <div className="flex items-center justify-between mt-2">
          <p className={`text-sm font-medium ${isOver ? 'text-red-500' : remaining < 20 ? 'text-orange-500' : 'text-gray-400'}`}>
            残り {remaining} 文字
          </p>
        </div>
      </Card>

      <Button fullWidth size="lg" loading={loading} onClick={handlePost} disabled={isOver || !content.trim()}>
        投稿する
      </Button>
    </div>
  )
}
