'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Shop = { id: string; name: string };
type Service = { id: string; name: string; duration_minutes: number; price_cents: number; active: boolean };
type Staff = { id: string; display_name: string; active: boolean };
type Appointment = { id: string; customer_name: string; customer_phone: string | null; starts_at: string; ends_at: string; status: string; notes: string | null; service_id: string; staff_id: string };
const statuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
const statusLabel: Record<string,string> = { pending: 'Pendente', confirmed: 'Confirmado', completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Não compareceu' };

export default function AgendaPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [notes, setNotes] = useState('');
  const [newStaff, setNewStaff] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [day, setDay] = useState(new Date().toISOString().slice(0,10));

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { data: memberships, error: mErr } = await supabase.from('memberships').select('barbershops(id,name)').eq('user_id', user.id);
    if (mErr) { setMessage(mErr.message); setLoading(false); return; }
    const shops = (memberships || []).map((m: any) => Array.isArray(m.barbershops) ? m.barbershops[0] : m.barbershops).filter(Boolean) as Shop[];
    if (!shops.length) { setMessage('Sua conta ainda não tem uma barbearia vinculada.'); setLoading(false); return; }
    const currentShop = shops[0]; setShop(currentShop);
    const [sRes, staffRes, aRes] = await Promise.all([
      supabase.from('services').select('id,name,duration_minutes,price_cents,active').eq('barbershop_id', currentShop.id).eq('active', true).order('name'),
      supabase.from('staff').select('id,display_name,active').eq('barbershop_id', currentShop.id).eq('active', true).order('display_name'),
      supabase.from('appointments').select('id,customer_name,customer_phone,starts_at,ends_at,status,notes,service_id,staff_id').eq('barbershop_id', currentShop.id).gte('starts_at', `${day}T00:00:00`).lt('starts_at', `${day}T23:59:59.999`).order('starts_at')
    ]);
    if (sRes.error || staffRes.error || aRes.error) setMessage(sRes.error?.message || staffRes.error?.message || aRes.error?.message || 'Erro ao carregar agenda.');
    setServices((sRes.data || []) as Service[]); setStaff((staffRes.data || []) as Staff[]); setAppointments((aRes.data || []) as Appointment[]);
    setServiceId(current => current || sRes.data?.[0]?.id || '');
    setStaffId(current => current || staffRes.data?.[0]?.id || '');
    setLoading(false);
  }
  useEffect(() => { void load(); }, [day]);

  async function addStaff(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!shop || savingStaff || !newStaff.trim()) return;
    setSavingStaff(true); setMessage('');
    const { error } = await createClient().from('staff').insert({ barbershop_id: shop.id, display_name: newStaff.trim(), active: true });
    setSavingStaff(false);
    if (error) { setMessage(`Não foi possível cadastrar profissional: ${error.message}`); return; }
    setNewStaff(''); setMessage('Profissional cadastrado.'); await load();
  }

  async function createAppointment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!shop || saving) return;
    if (!customerName.trim() || !serviceId || !staffId || !startsAt) { setMessage('Preencha cliente, serviço, profissional e data/horário.'); return; }
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) { setMessage('Escolha uma data e horário futuros.'); return; }
    setSaving(true); setMessage('');
    const { error } = await createClient().rpc('create_appointment', {
      p_shop: shop.id, p_staff: staffId, p_service: serviceId,
      p_customer_name: customerName.trim(), p_customer_phone: phone.trim() || null,
      p_starts_at: start.toISOString(), p_notes: notes.trim() || null
    });
    setSaving(false);
    if (error) { setMessage(`Não foi possível criar o agendamento: ${error.message}`); return; }
    setCustomerName(''); setPhone(''); setNotes(''); setMessage('Agendamento criado com sucesso.');
    setDay(startsAt.slice(0,10)); await load();
  }

  async function changeStatus(item: Appointment, status: string) {
    const { error } = await createClient().from('appointments').update({ status })
      .eq('id', item.id).eq('barbershop_id', shop?.id || '');
    if (error) { setMessage(`Não foi possível atualizar o status: ${error.message}`); return; }
    setMessage('Status atualizado.'); await load();
  }

  const serviceName = (id: string) => services.find(x=>x.id===id)?.name || 'Serviço';
  const staffName = (id: string) => staff.find(x=>x.id===id)?.display_name || 'Profissional';
  const formatDate = (value: string) => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return <div className="page">
    <aside className="side"><Link href="/dashboard" className="brand"><div className="mark">✂</div><div><b>BARBER PRO</b><small>GESTÃO INTELIGENTE</small></div></Link>
      <div className="nav-label">MENU PRINCIPAL</div><nav className="nav">
        <Link href="/dashboard">▦　Visão geral</Link><Link className="active" href="/agenda">▣　Agenda</Link><Link href="/clientes">♙　Clientes</Link><Link href="/servicos">✂　Serviços</Link>
      </nav><form action="/auth/signout" method="post"><button className="btn secondary" style={{marginTop:30}}>Sair da conta</button></form>
    </aside>
    <main><header className="top"><b>BARBER PRO / AGENDA</b><Link className="muted" href="/dashboard">Voltar ao painel</Link></header>
      <div className="content"><div className="eyebrow">HORÁRIOS E RESERVAS</div><h1>Agenda</h1><p className="muted">{shop ? `Agendamentos de ${shop.name}.` : 'Carregando sua barbearia...'}</p>
        {message && <p className="notice" role="status">{message}</p>}
        <section className="panel"><h2>Profissionais</h2><p className="muted">Cadastre pelo menos um profissional antes de criar agendamentos.</p>
          <form onSubmit={addStaff}><div className="field"><label htmlFor="staff-name">NOME DO PROFISSIONAL</label><input id="staff-name" required maxLength={120} value={newStaff} onChange={e=>setNewStaff(e.target.value)} placeholder="Ex.: João - barbeiro" /></div>
          <button className="btn secondary" disabled={savingStaff || loading || !shop}>{savingStaff ? 'Salvando...' : 'Adicionar profissional'}</button></form>
          {staff.length > 0 && <p className="muted">Profissionais ativos: {staff.map(x=>x.display_name).join(', ')}</p>}
        </section>
        <section className="panel"><h2>Novo agendamento</h2>
          {services.length === 0 && <p className="notice">Cadastre primeiro um serviço em <Link href="/servicos">Serviços</Link>.</p>}
          {staff.length === 0 && <p className="notice">Cadastre um profissional acima para habilitar os agendamentos.</p>}
          <form onSubmit={createAppointment}>
            <div className="field"><label htmlFor="appointment-customer">NOME DO CLIENTE</label><input id="appointment-customer" required maxLength={150} value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Nome do cliente" /></div>
            <div className="field"><label htmlFor="appointment-phone">TELEFONE (OPCIONAL)</label><input id="appointment-phone" maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="WhatsApp" /></div>
            <div className="field"><label htmlFor="appointment-service">SERVIÇO</label><select id="appointment-service" required value={serviceId} onChange={e=>setServiceId(e.target.value)}>{services.map(x=><option key={x.id} value={x.id}>{x.name} — {(x.price_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} ({x.duration_minutes} min)</option>)}</select></div>
            <div className="field"><label htmlFor="appointment-staff">PROFISSIONAL</label><select id="appointment-staff" required value={staffId} onChange={e=>setStaffId(e.target.value)}>{staff.map(x=><option key={x.id} value={x.id}>{x.display_name}</option>)}</select></div>
            <div className="field"><label htmlFor="appointment-start">DATA E HORÁRIO</label><input id="appointment-start" required type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} /></div>
            <div className="field"><label htmlFor="appointment-notes">OBSERVAÇÕES (OPCIONAL)</label><input id="appointment-notes" maxLength={500} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Observações do atendimento" /></div>
            <button className="btn" disabled={saving || loading || !shop || services.length===0 || staff.length===0}>{saving ? 'Salvando...' : 'Criar agendamento →'}</button>
          </form>
        </section>
        <section className="panel"><div className="row"><h2>Agendamentos do dia</h2><div className="field" style={{margin:0}}><label htmlFor="agenda-day">ESCOLHER DATA</label><input id="agenda-day" type="date" value={day} onChange={e=>setDay(e.target.value)} /></div></div>
          {loading ? <p className="muted">Carregando agenda...</p> : appointments.length===0 ? <p className="muted">Não há agendamentos para esta data.</p> :
          <div className="cards">{appointments.map(a=><article className="card" key={a.id}><small>{statusLabel[a.status] || a.status}</small><strong>{a.customer_name}</strong><p>{formatDate(a.starts_at)}</p><p className="muted">{serviceName(a.service_id)} · {staffName(a.staff_id)}</p>{a.customer_phone && <p className="muted">{a.customer_phone}</p>}{a.notes && <p className="muted">{a.notes}</p>}
            <div className="field"><label htmlFor={`status-${a.id}`}>STATUS</label><select id={`status-${a.id}`} value={a.status} onChange={e=>void changeStatus(a,e.target.value)}>{statuses.map(s=><option key={s} value={s}>{statusLabel[s]}</option>)}</select></div>
          </article>)}</div>}
        </section>
      </div>
    </main>
  </div>;
}
