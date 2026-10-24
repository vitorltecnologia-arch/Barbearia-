-- Barber Pro SaaS core: PostgreSQL / Supabase
create extension if not exists pgcrypto;
create type public.member_role as enum ('owner','admin','barber','receptionist');
create type public.appointment_status as enum ('pending','confirmed','completed','cancelled','no_show');

create table public.barbershops (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(trim(name)) between 2 and 120),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 timezone text not null default 'America/Sao_Paulo',
 created_at timestamptz not null default now()
);
create table public.memberships (
 barbershop_id uuid not null references public.barbershops(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role public.member_role not null default 'owner',
 created_at timestamptz not null default now(),
 primary key(barbershop_id,user_id)
);
create index memberships_user_idx on public.memberships(user_id);
create table public.staff (
 id uuid primary key default gen_random_uuid(),
 barbershop_id uuid not null references public.barbershops(id) on delete cascade,
 display_name text not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(id,barbershop_id)
);
create table public.services (
 id uuid primary key default gen_random_uuid(),
 barbershop_id uuid not null references public.barbershops(id) on delete cascade,
 name text not null,
 description text,
 duration_minutes int not null check(duration_minutes between 5 and 480),
 price_cents int not null check(price_cents >= 0),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(id,barbershop_id)
);
create table public.customers (
 id uuid primary key default gen_random_uuid(),
 barbershop_id uuid not null references public.barbershops(id) on delete cascade,
 full_name text not null,
 phone text,
 email text,
 created_at timestamptz not null default now(),
 unique(id,barbershop_id)
);
create table public.appointments (
 id uuid primary key default gen_random_uuid(),
 barbershop_id uuid not null references public.barbershops(id) on delete cascade,
 staff_id uuid not null,
 service_id uuid not null,
 customer_id uuid,
 customer_name text not null,
 customer_phone text,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 status public.appointment_status not null default 'confirmed',
 notes text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 check(ends_at > starts_at),
 foreign key(staff_id,barbershop_id) references public.staff(id,barbershop_id),
 foreign key(service_id,barbershop_id) references public.services(id,barbershop_id),
 foreign key(customer_id,barbershop_id) references public.customers(id,barbershop_id)
);
create index appointments_shop_start_idx on public.appointments(barbershop_id,starts_at);
create index appointments_staff_start_idx on public.appointments(staff_id,starts_at) where status in ('pending','confirmed');

-- Exclusion constraint prevents overlapping active appointments for the same barber.
create extension if not exists btree_gist;
alter table public.appointments add constraint appointments_no_staff_overlap
 exclude using gist (
   staff_id with =,
   tstzrange(starts_at, ends_at, '[)') with &&
 ) where (status in ('pending','confirmed'));

create or replace function public.is_member(p_shop uuid)
returns boolean language sql stable security definer
set search_path = public
as $$ select exists (
 select 1 from public.memberships m
 where m.barbershop_id=p_shop and m.user_id=(select auth.uid())
); $$;
revoke all on function public.is_member(uuid) from public;
grant execute on function public.is_member(uuid) to authenticated;

-- Creates the shop and owner membership atomically. Authenticated users only.
create or replace function public.create_barbershop(p_name text,p_slug text)
returns uuid language plpgsql security definer
set search_path = public
as $$
declare v_shop uuid;
begin
 if auth.uid() is null then raise exception 'É necessário entrar na conta.'; end if;
 if char_length(trim(p_name)) < 2 then raise exception 'Informe um nome válido.'; end if;
 if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Identificador inválido.'; end if;
 insert into public.barbershops(name,slug) values(trim(p_name),p_slug) returning id into v_shop;
 insert into public.memberships(barbershop_id,user_id,role) values(v_shop,auth.uid(),'owner');
 return v_shop;
end; $$;
revoke all on function public.create_barbershop(text,text) from public, anon;
grant execute on function public.create_barbershop(text,text) to authenticated;

-- Creates an appointment only for a shop the caller belongs to. Database exclusion
-- constraint is the final concurrency guard against overlapping reservations.
create or replace function public.create_appointment(
 p_shop uuid,p_staff uuid,p_service uuid,p_customer_name text,p_customer_phone text,
 p_starts_at timestamptz,p_notes text default null
) returns uuid language plpgsql security invoker
set search_path = public
as $$
declare v_id uuid; v_duration int; v_end timestamptz;
begin
 if auth.uid() is null then raise exception 'É necessário entrar na conta.'; end if;
 if not public.is_member(p_shop) then raise exception 'Sem permissão para esta barbearia.'; end if;
 select duration_minutes into v_duration from public.services
  where id=p_service and barbershop_id=p_shop and active=true;
 if v_duration is null then raise exception 'Serviço indisponível.'; end if;
 if not exists(select 1 from public.staff where id=p_staff and barbershop_id=p_shop and active=true) then
  raise exception 'Profissional indisponível.';
 end if;
 if p_starts_at <= now() then raise exception 'Escolha um horário futuro.'; end if;
 v_end := p_starts_at + make_interval(mins => v_duration);
 insert into public.appointments(barbershop_id,staff_id,service_id,customer_name,customer_phone,starts_at,ends_at,notes,created_by)
 values(p_shop,p_staff,p_service,trim(p_customer_name),nullif(trim(p_customer_phone),''),p_starts_at,v_end,p_notes,auth.uid())
 returning id into v_id;
 return v_id;
exception when exclusion_violation then
 raise exception 'Este horário acabou de ser reservado. Escolha outro horário.';
end; $$;
grant execute on function public.create_appointment(uuid,uuid,uuid,text,text,timestamptz,text) to authenticated;

alter table public.barbershops enable row level security;
alter table public.memberships enable row level security;
alter table public.staff enable row level security;
alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;

create policy "members can view own shops" on public.barbershops
 for select to authenticated using (public.is_member(id));
create policy "members can view own memberships" on public.memberships
 for select to authenticated using (user_id=(select auth.uid()) or public.is_member(barbershop_id));
create policy "members can view staff" on public.staff
 for select to authenticated using (public.is_member(barbershop_id));
create policy "admins manage staff" on public.staff
 for all to authenticated using (exists(select 1 from public.memberships m where m.barbershop_id=staff.barbershop_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')))
 with check (exists(select 1 from public.memberships m where m.barbershop_id=staff.barbershop_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
create policy "members view services" on public.services
 for select to authenticated using (public.is_member(barbershop_id));
create policy "admins manage services" on public.services
 for all to authenticated using (exists(select 1 from public.memberships m where m.barbershop_id=services.barbershop_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')))
 with check (exists(select 1 from public.memberships m where m.barbershop_id=services.barbershop_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
create policy "members view customers" on public.customers
 for select to authenticated using (public.is_member(barbershop_id));
create policy "members create customers" on public.customers
 for insert to authenticated with check (public.is_member(barbershop_id));
create policy "members view appointments" on public.appointments
 for select to authenticated using (public.is_member(barbershop_id));
create policy "members create appointments" on public.appointments
 for insert to authenticated with check (public.is_member(barbershop_id) and created_by=(select auth.uid()));
create policy "admins update appointments" on public.appointments
 for update to authenticated using (exists(select 1 from public.memberships m where m.barbershop_id=appointments.barbershop_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin','receptionist')))
 with check (public.is_member(barbershop_id));
create policy "admins delete appointments" on public.appointments
 for delete to authenticated using (exists(select 1 from public.memberships m where m.barbershop_id=appointments.barbershop_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));

-- Important: this initial migration models staff/services/customers/appointments.
-- Add working hours, exceptions, audit log, plan/subscription and public booking tokens
-- before production. Public anonymous booking requires a separate restricted RPC/flow.
