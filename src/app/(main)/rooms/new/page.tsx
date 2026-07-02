'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { GENRES, MAX_CHARS_OPTIONS } from '@/types'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewRoomPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    genre: 'その他',
    max_participants: 4,
    max_chars: 200,
    turn_order: 'join_order' as 'join_order' | 'random',
    visibility: 'private' as 'private' | 'limited',
  })

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast('タイトルを入力してください', 'error')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast('ログインしてください', 'error'); setLoading(false); return }

    const { data: room, error } = await supabase
      .from('rooms')
      .insert({ ...form, creator_id: user.id })
      .select()
      .single()

    if (error || !room) {
      console.error('Room creation error:', JSON.stringify(error))
      toast(`ルームの作成に失敗しました: ${error?.message ?? '不明なエラー'}`, 'error')
      setLoading(false)
      return
    }

    // Join as first participant
    await supabase.from('room_participants').insert({
      room_id: room.id,
      user_id: user.id,
      turn_order: 1,
    })

    toast('ルームを作成しました！')
    router.push(`/rooms/${room.id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="p-1.5 rounded-full hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h2 className="text-xl font-bold text-gray-800">ルームを作成</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <div className="space-y-4">
            <Input
              label="タイトル"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder="例：消えた猫、宇宙のコンビニ"
              required
              maxLength={50}
            />

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">ジャンル</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => update('genre', g)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                      ${form.genre === g
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                参加人数：<span className="text-indigo-600 font-bold">{form.max_participants}人</span>
              </label>
              <input
                type="range"
                min={2}
                max={10}
                value={form.max_participants}
                onChange={e => update('max_participants', Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>2人</span><span>10人</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">1人あたりの文字数</label>
              <div className="grid grid-cols-4 gap-2">
                {MAX_CHARS_OPTIONS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update('max_chars', n)}
                    className={`py-2 rounded-xl text-sm font-medium border transition-colors
                      ${form.max_chars === n
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                  >
                    {n}字
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">投稿順</label>
              <div className="grid grid-cols-2 gap-2">
                {([['join_order', '参加順'], ['random', 'ランダム']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => update('turn_order', v)}
                    className={`py-2 rounded-xl text-sm font-medium border transition-colors
                      ${form.turn_order === v
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">公開範囲</label>
              <div className="grid grid-cols-2 gap-2">
                {([['private', '非公開'], ['limited', '限定公開']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => update('visibility', v)}
                    className={`py-2 rounded-xl text-sm font-medium border transition-colors
                      ${form.visibility === v
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Button type="submit" fullWidth size="lg" loading={loading}>
          ルームを作成する
        </Button>
      </form>
    </div>
  )
}
