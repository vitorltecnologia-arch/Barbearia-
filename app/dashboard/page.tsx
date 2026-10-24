import BookingLink from "@/app/components/booking-link";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase.from("memberships")
    .select("role,barbershops(id,name,slug)").eq("user_id", user.id);
  const shops = (memberships || []).map((m: any) => ({
    role: m.role,
    shop: Array.isArray(m.barbershops) ? m.barbershops[0] : m.barbershops
  })).filter((x: any) => x.shop);
  const shopIds = shops.map((x: any) => x.shop.id);
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  let upcoming: any[] = [];
  let appointmentError = "";
  if (shopIds.length) {
    const result = await supabase.from("appointments")
      .select("id,barbershop_id,customer_name,customer_phone,starts_at,status,notes")
      .in("barbershop_id", shopIds)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", in24Hours.toISOString())
      .in("status", ["pending", "confirmed"])
      .order("starts_at", { ascending: true }).limit(8);
    upcoming = result.data || [];
    appointmentError = result.error?.message || "";
  }
  const dateLabel = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  return <div className="page">
    <aside className="side">
      <Link href="/" className="brand"><div className="mark">✂</div><div><b>BARBER PRO</b><small>GESTÃO INTELIGENTE</small></div></Link>
      <div className="nav-label">MENU PRINCIPAL</div>
      <nav className="nav">
        <Link className="active" href="/dashboard">▦　Visão geral</Link>
        <Link href="/agenda">▣　Agenda</Link>
        <Link href="/clientes">♙　Clientes</Link>
        <Link href="/servicos">✂　Serviços</Link>
        <Link href="/equipe">♟　Equipe</Link>
        <Link href="/financeiro">↗　Financeiro</Link>
        <Link href="/reservas">⌁　Agendamento online</Link>
        <Link href="/configuracoes">⚙　Configurações</Link>
      </nav>
      <form action="/auth/signout" method="post"><button className="btn secondary" style={{marginTop:30}}>Sair da conta</button></form>
    </aside>
    <main>
      <header className="top"><b>BARBER PRO / VISÃO GERAL</b><span className="muted">{user.email}</span></header>
      <div className="content"><div className="eyebrow">ÁREA DA SUA EMPRESA</div><h1>Seu espaço de trabalho</h1>
        <p className="muted">Acesso autenticado. Gerencie a operação da sua barbearia em um só lugar.</p>
        <section className="hero-photo"><div><div className="eyebrow">BARBER PRO · GESTÃO PREMIUM</div><h2>Seu negócio. Seu ritmo.</h2><p>Organize os atendimentos, acompanhe seus clientes e mantenha sua equipe em sintonia.</p><Link className="btn" href="/agenda">Abrir agenda →</Link></div></section>
        {shops.length === 0 ? <div className="panel"><h2>Nenhuma barbearia vinculada</h2><p className="muted">Crie seu espaço para começar.</p><Link className="btn" href="/onboarding">Cadastrar barbearia</Link></div> :
        <><div className="cards">{shops.map((x: any) => <div className="card" key={x.shop.id}><small>BARBEARIA</small><strong style={{fontSize:20}}>{x.shop.name}</strong><span className="muted">Identificador: {x.shop.slug}</span><p className="muted">Permissão: {x.role}</p></div>)}</div>
          <div className="panel"><h2>Agendamento pelo celular</h2><p className="muted">Envie este link aos seus clientes para que escolham o barbeiro, o serviço e um horário livre. A página pública funciona no celular e aceita horários durante as 24 horas.</p>{shops.map((x: any) => <BookingLink key={x.shop.id} slug={x.shop.slug} />)}</div>
          <div className="cards">
            <Link className="card" href="/agenda"><small>AGENDA</small><strong>Gerenciar horários →</strong><p className="muted">Criar e consultar agendamentos</p></Link>
            <Link className="card" href="/clientes"><small>CLIENTES</small><strong>Cadastro de clientes →</strong><p className="muted">Salvar nomes, telefones e e-mails</p></Link>
            <Link className="card" href="/servicos"><small>SERVIÇOS</small><strong>Catálogo de serviços →</strong><p className="muted">Definir preço e duração</p></Link>
          </div>
          <div className="panel"><div className="row"><div><h2>Próximos clientes · próximas 24 horas</h2><p className="muted">Lembrete visual dos atendimentos pendentes e confirmados nas próximas 24 horas.</p></div><Link className="btn secondary" href="/agenda">Abrir agenda →</Link></div>
            {appointmentError ? <p className="error">Não foi possível carregar os próximos clientes: {appointmentError}</p> : upcoming.length === 0 ? <p className="muted">Nenhum atendimento pendente ou confirmado nas próximas 24 horas.</p> : <div className="cards">{upcoming.map((a: any) => <article className="card" key={a.id}><small>{a.status === "confirmed" ? "CONFIRMADO" : "PENDENTE"}</small><strong>{a.customer_name}</strong><p>{dateLabel(a.starts_at)}</p>{a.customer_phone && <p className="muted">WhatsApp: {a.customer_phone}</p>}{a.notes && <p className="muted">{a.notes}</p>}</article>)}</div>}
          </div>
          <div className="panel"><h2>Sobre os lembretes</h2><p className="muted">Esta área mostra os próximos atendimentos quando você abre o painel. Envio automático por WhatsApp, SMS ou e-mail exige integração adicional e configuração de um serviço de notificações.</p></div>
        </>}
      </div>
    </main>
  </div>;
}
