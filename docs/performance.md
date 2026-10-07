# Performance — playbook para LP de campanha rápida

LP de campanha **lenta queima verba**: pior Quality Score no Google/Meta, mais bounce, menos conversão. O alvo é um **primeiro carregamento extremamente rápido no mobile** (a maioria do tráfego). Este documento é o aprendizado consolidado de otimizar uma LP real do 59 → 90+ no PageSpeed mobile. Leia antes de "otimizar no achismo".

> Caso real (Fit Eventos / debutantes): 59 → 76 só corrigindo o LCP e deferindo libs; depois subiu mais cortando peso de imagem. O maior salto veio de **um erro que a gente mesmo tinha introduzido** (ver regra nº 1).

---

## Método (não otimize no escuro)

1. **Meça no build de produção, nunca no dev.** `npm run build` minifica, faz code-split e otimiza imagem; o `dev` não. Números do dev enganam.
2. **PageSpeed Insights (aba Mobile)** é a fonte da verdade. Olhe as **métricas** (LCP, FCP, TBT, CLS, SI) antes das "oportunidades" — o score é dominado por elas, principalmente **LCP**.
3. **Ataque o gargalo dominante primeiro.** Um LCP de 11s não melhora encolhendo imagem de rodapé. Ordene por impacto real, não por tamanho da lista.
4. **Valide cada mudança com evidência:** rebuild + inspecione o `dist/` (tamanho de JS/CSS render-blocking, tamanho das imagens, `<head>`). Depois rode o PageSpeed de novo.
5. **Ignore o ruído de terceiros** (ver última seção) — você vai perder tempo com coisa que não controla.

---

## Regra nº 1 — a imagem LCP é `eager` + `fetchpriority="high"`. NUNCA `lazy`.

O maior erro que cometemos: para evitar download duplicado, deixamos a imagem do hero (o elemento LCP) como `loading="lazy"`. Resultado: **o navegador jogou ela pro fim da fila**, atrás de fontes/CSS/JS, e o **LCP foi para 11,7s**.

- A imagem LCP (hero acima da dobra) usa `<Img priority />` → gera `loading="eager" fetchpriority="high"`.
- Tudo o mais é `lazy` (padrão do `<Img>`).
- `lazy` numa imagem LCP é anti-padrão mesmo com preload. Não faça.

---

## Regra nº 2 — carrossel de slides empilhados: `lazy` NÃO adia nada

Padrão comum de hero: N slides `position:absolute; inset:0` empilhados, alternando `.active`. **Todos estão "na viewport"** → `loading="lazy"` carrega **todos** no primeiro load. Num hero de 6+6 imagens isso são ~700 KB baixados à toa.

**Solução — carregamento sob demanda (`defer`):**
- Só o **slide 1** (o ativo/LCP) tem `src` real.
- Slides 2..N usam `data-src` (não baixam). Um prop `defer` no `<Img>` renderiza `data-src` via `getImage()`.
- O JS do carrossel carrega o **próximo** slide antes de ele aparecer, e **pula o track oculto do outro viewport** (`offsetParent === null` = `display:none`) para não baixar a versão desktop no mobile e vice-versa.

```js
// carrossel: só o slide ativo tem src; os outros carregam JIT (e pula os ocultos)
function loadSlide(idx) {
  [dSlides[idx], mSlides[idx]].forEach(function (slide) {
    if (!slide || slide.offsetParent === null) return; // display:none → pula
    var img = slide.querySelector('img[data-src]');
    if (img) { img.src = img.getAttribute('data-src'); img.removeAttribute('data-src'); }
  });
}
loadSlide(1);                              // pré-carrega o próximo
// ...dentro do setInterval, após trocar de slide:
loadSlide((current + 1) % total);          // pré-carrega o seguinte
```

Prop `defer` no componente `Img.astro` (gera a URL otimizada mas não baixa):

```astro
const deferred = defer && mod ? await getImage({ src: mod.default, width, height, quality }) : null;
const blankPixel = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
---
{deferred ? (
  <img src={blankPixel} data-src={deferred.src} alt={alt} width={width} height={height}
       loading="lazy" decoding="async" class={className} style={style} />
) : /* ...render normal com <Image> */ }
```

---

## Regra nº 3 — `eager` + `display:none` **ainda baixa** a imagem

Hero com dois tracks (`.hero-d` desktop / `.hero-m` mobile) alternados por CSS: se ambos os primeiros slides forem `eager`, os **dois** baixam em qualquer viewport (no mobile baixa a versão desktop de 300+ KB à toa). `lazy` + `display:none` **não** baixa; `eager` + `display:none` **baixa**.

- Slide 1 do viewport principal (mobile, a maioria): `priority` (eager+high) = o LCP.
- Slide 1 do outro viewport: `defer` ou `lazy` (fica oculto → não baixa no viewport principal).

---

## Regra nº 4 — preload do LCP deve casar **exatamente** com a URL da imagem

Preload media-scoped acelera o LCP, mas se o `href` não for **idêntico** ao `src` que o `<Image>` gera, o navegador baixa **duas vezes** (pior). Gere a URL com o **mesmo** `getImage()` (mesmos `width`/`quality`) e valide no build.

```astro
---
import { getImage } from 'astro:assets';
import heroMobileSrc from '../assets/images/heromobile-01.webp';
const heroMobile = await getImage({ src: heroMobileSrc, width: 640, quality: 74 }); // == props do <Img>
---
<Fragment slot="head">
  <link rel="preload" as="image" href={heroMobile.src} media="(max-width: 768px)" fetchpriority="high" />
</Fragment>
```

Validação no `dist/` (tem que casar):
```bash
grep -oE 'preload[^>]*heromobile-01[^" ]*\.webp' dist/<slug>/index.html   # href do preload
grep -oE '<img src="/_astro/heromobile-01[^"]*\.webp"' dist/<slug>/index.html  # src da img
# os hashes DEVEM ser iguais
```

> Se você mudar `width`/`quality` da imagem LCP, **atualize também o `getImage()` do preload**, senão volta a baixar 2×.

---

## Regra nº 5 — dimensione e comprima a imagem para o que é EXIBIDO

Imagem de 1200px exibida num card de 372px é ~55% de bytes desperdiçados. Regra: `width ≈ (px CSS exibido) × 2` (retina), não o tamanho do arquivo original.

| Uso | `width` típico | `quality` |
|---|---|---|
| Hero mobile (LCP) | 600–720 | 72–74 |
| Cards de grid (exibidos ~370px) | 700–800 | 72 |
| Imagem de seção (exibida ~450px) | 800–900 | 72 |
| Logo/ícone pequeno | 2× o tamanho exibido | — |

- Fotos aceitam `quality: 72` sem perda perceptível (ainda mais sob overlay/escurecimento). Default 80 é conservador demais para grids.
- O `<Img>` aceita `width` e `quality` por chamada — use.

---

## Regra nº 6 — libs pesadas (flatpickr etc.) carregam **sob demanda**

flatpickr = ~50 KB de JS + ~15 KB de CSS que **só é usado ao focar o campo de data**. Importar estático coloca isso no caminho crítico de toda página. Carregue dinamicamente na primeira interação:

```js
let _fp = null;
async function ensureFlatpickr() {
  if (!_fp) {
    ensureFlatpickrCss();                          // ver regra 7
    const [fp, l10n] = await Promise.all([
      import('flatpickr'),
      import('flatpickr/dist/l10n/pt.js'),
    ]);
    _fp = { flatpickr: fp.default, Portuguese: l10n.Portuguese };
  }
  return _fp;
}
// no campo de data (readonly): carrega no primeiro focus/click, depois abre
el.addEventListener('focus', async () => { const { flatpickr, Portuguese } = await ensureFlatpickr(); flatpickr(el, {...}).open(); }, { once: true });
```

Custo: um micro-atraso (~100 ms) na **primeira** abertura do calendário. Vale muito pelo ganho no load inicial.

---

## Regra nº 7 — CSS de lib: NÃO use `@import` global nem `import('x.css')` dinâmico

Duas armadilhas do Astro que descobrimos na marra:

1. **`@import 'flatpickr/.../flatpickr.min.css'` no `global.css`** → vira folha **render-blocking em TODA página** (o Astro só nomeia o chunk de forma enganosa, ex.: "LeadForm.css"). Nunca importe CSS de lib no `global.css`.
2. **`import('flatpickr/.../flatpickr.min.css')` dinâmico dentro de `<script>`** → o Astro/Vite **hoista** esse CSS para render-blocking mesmo assim. Import dinâmico de CSS **não** é deferido.

**Solução:** copie o CSS da lib para `public/vendor/` e injete um `<link>` sob demanda (aí sim fica fora do caminho crítico):

```js
function ensureFlatpickrCss() {
  if (document.getElementById('flatpickr-css')) return;
  const l = document.createElement('link');
  l.id = 'flatpickr-css';
  l.rel = 'stylesheet';
  l.href = '/vendor/flatpickr.min.css';
  document.head.appendChild(l);
}
```

O tema/override (`.flatpickr-day.selected {…}`) fica no CSS da página normalmente; só a base estrutural da lib é que sai do crítico.

---

## Regra nº 8 — fonte: self-host, mas NÃO faça over-preload

- **Self-host** a fonte (`public/fonts/` + `@font-face`) e **remova o Google Fonts** do `<head>`. Google Fonts custa ~750 ms (CSS de terceiro) + ~550 ms (woff2) no caminho crítico, mesmo com preconnect.
- Baixe só os subsets necessários: **latin + latin-ext** (cobre acentos do português). Ignore cyrillic/greek/vietnamese.
- Use `font-display: swap` (texto aparece na fonte de fallback na hora).
- **NÃO faça preload de fonte** numa LP com hero de imagem: o preload da fonte **compete por banda com a imagem LCP**. Com `swap`, o texto já aparece; deixe a imagem LCP ganhar a prioridade.
- Não carregue 6 pesos se o design usa 3. Cada peso é ~48 KB.

Snippet para gerar o CSS self-hosted a partir do Google Fonts (UA de Chrome retorna woff2):
```bash
curl -s -A "Mozilla/5.0 ... Chrome/120" \
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" -o /tmp/f.css
# extrair blocos latin/latin-ext, baixar os .woff2 para public/fonts/, reescrever src para /fonts/*.woff2
```

---

## Regra nº 9 — cache de CDN: assets com hash auto-invalidam; `public/` não

- Arquivos processados pelo Astro (`/_astro/*.webp`, `*.js`, `*.css`) têm **hash no nome** → ao mudar o conteúdo, muda a URL → o Cloudflare serve a versão nova na hora.
- Arquivos em **`public/`** (avatar, favicon, `og-default.jpg`, `vendor/*`) têm **URL fixa** → o Cloudflare serve a versão **antiga em cache** mesmo depois do deploy. Se trocar o conteúdo de um deles, **renomeie o arquivo** (ex.: `avatar.png` → `avatar-sm.png` + atualiza a referência) para forçar URL nova. Ou purgue o cache do CDN, se tiver acesso.

> Sintoma clássico: você reduz o `avatar.png` de 38 KB → 6 KB, deploya, e o PageSpeed ainda acusa 38 KB. É cache de CDN na URL fixa.

---

## O que NÃO adianta perseguir (terceiros / tracking)

Estes aparecem no PageSpeed mas **não são nossos** — são necessários para as campanhas e/ou controlados pelo provedor. Não gaste tempo:

- **GTM / gtag** (`googletagmanager.com`) — ~250 KB de "JS não usado". É o tracking de conversão das campanhas; carrega async; enxugar = mexer no container do GTM (arriscado, fora de escopo).
- **Meta Pixel** (`fbevents.js`) — inclui o "JavaScript legado"/polyfills. É do Facebook.
- **Clarity, Cloudflare beacon** — utilitários de terceiros; cache/peso são deles.

Foco fica em **imagem, JS/CSS próprio, fonte e caminho crítico**.

---

## Checklist rápido (rodar antes de publicar)

- [ ] Imagem LCP (hero) com `priority` (eager + fetchpriority=high), **nunca lazy**.
- [ ] Carrossel empilhado: slides não-ativos com `defer` (data-src) + JS carrega sob demanda, pulando o track oculto.
- [ ] Preload do LCP media-scoped, `href` **idêntico** ao `src` da imagem (validado no `dist/`).
- [ ] Imagens dimensionadas ao exibido (`width ≈ display×2`), `quality: 72` em fotos de grid.
- [ ] flatpickr/libs pesadas com import dinâmico sob demanda.
- [ ] CSS de lib fora do `global.css`; servido de `public/vendor/` e injetado on-demand.
- [ ] Fonte self-hosted (latin+latin-ext), `display: swap`, **sem** preload de fonte competindo com o LCP.
- [ ] Trocou conteúdo de arquivo em `public/`? Renomeou para bustar o cache do CDN.
- [ ] Mediu no **build de produção** + PageSpeed mobile, focando no **LCP** primeiro.

---

## Referência rápida de números (do caso real)

| Ação | Ganho |
|---|---|
| LCP `lazy` → `eager+high` | LCP 11,7s → ~2s |
| Deferir flatpickr (JS+CSS) | −50 KB JS + −15 KB CSS do crítico |
| Hero: 6 imagens empilhadas → só a 1ª | −~500 KB no 1º load mobile |
| Self-host fonte | −2 conexões de terceiro (~1,3s no crítico) |
| Grids 1200/q80 → 800/q72 | −~55% por imagem |
| Avatar 568px/38KB → 128px/6KB | −84% |
