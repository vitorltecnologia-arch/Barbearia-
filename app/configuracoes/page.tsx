import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) redirect("/login");
 return <div className="page"><aside className="side"><Link href="/dashboard" className="brand"><div className="mark">✂</div><div><b>BARBER PRO</b><small>GESTÃO INTELIGENTE</small></div></Link><div className="nav-label">MENU PRINCIPAL</div><nav className="nav"><Link href="/dashboard">▦　Visão geral</Link><Link href="/agenda">▣　Agenda</Link><Link href="/clientes">♙　Clientes</Link><Link href="/servicos">✂　Serviços</Link><Link href="/equipe">♟　Equipe</Link><Link href="/financeiro">↗　Financeiro</Link><Link href="/reservas">⌁　Agendamento online</Link><Link href="/configuracoes">⚙　Configurações</Link></nav><form action="/auth/signout" method="post"><button className="btn secondary" style={{marginTop:30}}>Sair da conta</button></form></aside><main><header className="top"><b>BARBER PRO / CONFIGURAÇÕES</b><span className="muted">{user.email}</span></header><div className="content"><div className="eyebrow">CONFIGURAÇÕES DA BARBEARIA</div><h1>Configurações</h1><p className="muted">Espaço para as preferências e dados do estabelecimento.</p><section className="panel"><h2>Área em evolução</h2><ul>{['Configuração avançada e horário de funcionamento ainda não implementados', 'Sua conta e sua barbearia existentes foram preservadas'].map((item) => <li key={item} className="muted" style={{margin:'12px 0'}}>{item}</li>)}</ul><Link className="btn" href="/agenda">Ir para agenda →</Link></section></div></main></div>;
}
