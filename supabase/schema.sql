-- ============================================================
-- LIGA VOLLEY MAHASISWA (LVM) — Skema Database Supabase/Postgres
-- Jalankan seluruh file ini di Supabase Dashboard → SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABEL TIM
-- ------------------------------------------------------------
create table if not exists public.teams (
  id             text primary key,
  team_number    text not null unique,
  name           text not null,
  address        text not null default '',
  province       text not null,
  region         text not null check (region in ('Barat', 'Tengah', 'Timur')),
  category       text not null check (category in ('Putra', 'Putri')),
  contact_person text not null default '',
  contact_phone  text not null default '',
  status         text not null default 'Draft' check (status in ('Draft', 'Lengkap', 'Terverifikasi')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists teams_region_category_idx on public.teams (region, category);

-- Migrasi idempotent: `create table if not exists` TIDAK menambah kolom pada DB
-- existing, jadi ALTER di bawah aman dijalankan ulang. '' = tim belum punya pemilik.
alter table public.teams add column if not exists owner_code text not null default '';

-- Satu kode peserta hanya boleh terikat ke satu tim.
create unique index if not exists teams_owner_code_unique
  on public.teams (owner_code)
  where owner_code <> '';

-- ------------------------------------------------------------
-- 2. TABEL PERSONEL / ANGGOTA TIM (20 slot per tim)
-- ------------------------------------------------------------
create table if not exists public.members (
  id           text primary key,
  team_id      text not null references public.teams (id) on delete cascade,
  slot_index   int  not null check (slot_index between 1 and 20),
  reg_number   text not null default '',
  full_name    text not null default '',
  birth_date   text not null default '',          -- YYYY-MM-DD (string, paritas dengan form)
  nim          text not null default '',
  faculty      text not null default '',
  major        text not null default '',
  entry_year   text not null default '',
  team_role    text not null check (team_role in ('Pemain', 'Team Manager', 'Head Coach', 'Assistant Pelatih', 'Utilities')),
  jersey_number text,
  position     text,
  height       integer check (height is null or height between 100 and 250),
  weight       integer check (weight is null or weight between 20 and 200),
  photo_url    text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Satu orang per slot dalam satu tim (FR-02.1)
  constraint members_unique_slot_per_team unique (team_id, slot_index)
);

create index if not exists members_team_id_idx on public.members (team_id);
create index if not exists members_full_name_idx on public.members (full_name) where full_name <> '';

-- FR-02.3: nomor jersey unik antar PEMAIN dalam satu tim yang sama.
-- Official boleh kosong/duplikat; pemain tanpa jersey juga tidak dilarang.
create unique index if not exists members_unique_jersey_per_team
  on public.members (team_id, btrim(jersey_number))
  where team_role = 'Pemain'
    and jersey_number is not null
    and btrim(jersey_number) <> '';

-- ------------------------------------------------------------
-- 3. TRIGGER: KUOTA 6 TIM PER REGIONAL & KATEGORI (FR-01.2 / FR-01.3)
--    Penegakan di level database — tidak bisa dilewati siapa pun.
-- ------------------------------------------------------------
create or replace function public.enforce_team_quota()
returns trigger as $$
declare
  verified_count int;
begin
  -- Kunci transaksi tingkat PostgreSQL (Advisory Lock) berbasis kombinasi region & category
  -- untuk mencegah race condition / TOCTOU saat verifikasi atau pendaftaran serentak di milidetik yang sama
  perform pg_advisory_xact_lock(hashtext(new.region || ':' || new.category));

  -- Saat verifikasi tim (status = 'Terverifikasi'): pastikan tidak melebihi 6 tim terverifikasi
  if new.status = 'Terverifikasi' then
    select count(*) into verified_count
    from public.teams
    where region = new.region and category = new.category and status = 'Terverifikasi' and id != new.id;

    if verified_count >= 6 then
      raise exception 'Kuota 6 tim terverifikasi untuk Regional % (%) sudah penuh.', new.region, new.category
        using errcode = 'check_violation';
    end if;
  end if;

  -- Saat pendaftaran baru: ditutup jika sudah ada 6 tim terverifikasi di regional & kategori tersebut
  if TG_OP = 'INSERT' then
    select count(*) into verified_count
    from public.teams
    where region = new.region and category = new.category and status = 'Terverifikasi';

    if verified_count >= 6 then
      raise exception 'Pendaftaran ditutup: Kuota 6 tim resmi untuk Regional % (%) sudah terpenuhi oleh tim yang terverifikasi.', new.region, new.category
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists teams_quota_check on public.teams;
create trigger teams_quota_check
  before insert or update of status on public.teams
  for each row execute function public.enforce_team_quota();

-- ------------------------------------------------------------
-- 4. TRIGGER: updated_at OTOMATIS
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists teams_touch_updated_at on public.teams;
create trigger teams_touch_updated_at
  before update on public.teams
  for each row execute function public.touch_updated_at();

drop trigger if exists members_touch_updated_at on public.members;
create trigger members_touch_updated_at
  before update on public.members
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 1b. TABEL AKUN AKSES (RBAC §15: kode acak per nama kampus)
-- ------------------------------------------------------------
create table if not exists public.access_accounts (
  id          text primary key,
  code_hash   text not null unique,
  code_enc    text not null,
  role        text not null check (role in ('panpel','mojisport','peserta')),
  label       text not null,
  team_id     text references public.teams(id) on delete set null,
  revoked     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists access_accounts_role_idx on public.access_accounts (role);
create index if not exists access_accounts_team_id_idx on public.access_accounts (team_id) where team_id is not null;

drop trigger if exists access_accounts_touch_updated_at on public.access_accounts;
create trigger access_accounts_touch_updated_at
  before update on public.access_accounts
  for each row execute function public.touch_updated_at();

alter table public.access_accounts enable row level security;

-- ------------------------------------------------------------
-- 5. KEAMANAN (RLS)
--    Aplikasi mengakses database lewat API routes Next.js memakai
--    SERVICE ROLE KEY (melewati RLS). Dengan RLS aktif + tanpa policy
--    publik, kunci anon tidak bisa membaca/menulis apa pun langsung
--    dari browser — semua akses wajib lewat server.
-- ------------------------------------------------------------
alter table public.teams   enable row level security;
alter table public.members enable row level security;

-- ------------------------------------------------------------
-- 6. STORAGE (Supabase Storage Bucket & Kebijakan Akses)
--    Bucket 'player-photos' dibuat publik agar foto jersey pemain
--    dapat ditampilkan langsung pada antarmuka web.
-- ------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.schemata where schema_name = 'storage'
  ) then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'player-photos',
      'player-photos',
      true,
      5242880,
      array['image/jpeg', 'image/png', 'image/webp']
    )
    on conflict (id) do update set
      public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

    if not exists (
      select 1 from pg_policies 
      where schemaname = 'storage' 
        and tablename = 'objects' 
        and policyname = 'Public Access player-photos'
    ) then
      create policy "Public Access player-photos"
      on storage.objects for select
      using (bucket_id = 'player-photos');
    end if;
  end if;
end $$;

-- ============================================================
-- SELESAI. Verifikasi cepat:
--   select * from public.teams limit 5;
--   select count(*) from public.members;
-- ============================================================

