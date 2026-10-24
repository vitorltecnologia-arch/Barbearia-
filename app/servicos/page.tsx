'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Shop = { id: string; name: string };
type Service = {
  id: string; barbershop_id: string; name: string;
  description: string | null; duration_minutes: number;
  price_cents: number; active: boolean; created_at: string;
};

export default function ServicesPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [items, setItems] = useState<Service[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { data: memberships, error: mErr } = await supabase
      .from('memberships').select('barbershops(id,name)').eq('user_id', user.id);
    if (mErr) { setMessage(mErr.message); setLoading(false); return; }
    const shops = (memberships || []).map((m: any) =>
      Array.isArray(m.barbershops) ? m.barbershops[0] : m.barbershops
    ).filter(Boolean) as Shop[];
    if (!shops.length) { setMessage('Sua conta ainda não tem uma barbearia vinculada.'); setLoading(false); return; }
    setShop(shops[0]);
    const { data, error } = await supabase.from('services')
      .select('id,barbershop_id,name,description,duration_minutes,price_cents,active,created_at')
      .eq('barbershop_id', shops[0].id).order('created_at', { ascending: false });
    if (error) setMessage(error.message); else setItems((data || []) as Service[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!shop || saving) return;
    const cents = Math.round(Number(price.replace(',', '.')) * 100);
    const minutes = Number(duration);
    if (!name.trim()) { setMessage('Informe o nome do serviço.'); return; }
    if (!Number.isFinite(cents) || cents < 0) { setMessage('Informe um preço válido.'); return; }
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) { setMessage('A duração deve ser entre 5 e 480 minutos.'); return; }
    setSaving(true); setMessage('');
    const { error } = await createClient().from('services').insert({
      barbershop_id: shop.id, name: name.trim(), description: description.trim() || null,
      duration_minutes: minutes, price_cents: cents, active: true
    });
    setSaving(false);
    if (error) { setMessage(`Não foi possível salvar: ${error.message}`); return; }
    setName(''); setDescription(''); setDuration('30'); setPrice('');
    setMessage('Serviço cadastrado com sucesso.'); await load();
  }
  async function toggle(item: Service) {
    setMessage('');
    const { error } = await createClient().from('services').update({ active: !item.active })
      .eq('id', item.id).eq('barbershop_id', item.barbershop_id);
    if (error) { setMessage(`Não foi possível atualizar: ${error.message}`); return; }
    await load();
  }
  const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return <div className="page">
    <aside className="side">
      <Link href="/dashboard" className="brand"><div className="mark">✂</div><div><b>BARBER PRO</b><small>GESTÃO INTELIGENTE</small></div></Link>
      <div className="nav-label">MENU PRINCIPAL</div>
      <nav className="nav">
        <Link href="/dashboard">▦　Visão geral</Link><Link href="/agenda">▣　Agenda</Link>
        <Link href="/clientes">♙　Clientes</Link><Link className="active" href="/servicos">✂　Serviços</Link>
      </nav>
      <form action="/auth/signout" method="post"><button className="btn secondary" style={{marginTop:30}}>Sair da conta</button></form>
    </aside>
    <main><header className="top"><b>BARBER PRO / SERVIÇOS</b><Link className="muted" href="/dashboard">Voltar ao painel</Link></header>
      <div className="content"><div className="eyebrow">GESTÃO DA BARBEARIA</div><h1>Serviços</h1>
        <p className="muted">{shop ? `Cadastre e gerencie os serviços de ${shop.name}.` : 'Carregando sua barbearia...'}</p>
        {message && <p className="notice" role="status">{message}</p>}
        <section className="panel"><h2>Novo serviço</h2><form onSubmit={submit}>
          <div className="field"><label htmlFor="service-name">NOME DO SERVIÇO</label><input id="service-name" required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Corte masculino" /></div>
          <div className="field"><label htmlFor="service-description">DESCRIÇÃO (OPCIONAL)</label><input id="service-description" maxLength={500} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ex.: Corte com acabamento" /></div>
          <div className="field"><label htmlFor="service-price">PREÇO (R$)</label><input id="service-price" type="number" required min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="35.00" /></div>
          <div className="field"><label htmlFor="service-duration">DURAÇÃO (MINUTOS)</label><input id="service-duration" type="number" required min="5" max="480" step="5" value={duration} onChange={e=>setDuration(e.target.value)} /></div>
          <button className="btn" disabled={saving || loading || !shop}>{saving ? 'Salvando...' : 'Cadastrar serviço →'}</button>
        </form></section>
        <section className="panel"><div className="row"><h2>Serviços cadastrados</h2><span className="muted">{items.length} serviço(s)</span></div>
          {loading ? <p className="muted">Carregando...</p> : items.length === 0 ? <p className="muted">Nenhum serviço cadastrado ainda.</p> :
          <div className="cards">{items.map(item=><article className="card" key={item.id}><small>{item.active ? 'ATIVO' : 'INATIVO'}</small><strong>{item.name}</strong>{item.description && <p className="muted">{item.description}</p>}<p>{money(item.price_cents)}</p><p className="muted">{item.duration_minutes} minutos</p><button type="button" className="btn secondary" onClick={()=>void toggle(item)}>{item.active ? 'Desativar serviço' : 'Ativar serviço'}</button></article>)}</div>}
        </section>
      </div>
    </main>
  </div>;
}
