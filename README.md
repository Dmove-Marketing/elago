# dmove-astro-template

Template de landing page da Dmove (Astro estático) — modelo para clonar a cada novo projeto de cliente.

**Para implementar um projeto a partir deste modelo, leia o [`CLAUDE.md`](./CLAUDE.md)** — ele traz o processo completo (onboarding → conversão do HTML → formulário padrão → deploy na VPS) e quando parar para perguntar ao usuário.

**Para quem cria o HTML no Claude Design:** ver [`docs/design-brief.md`](./docs/design-brief.md).

## Início rápido

```bash
npm install
npm run dev      # http://localhost:4321
npm run build
npm run deploy   # scp de dist/ para o servidor em config.json
```

Preencha o `config.json` (domínio, GTM, webhook, WhatsApp, preset do formulário) antes de começar.
