'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Shop = { id: string; name: string };
type Customer = { id: string; full_name: string; phone: string | null; email: string | null; created_at: string };

export default function CustomersPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [items, setItems] = useState<Customer[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { data: memberships, error: mErr } = await supabase.from('memberships')
      .select('barbershops(id,name)').eq('user_id', user.id);
    if (mErr) { setMessage(mErr.message); setLoading(false); return; }
    const shops = (memberships || []).map((m: any) => Array.isArray(m.barbershops) ? m.barbershops[0] : m.barbershops).filter(Boolean) as Shop[];
    if (!shops.length) { setMessage('Sua conta ainda não tem uma barbearia vinculada.'); setLoading(false); return; }
    setShop(shops[0]);
    const { data, error } = await supabase.from('customers')
      .select('id,full_name,phone,email,created_at').eq('barbershop_id', shops[0].id).order('created_at', { ascending: false });
    if (error) setMessage(error.message); else setItems((data || []) as Customer[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!shop || saving) return;
    if (name.trim().length < 2) { setMessage('Informe o nome completo do cliente.'); return; }
    setSaving(true); setMessage('');
    const { error } = await createClient().from('customers').insert({
      barbershop_id: shop.id, full_name: name.trim(), phone: phone.trim() || null, email: email.trim() || null
    });
    setSaving(false);
    if (error) { setMessage(`Não foi possível salvar: ${error.message}`); return; }
    setName(''); setPhone(''); setEmail(''); setMessage('Cliente cadastrado com sucesso.'); await load();
  }

  return <div className="page">
    <aside className="side"><Link href="/dashboard" className="brand"><div className="mark">✂</div><div><b>BARBER PRO</b><small>GESTÃO INTELIGENTE</small></div></Link>
      <div className="nav-label">MENU PRINCIPAL</div><nav className="nav">
        <Link href="/dashboard">▦　Visão geral</Link><Link href="/agenda">▣　Agenda</Link><Link className="active" href="/clientes">♙　Clientes</Link><Link href="/servicos">✂　Serviços</Link>
      </nav><form action="/auth/signout" method="post"><button className="btn secondary" style={{marginTop:30}}>Sair da conta</button></form>
    </aside>
    <main><header className="top"><b>BARBER PRO / CLIENTES</b><Link className="muted" href="/dashboard">Voltar ao painel</Link></header>
      <div className="content"><div className="eyebrow">RELACIONAMENTO</div><h1>Clientes</h1><p className="muted">{shop ? `Cadastro de clientes de ${shop.name}.` : 'Carregando sua barbearia...'}</p>
        {message && <p className="notice" role="status">{message}</p>}
        <section className="panel"><h2>Novo cliente</h2><form onSubmit={submit}>
          <div className="field"><label htmlFor="customer-name">NOME COMPLETO</label><input id="customer-name" required minLength={2} maxLength={150} value={name} onChange={e=>setName(e.target.value)} placeholder="Nome do cliente" /></div>
          <div className="field"><label htmlFor="customer-phone">TELEFONE / WHATSAPP</label><input id="customer-phone" maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(11) 99999-9999" /></div>
          <div className="field"><label htmlFor="customer-email">E-MAIL (OPCIONAL)</label><input id="customer-email" type="email" maxLength={200} value={email} onChange={e=>setEmail(e.target.value)} placeholder="cliente@email.com" /></div>
          <button className="btn" disabled={saving || loading || !shop}>{saving ? 'Salvando...' : 'Cadastrar cliente →'}</button>
        </form></section>
        <section className="panel"><div className="row"><h2>Clientes cadastrados</h2><span className="muted">{items.length} cliente(s)</span></div>
          {loading ? <p className="muted">Carregando...</p> : items.length === 0 ? <p className="muted">Nenhum cliente cadastrado ainda.</p> :
          <div className="cards">{items.map(c=><article className="card" key={c.id}><strong>{c.full_name}</strong><p className="muted">{c.phone || 'Sem telefone informado'}</p><p className="muted">{c.email || 'Sem e-mail informado'}</p></article>)}</div>}
        </section>
      </div>
    </main>
  </div>;
}
