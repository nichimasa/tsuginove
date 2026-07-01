-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  genre TEXT NOT NULL DEFAULT 'その他',
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 4,
  max_chars INTEGER NOT NULL DEFAULT 200,
  turn_order TEXT NOT NULL DEFAULT 'join_order', -- 'join_order', 'random', 'manual'
  visibility TEXT NOT NULL DEFAULT 'private', -- 'private', 'limited', 'public'
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'active', 'completed', 'cancelled'
  invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Room participants
CREATE TABLE IF NOT EXISTS public.room_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  turn_order INTEGER,
  status TEXT NOT NULL DEFAULT 'joined', -- 'joined', 'posted', 'skipped'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Posts
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  turn_order INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'your_turn', 'room_started', 'room_completed', 'invited', 'skipped'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, only self can update
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Rooms: creator can manage, participants can read
CREATE POLICY "rooms_select" ON public.rooms FOR SELECT USING (
  creator_id = auth.uid()
  OR id IN (SELECT room_id FROM public.room_participants WHERE user_id = auth.uid())
  OR (visibility = 'limited' OR visibility = 'public')
);
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE USING (creator_id = auth.uid());

-- Room participants: participants and creator can read
CREATE POLICY "participants_select" ON public.room_participants FOR SELECT USING (
  user_id = auth.uid()
  OR room_id IN (SELECT id FROM public.rooms WHERE creator_id = auth.uid())
  OR room_id IN (SELECT room_id FROM public.room_participants WHERE user_id = auth.uid())
);
CREATE POLICY "participants_insert" ON public.room_participants FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "participants_update" ON public.room_participants FOR UPDATE USING (
  room_id IN (SELECT id FROM public.rooms WHERE creator_id = auth.uid())
  OR user_id = auth.uid()
);

-- Posts: restrict to participants; completed rooms or own posts visible
CREATE POLICY "posts_select" ON public.posts FOR SELECT USING (
  room_id IN (
    SELECT id FROM public.rooms WHERE status = 'completed'
    AND (
      creator_id = auth.uid()
      OR id IN (SELECT room_id FROM public.room_participants WHERE user_id = auth.uid())
      OR visibility IN ('limited', 'public')
    )
  )
  OR (
    user_id = auth.uid()
    AND room_id IN (SELECT room_id FROM public.room_participants WHERE user_id = auth.uid())
  )
  OR (
    room_id IN (SELECT room_id FROM public.room_participants WHERE user_id = auth.uid())
    AND turn_order = (
      SELECT MAX(turn_order) FROM public.posts p2
      WHERE p2.room_id = posts.room_id
    )
  )
);
CREATE POLICY "posts_insert" ON public.posts FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND room_id IN (SELECT room_id FROM public.room_participants WHERE user_id = auth.uid())
);

-- Notifications: only own
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
