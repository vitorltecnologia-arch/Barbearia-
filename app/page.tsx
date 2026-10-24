import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return <div className="page">
    <aside className="side"><div className="brand"><div className="mark">✂</div><div><b>BARBER PRO</b><small>GESTÃO INTELIGENTE</small></div></div><p className="muted">Sua barbearia. No controle.</p></aside>
    <main><header className="top"><b>Plataforma de gestão</b><Link className="btn secondary" href="/login">Entrar</Link></header>
      <div className="content"><div className="eyebrow">GESTÃO PROFISSIONAL · MULTIEMPRESA</div><h1>Mais controle para sua barbearia.</h1><p className="muted">Agenda, equipe e operação em um só lugar.</p>
      <section className="hero-photo"><div><div className="eyebrow">BARBER PRO · GESTÃO PREMIUM</div><h2>Seu negócio. Seu ritmo.</h2><p>Uma plataforma para organizar clientes, equipe e horários — inclusive atendimentos noturnos.</p><Link className="btn" href="/cadastro">Começar agora →</Link></div></section><div className="cards"><div className="card"><small>Agenda centralizada</small><strong>Organize</strong><span className="muted">Horários e profissionais</span></div><div className="card"><small>Seu negócio</small><strong>Gerencie</strong><span className="muted">Clientes e serviços</span></div><div className="card"><small>Seu espaço</small><strong>Seguro</strong><span className="muted">Dados isolados por empresa</span></div></div>
      <div className="panel row"><div><h2>Comece pelo seu espaço de trabalho</h2><p className="muted">Crie sua conta e cadastre a barbearia.</p></div><Link className="btn" href="/cadastro">Criar minha conta →</Link></div>
      </div></main></div>;
}
