# Checklist antes de produção

- [ ] Aplicar a migration num projeto Supabase de teste e verificar as funções/RLS.
- [ ] Testar com duas contas e duas barbearias que uma conta não lê nem altera a outra.
- [ ] Revisar a função `is_member` e permissões de funções SECURITY DEFINER/INVOKER com um especialista PostgreSQL.
- [ ] Confirmar política de confirmação de e-mail, reset de senha, URLs de redirect e limites de tentativas.
- [ ] Criar disponibilidade/horário de trabalho e validar horários abertos antes de reservar.
- [ ] Criar fluxo público de agendamento via RPC restrita com proteção antiabuso; não expor dados privados de clientes.
- [ ] Configurar regras de cancelamento, idempotência, fuso horário e notificações.
- [ ] Adicionar auditoria, backup, monitoramento, testes automatizados, LGPD e política de retenção.
- [ ] Configurar billing/webhooks com verificação de assinatura e idempotência antes de vender planos.
- [ ] Não colocar service-role key no frontend nem em variáveis `NEXT_PUBLIC_*`.
