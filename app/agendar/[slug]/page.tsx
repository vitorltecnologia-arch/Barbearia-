'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Staff = { id: string; name: string };
type Service = { id: string; name: string; description: string | null; duration_minutes: number; price_cents: number };
type Shop = { id: string; name: string; slug: string; timezone: string };
type Busy = { starts_at: string; ends_at: string };
type BookingData = { shop: Shop; staff: Staff[]; services: Service[] };

const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const localDateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const dateFromLocal = (day: string, time: string) => new Date(`${day}T${time}:00`);

export default function PublicBookingPage() {
  const params = useParams<{slug:string}>();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const [data, setData] = useState<BookingData | null>(null);
  const [staffId, setStaffId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [day, setDay] = useState(localDateString(new Date()));
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState<Busy[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const service = data?.services.find(s => s.id === serviceId);
  const staff = data?.staff.find(s => s.id === staffId);

  useEffect(() => {
    if (!slug) return;
    let live = true;
    (async () => {
      const { data: result, error: rpcError } = await supabase.rpc('get_public_booking_data', { p_slug: slug });
      if (!live) return;
      if (rpcError) setError(rpcError.message);
      else {
        const parsed = result as BookingData;
        setData(parsed);
        setStaffId(parsed.staff[0]?.id || '');
        setServiceId(parsed.services[0]?.id || '');
      }
      setLoading(false);
    })();
    return () => { live = false; };
  }, [slug, supabase]);

  useEffect(() => {
    if (!slug || !staffId || !day) return;
    let live = true;
    setTime(''); setMessage('');
    const from = dateFromLocal(day, '00:00');
    const until = new Date(from.getTime() + 24*60*60*1000);
    (async () => {
      const { data: result, error: rpcError } = await supabase.rpc('get_public_busy_times', {
        p_slug: slug, p_staff: staffId, p_from: from.toISOString(), p_until: until.toISOString()
      });
      if (!live) return;
      if (rpcError) setError(rpcError.message); else { setBusy((result || []) as Busy[]); setError(''); }
    })();
    return () => { live = false; };
  }, [slug, staffId, day, supabase]);

  const slots = useMemo(() => {
    if (!service || !day) return [] as string[];
    const now = new Date();
    const result: string[] = [];
    for (let mins=0; mins<1440; mins+=30) {
      const h = String(Math.floor(mins/60)).padStart(2,'0');
      const m = String(mins%60).padStart(2,'0');
      const start = dateFromLocal(day, `${h}:${m}`);
      const end = new Date(start.getTime() + service.duration_minutes*60000);
      if (start <= now) continue;
      if (busy.some(b => start < new Date(b.ends_at) && end > new Date(b.starts_at))) continue;
      result.push(`${h}:${m}`);
    }
    return result;
  }, [service, day, busy]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage(''); setError('');
    if (!data || !staffId || !serviceId || !time) { setError('Escolha o barbeiro, serviço, data e horário.'); return; }
    const startsAt = dateFromLocal(day, time);
    if (startsAt <= new Date()) { setError('Escolha um horário futuro.'); return; }
    setSaving(true);
    const { error: bookingError } = await supabase.rpc('create_public_appointment', {
      p_slug: slug, p_staff: staffId, p_service: serviceId,
      p_customer_name: name.trim(), p_customer_phone: phone.trim(), p_starts_at: startsAt.toISOString()
    });
    setSaving(false);
    if (bookingError) {
      setError(bookingError.message.includes('horário') || bookingError.message.includes('reservado') ? bookingError.message : `Não foi possível concluir: ${bookingError.message}`);
      const from = dateFromLocal(day, '00:00');
      const until = new Date(from.getTime()+24*60*60*1000);
      const { data: latest } = await supabase.rpc('get_public_busy_times', { p_slug:slug, p_staff:staffId, p_from:from.toISOString(), p_until:until.toISOString() });
      setBusy((latest || []) as Busy[]); setTime('');
      return;
    }
    setMessage('Agendamento confirmado! Guarde a data e o horário escolhidos.');
    setName(''); setPhone(''); setTime('');
    const from = dateFromLocal(day, '00:00');
    const until = new Date(from.getTime()+24*60*60*1000);
    const { data: latest } = await supabase.rpc('get_public_busy_times', { p_slug:slug, p_staff:staffId, p_from:from.toISOString(), p_until:until.toISOString() });
    setBusy((latest || []) as Busy[]);
  }

  return <main className="booking-page">
    <header className="booking-top"><Link href="/" className="booking-brand"><span className="booking-mark">✂</span><span>BARBER <b>PRO</b><small>AGENDAMENTO ONLINE</small></span></Link><span className="booking-open">● AGENDAMENTO 24H</span></header>
    <section className="booking-hero"><div className="booking-hero-copy"><div className="booking-kicker">SEU PRÓXIMO CORTE COMEÇA AQUI</div><h1>Seu horário.<br/><span>Do seu jeito.</span></h1><p>Escolha o profissional, o serviço e o melhor horário para você. Simples, rápido e direto pelo celular.</p><div className="booking-points"><span>✓ Horários em tempo real</span><span>✓ Reserva online</span><span>✓ Sem precisar ligar</span></div></div></section>
    <section className="booking-content"><div className="booking-heading"><div><div className="booking-kicker">RESERVE EM POUCOS PASSOS</div><h2>{data?.shop.name || 'Agende seu horário'}</h2><p>Preencha os dados para reservar seu atendimento.</p></div><div className="booking-scissors">✂</div></div>
      {loading ? <div className="booking-panel">Carregando os serviços e profissionais...</div> : error && !data ? <div className="booking-panel"><p className="booking-error">{error}</p><p>Confira se o link está correto ou peça à barbearia o link atualizado.</p></div> : !data || data.staff.length===0 || data.services.length===0 ? <div className="booking-panel"><p>Esta barbearia ainda não cadastrou profissionais ou serviços ativos para agendamento online.</p></div> :
      <form className="booking-panel" onSubmit={submit}>
        <div className="booking-step"><span>01</span><div><h3>Escolha o profissional</h3><p>Quem vai cuidar do seu corte?</p></div></div>
        <div className="booking-staff-grid">{data.staff.map(s=><button type="button" key={s.id} className={`booking-staff ${staffId===s.id?'selected':''}`} onClick={()=>{setStaffId(s.id);setTime('');}}><span className="booking-avatar">✂</span><b>{s.name}</b><small>{staffId===s.id?'Selecionado':'Barbeiro'}</small></button>)}</div>
        <div className="booking-step"><span>02</span><div><h3>Selecione o serviço</h3><p>Escolha o que deseja fazer.</p></div></div>
        <div className="booking-service-grid">{data.services.map(s=><button type="button" key={s.id} className={`booking-service ${serviceId===s.id?'selected':''}`} onClick={()=>{setServiceId(s.id);setTime('');}}><span><b>{s.name}</b><small>{s.duration_minutes} minutos{s.description?` · ${s.description}`:''}</small></span><strong>{money(s.price_cents)}</strong></button>)}</div>
        <div className="booking-step"><span>03</span><div><h3>Dia e horário</h3><p>Disponibilidade durante as 24 horas.</p></div></div>
        <div className="booking-date-time"><div className="field"><label htmlFor="booking-date">DATA DO ATENDIMENTO</label><input id="booking-date" type="date" required min={localDateString(new Date())} max={localDateString(new Date(Date.now()+180*86400000))} value={day} onChange={e=>setDay(e.target.value)} /></div><div className="field"><label>HORÁRIOS LIVRES</label><div className="booking-slots">{slots.length ? slots.map(slot=><button key={slot} type="button" className={`booking-slot ${time===slot?'selected':''}`} onClick={()=>setTime(slot)}>{slot}</button>) : <p className="booking-no-slots">Não há horários livres para este dia e serviço. Escolha outra data.</p>}</div></div></div>
        <div className="booking-step"><span>04</span><div><h3>Seus dados</h3><p>Para a barbearia confirmar seu atendimento.</p></div></div>
        <div className="booking-customer"><div className="field"><label htmlFor="booking-name">NOME COMPLETO</label><input id="booking-name" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Como podemos te chamar?" /></div><div className="field"><label htmlFor="booking-phone">WHATSAPP COM DDD</label><input id="booking-phone" autoComplete="tel" inputMode="tel" required minLength={10} maxLength={24} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(11) 99999-9999" /></div></div>
        {error && <p className="booking-error" role="alert">{error}</p>}{message && <p className="booking-success" role="status">{message}</p>}
        <button className="booking-submit" disabled={saving || !time}>{saving?'Reservando seu horário...':'CONFIRMAR AGENDAMENTO  →'}</button><p className="booking-privacy">Ao reservar, seus dados serão enviados à barbearia para organizar seu atendimento.</p>
      </form>}
      <footer className="booking-footer">Desenvolvido com <b>BARBER PRO</b> · Agendamento simples e profissional</footer>
    </section>
  </main>;
}
