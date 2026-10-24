import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) redirect("/login");
 return <div className="page"><aside className="side"><Link href="/dashboard" className="brand"><div className="mark">✂</div><div><b>BARBER PRO</b><small>GESTÃO INTELIGENTE</small></div></Link><div className="nav-label">MENU PRINCIPAL</div><nav className="nav"><Link href="/dashboard">▦　Visão geral</Link><Link href="/agenda">▣　Agenda</Link><Link href="/clientes">♙　Clientes</Link><Link href="/servicos">✂　Serviços</Link><Link href="/equipe">♟　Equipe</Link><Link href="/financeiro">↗　Financeiro</Link><Link href="/reservas">⌁　Agendamento online</Link><Link href="/configuracoes">⚙　Configurações</Link></nav><form action="/auth/signout" method="post"><button className="btn secondary" style={{marginTop:30}}>Sair da conta</button></form></aside><main><header className="top"><b>BARBER PRO / AGENDAMENTO ONLINE</b><span className="muted">{user.email}</span></header><div className="content"><div className="eyebrow">RESERVAS ONLINE</div><h1>Agendamento online</h1><p className="muted">Preparação para a futura página pública de reservas para os seus clientes.</p><section className="panel"><h2>Área em evolução</h2><ul>{['O formulário público ainda não está ativo', 'Os agendamentos internos estão disponíveis na Agenda'].map((item) => <li key={item} className="muted" style={{margin:'12px 0'}}>{item}</li>)}</ul><Link className="btn" href="/agenda">Ir para agenda →</Link></section></div></main></div>;
}
