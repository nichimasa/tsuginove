export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export type RoomStatus = 'waiting' | 'active' | 'completed' | 'cancelled'
export type RoomVisibility = 'private' | 'limited' | 'public'
export type TurnOrder = 'join_order' | 'random' | 'manual'

export type Room = {
  id: string
  title: string
  genre: string
  creator_id: string
  max_participants: number
  max_chars: number
  turn_order: TurnOrder
  visibility: RoomVisibility
  status: RoomStatus
  invite_token: string
  created_at: string
  completed_at: string | null
}

export type RoomParticipant = {
  id: string
  room_id: string
  user_id: string
  turn_order: number | null
  status: 'joined' | 'posted' | 'skipped'
  joined_at: string
  profiles?: Profile
}

export type Post = {
  id: string
  room_id: string
  user_id: string
  turn_order: number
  content: string
  created_at: string
  profiles?: Profile
}

export type Notification = {
  id: string
  user_id: string
  room_id: string | null
  type: 'your_turn' | 'room_started' | 'room_completed' | 'invited' | 'skipped'
  is_read: boolean
  created_at: string
  rooms?: Pick<Room, 'title'>
}

export const GENRES = [
  '恋愛', 'ホラー', 'ミステリー', 'ファンタジー',
  'コメディ', '青春', 'SF', 'カオス', 'その他'
] as const

export const MAX_CHARS_OPTIONS = [100, 200, 300, 400] as const
