# Barber Pro SaaS — núcleo inicial

Base de desenvolvimento para um SaaS multiempresa de barbearias.

## Stack proposta
- Next.js (App Router) + TypeScript
- Supabase Auth
- PostgreSQL com Row Level Security (RLS)
- Reservas gravadas no PostgreSQL por função transacional
- UI em tema preto e amarelo

## O que este pacote entrega
- Estrutura inicial de projeto e rotas
- Login/cadastro via Supabase Auth
- Onboarding para criar uma barbearia e vínculo de proprietário
- Modelo de dados multiempresa
- Políticas RLS para escopo por barbearia
- RPC transacional para criar agendamento sem sobreposição por profissional
- Orientações de configuração local

## O que NÃO está pronto
Este é um starter de desenvolvimento, não um serviço publicado nem auditado. Ainda requer instalação de dependências, criação/configuração de projeto Supabase, execução de migrations, testes, revisão de segurança e deploy. Não contém pagamentos reais, envio de WhatsApp/e-mail ou confirmação de reservas por um serviço hospedado.

## Instalação
1. Instale Node.js LTS e crie um projeto Supabase.
2. Copie `.env.example` para `.env.local` e preencha as credenciais públicas do projeto.
3. Execute `supabase/migrations/0001_core.sql` no SQL Editor do Supabase.
4. Instale dependências: `npm install`.
5. Inicie: `npm run dev`.
6. Abra `http://localhost:3000`.

> Antes de produção: confirme RLS com testes de duas contas de barbearias diferentes, configure URL de redirecionamento de Auth, aplique rate limiting, logs, backup, monitoramento, política de privacidade/LGPD e testes de concorrência.


## Atualização de telas

Este pacote inclui as telas funcionais iniciais em `/servicos`, `/clientes` e `/agenda`, além de menu atualizado no dashboard. Leia `LEIA-ME.txt` para os limites e instruções de teste. Preserve seu `.env.local` ao atualizar um projeto já configurado.
