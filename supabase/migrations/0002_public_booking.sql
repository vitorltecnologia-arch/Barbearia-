-- Barber Pro: agendamento público com acesso restrito via funções RPC.
-- Aplicar como NOVA migração no SQL Editor do Supabase; não reaplicar 0001_core.sql.
create or replace function public.get_public_booking_data(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_shop public.barbershops%rowtype; v_result jsonb;
begin
 select * into v_shop from public.barbershops where slug = lower(trim(p_slug));
 if not found then raise exception 'Barbearia não encontrada.'; end if;
 select jsonb_build_object(
   'shop', jsonb_build_object('id',v_shop.id,'name',v_shop.name,'slug',v_shop.slug,'timezone',v_shop.timezone),
   'staff', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.display_name) order by s.display_name) from public.staff s where s.barbershop_id=v_shop.id and s.active=true),'[]'::jsonb),
   'services', coalesce((select jsonb_agg(jsonb_build_object('id',sv.id,'name',sv.name,'description',sv.description,'duration_minutes',sv.duration_minutes,'price_cents',sv.price_cents) order by sv.name) from public.services sv where sv.barbershop_id=v_shop.id and sv.active=true),'[]'::jsonb)
 ) into v_result;
 return v_result;
end; $$;

create or replace function public.get_public_busy_times(p_slug text, p_staff uuid, p_from timestamptz, p_until timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_shop uuid; v_result jsonb;
begin
 if p_until <= p_from or p_until-p_from > interval '3 days' then raise exception 'Intervalo de consulta inválido.'; end if;
 select id into v_shop from public.barbershops where slug=lower(trim(p_slug));
 if v_shop is null then raise exception 'Barbearia não encontrada.'; end if;
 if not exists(select 1 from public.staff where id=p_staff and barbershop_id=v_shop and active=true) then raise exception 'Profissional indisponível.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('starts_at',a.starts_at,'ends_at',a.ends_at)),'[]'::jsonb) into v_result
 from public.appointments a
 where a.barbershop_id=v_shop and a.staff_id=p_staff and a.status in ('pending','confirmed')
 and a.starts_at < p_until and a.ends_at > p_from;
 return v_result;
end; $$;

create or replace function public.create_public_appointment(
 p_slug text, p_staff uuid, p_service uuid, p_customer_name text, p_customer_phone text, p_starts_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_shop uuid; v_duration int; v_end timestamptz; v_id uuid;
begin
 select id into v_shop from public.barbershops where slug=lower(trim(p_slug));
 if v_shop is null then raise exception 'Barbearia não encontrada.'; end if;
 if char_length(trim(coalesce(p_customer_name,''))) < 2 or char_length(trim(p_customer_name)) > 120 then raise exception 'Informe seu nome completo.'; end if;
 if char_length(regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g')) < 10 then raise exception 'Informe um telefone válido com DDD.'; end if;
 if p_starts_at is null or p_starts_at <= now() then raise exception 'Escolha um horário futuro.'; end if;
 if p_starts_at > now() + interval '180 days' then raise exception 'Escolha uma data nos próximos seis meses.'; end if;
 if not exists(select 1 from public.staff where id=p_staff and barbershop_id=v_shop and active=true) then raise exception 'Profissional indisponível.'; end if;
 select duration_minutes into v_duration from public.services where id=p_service and barbershop_id=v_shop and active=true;
 if v_duration is null then raise exception 'Serviço indisponível.'; end if;
 v_end := p_starts_at + make_interval(mins=>v_duration);
 insert into public.appointments(barbershop_id,staff_id,service_id,customer_name,customer_phone,starts_at,ends_at,status,created_by)
 values(v_shop,p_staff,p_service,trim(p_customer_name),trim(p_customer_phone),p_starts_at,v_end,'confirmed',null)
 returning id into v_id;
 return v_id;
exception when exclusion_violation then
 raise exception 'Este horário acabou de ser reservado. Escolha outro horário.';
end; $$;

revoke all on function public.get_public_booking_data(text) from public;
revoke all on function public.get_public_busy_times(text,uuid,timestamptz,timestamptz) from public;
revoke all on function public.create_public_appointment(text,uuid,uuid,text,text,timestamptz) from public;
grant execute on function public.get_public_booking_data(text) to anon, authenticated;
grant execute on function public.get_public_busy_times(text,uuid,timestamptz,timestamptz) to anon, authenticated;
grant execute on function public.create_public_appointment(text,uuid,uuid,text,text,timestamptz) to anon, authenticated;
