create table if not exists public.users (
  id uuid primary key,
  login text not null unique,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create table if not exists public.rooms (
  id uuid primary key,
  code text unique,
  name text not null,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.rooms add column if not exists code text;
create unique index if not exists rooms_code_unique_idx on public.rooms(code);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'user')),
  invited_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.room_menus (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  active_order jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_menus enable row level security;

notify pgrst, 'reload schema';

-- Backend uses service role/secret key, so RLS policies are optional for these server-side operations.
