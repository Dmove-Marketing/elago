# Padrão de Home de Triagem

Quando um cliente tem **mais de um funil** (ex.: casamentos + corporativo + debutantes), a página raiz (`/`) não é uma landing page completa — é uma **home de triagem**: uma página leve cujo único trabalho é descobrir o **tipo de evento** do visitante e **direcioná-lo para a LP certa**.

> Referência viva: `eventos.afrikanhouse.com.br` (repo `Dmove-Marketing/afrikan-house`), onde a home pergunta "Você procura um espaço para qual tipo de evento?" e oferece Casamento / Debutante / Corporativo, cada um com botão para a LP do funil.

---

## Quando usar

- **Cliente com 2+ funis** → home de triagem em `/`, e cada funil na sua LP (`/casamentos`, `/eventos-corporativos`, …).
- **Cliente com 1 funil só** → não precisa de home; a LP fica em `/` (ou a raiz redireciona pra ela, como está hoje no Casa Kefren).

## Objetivo

- **Roteamento:** levar o visitante à LP do funil certo com 1 clique.
- **Qualificação e tracking por funil:** saber por qual porta o tráfego entra (medir o clique em cada card).
- **Menos atrito:** a captação (formulário) acontece na LP do funil, não na home.

---

## Estrutura da página

1. **Logo** da marca (topo, imagem LCP → `priority`).
2. **Pergunta / headline:** "Você procura um espaço para qual tipo de evento?" (ou variação da marca).
3. **Grade de opções** — um card por funil, cada um com:
   - Imagem representativa do tipo de evento
   - Nome do tipo de evento (ex.: "Casamento")
   - CTA **"Solicitar orçamento"** → link para o **slug do funil**
4. **Rodapé:** copyright + "Desenvolvido por Dmove".

```
            [ LOGO ]
  Você procura um espaço para qual tipo de evento?

  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Casamento│  │Corporativo│ │Debutante │
  │ [imagem] │  │ [imagem] │  │ [imagem] │
  │ Solicitar│  │ Solicitar│  │ Solicitar│
  └──────────┘  └──────────┘  └──────────┘

        Desenvolvido por Dmove
```

---

## Regras do padrão (o "config de fundo")

- **Sem formulário na home.** A captação é nas LPs de cada funil.
- **`hideWhatsApp={true}`** — a home não exibe o widget de WhatsApp (é só roteador). *(Nota de implementação: o `Base.astro` do template precisa aceitar essa prop — ver abaixo.)*
- **Tracking ativo** (GTM injetado normalmente). **Meça o clique em cada card** com um evento de dataLayer (ex.: `escolha_funil` com o tipo), para saber a distribuição de interesse.
- **Cada card leva ao slug padrão** do funil (ver lista abaixo). Nada de link para site externo.
- **Leve e rápida** — é a primeira porta. Imagens dos cards otimizadas, LCP priorizado, pouco JS.
- **Imagens dos cards nomeadas por funil:** `card-casamentos_home`, `card-corporativo_home`, `card-debutante_home`, etc. (convenção já usada no afrikan).

## Slugs de destino (padrão)

`/casamentos` · `/eventos-corporativos` · `/eventos-corporativos-confraternizacoes` · `/debutantes` · `/aniversarios` · `/formaturas`

---

## Para quem cria o HTML no Claude Design

Monte a home como uma página curta:
- Logo + a pergunta + N cards (um por tipo de evento que o cliente atende).
- Cada card: imagem + nome do evento + botão "Solicitar orçamento".
- **O botão de cada card deve apontar para o slug do funil** (ex.: `href="/eventos-corporativos"`). Se não souber o slug, use o nome do evento e nós ajustamos.
- **Sem formulário, sem WhatsApp, sem GTM/analytics** no HTML (as regras gerais do Design Brief valem aqui também).
- Entregue as imagens dos cards nomeadas por tipo (`card-casamentos.jpg`, `card-corporativo.jpg`, …).

## Para a IA (implementação)

- A home é `src/pages/index.astro`, usando `<Base ... hideWhatsApp={true}>` (o template já aceita a prop).
- Os cards linkam para os slugs padrão dos funis existentes no projeto.
- Adicione um evento de dataLayer no clique de cada card (`escolha_funil`).
- Quando a home passar a existir, **remova o redirect temporário** `/` → `/<funil>` do `astro.config.mjs`.

## Implementação de referência (validada no Casa Kefren)

**Frontmatter** — cards data-driven; funis sem LP ainda vão pro WhatsApp:
```js
const CDN = config.media.cdn_base + '/photos';
const wa = (msg) => `https://wa.me/${config.whatsapp.phone}?text=${encodeURIComponent(msg)}`;
const cards = [
  { funil: 'casamento',   label: 'Casamento',   img: `${CDN}/card-casamento.webp`,
    href: wa('Olá! Gostaria de um orçamento para um casamento na <Cliente>.'), external: true },
  { funil: 'corporativo', label: 'Corporativo', img: `${CDN}/card-corporativo.webp`,
    href: '/eventos-corporativos', external: false },
];
```

**Corpo** — cada card é um `<a>` com `data-funil`; script mede o clique:
```astro
<Base title="…" canonical={`https://${config.domain}/`} hideWhatsApp={true}>
  <main class="home">
    <h1>Que tipo de <em>evento</em> você vai realizar?</h1>
    <div class="home-grid">
      {cards.map((c) => (
        <a class="tri-card" href={c.href} data-funil={c.funil}
           {...(c.external ? { target: '_blank', rel: 'noopener' } : {})}>
          <img src={c.img} alt={`Eventos — ${c.label}`} loading="lazy" />
          <div class="tri-card-body"><h2>{c.label}</h2><span class="tri-cta">Solicitar orçamento →</span></div>
        </a>
      ))}
    </div>
  </main>
  <script>
    document.querySelectorAll('[data-funil]').forEach((el) => el.addEventListener('click', () => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'escolha_funil', funil: el.getAttribute('data-funil') });
    }));
  </script>
</Base>
```

**CSS** (`src/styles/home.css`): `@font-face` da marca + tokens + layout. `.tri-card` = aspect-ratio 3/4, imagem `position:absolute; z-index:-2`, gradiente `::before`, hover zoom; grid 3→1 coluna no mobile; fundo charcoal herdando a identidade do cliente.
