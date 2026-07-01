'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Room, Post, RoomParticipant, Profile } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { ChevronLeft, Copy, Check, Trophy, Users, BookOpen } from 'lucide-react'

interface Props {
  room: Room
  posts: (Post & { profiles: Profile })[]
  participants: (RoomParticipant & { profiles: Profile })[]
  currentUserId: string
  isCreator: boolean
}

export function CompleteClient({ room, posts, participants, currentUserId, isCreator }: Props) {
  const { toast } = useToast()
  const [showAuthors, setShowAuthors] = useState(true)
  const [copied, setCopied] = useState(false)

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/rooms/${room.id}/complete`

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast('リンクをコピーしました')
    setTimeout(() => setCopied(false), 2000)
  }

  function shareViaLine() {
    const text = `「${room.title}」みんなで作ったリレー小説が完成しました！`
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/rooms/${room.id}`} className="p-1.5 rounded-full hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-bold text-gray-800 truncate">{room.title}</h2>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge color="green">完成</Badge>
            <span className="text-xs text-gray-400">{room.genre}</span>
          </div>
        </div>
      </div>

      {/* Participants summary */}
      <Card padding="sm">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">参加メンバー</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {participants.map(p => (
            <div key={p.id} className="flex items-center gap-1.5">
              <Avatar src={p.profiles?.avatar_url} name={p.profiles?.display_name ?? '?'} size="sm" />
              <span className="text-xs text-gray-600">{p.profiles?.display_name}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Toggle authors */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAuthors(!showAuthors)}
          className="text-xs text-indigo-600 font-medium hover:underline"
        >
          {showAuthors ? '投稿者を隠す' : '投稿者を表示'}
        </button>
      </div>

      {/* Story */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-gray-800">{room.title}</h3>
        </div>
        <div className="space-y-5">
          {posts.map((post, i) => (
            <div key={post.id}>
              {showAuthors && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Avatar src={post.profiles?.avatar_url} name={post.profiles?.display_name ?? '?'} size="sm" />
                  <span className="text-xs text-gray-500">
                    {i + 1}. {post.profiles?.display_name}
                    {post.user_id === currentUserId && <span className="text-indigo-500 ml-1">(あなた)</span>}
                  </span>
                </div>
              )}
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-[15px]">{post.content}</p>
              {i < posts.length - 1 && <hr className="mt-5 border-gray-100" />}
            </div>
          ))}
        </div>
      </Card>

      {/* Share */}
      {room.visibility !== 'private' && (
        <Card>
          <h3 className="font-semibold text-gray-700 mb-3">シェアする</h3>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth size="sm" onClick={copyLink}>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              リンクをコピー
            </Button>
            <Button variant="secondary" fullWidth size="sm" onClick={shareViaLine} className="text-green-600 border-green-200">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              LINEで共有
            </Button>
          </div>
        </Card>
      )}

      {room.visibility === 'private' && isCreator && (
        <Card padding="sm">
          <p className="text-xs text-gray-500 text-center">
            現在「非公開」のためリンク共有できません。
            <Link href={`/rooms/${room.id}`} className="text-indigo-600 ml-1 hover:underline">
              公開設定を変更する
            </Link>
          </p>
        </Card>
      )}
    </div>
  )
}
