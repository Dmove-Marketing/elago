# Tracking & GTM — contrato do site com o container padrão

O container de GTM padrão da Dmove (`GTM-PKJ6HVMP`) foi construído esperando **sinais específicos** do site. Se o site não os produz, UTMs, Enhanced Conversions e dedup de CAPI chegam **vazios** — o template de GTM parece "não funcionar", mas o problema é o site não alimentá-lo. Este documento é o contrato. O `UTMCapture.astro` e o `forms.ts` deste template já cumprem tudo abaixo.

## O que o GTM LÊ × o que o site DEVE produzir

| O GTM lê… | De onde | O site produz em… |
|---|---|---|
| `utm_source/medium/campaign/content/term` | **cookie** 1st-party | `UTMCapture` grava cookie (90d) |
| `gclid/gbraid/wbraid/fbclid/…` | cookie / URL | `UTMCapture` grava cookie (90d) |
| `_external_id` | **cookie** 1st-party | `UTMCapture` gera UUID + grava (365d) |
| E-mail (Enhanced Conv.) | DOM `#form-field-email` / `input[type=email]` | campo com `id="form-field-email"` |
| Telefone (Enhanced Conv.) | DOM `#form-field-telefone` / `input[name=WhatsApp]` | campo com `id="form-field-telefone"` |
| Nome (Enhanced Conv.) | DOM `#form-field-nome` / `input[name=Nome]` | campo com `id="form-field-nome"` |
| `event_id` (dedup CAPI) | `window.__page_event_id` | `UTMCapture` define UUID por pageview |
| gatilho de conversão | dataLayer `form_submit` | `forms.ts` / `WhatsAppWidget` disparam |

## Por que COOKIE e não sessionStorage

O GTM lê UTM de cookie. Além disso, **cookie persiste** (90 dias) — sobrevive a fechar a aba, abrir em nova aba e voltar dias depois. `sessionStorage` morre com a aba → perde atribuição. Por isso o padrão é cookie.

## `event_id` e dedup Pixel × CAPI

`UTMCapture` gera um UUID por pageview em `window.__page_event_id` **e** o coloca no `dmove_tracking`. O Pixel (browser, via GTM) usa `window.__page_event_id`; o `forms.ts`/`WhatsAppWidget` mandam o **mesmo** `event_id` no webhook (→ n8n → CAPI). Mesmo id nos dois lados = a Meta deduplica a conversão.

## dataLayer — eventos padrão (limpos, sem PII)

O GTM lê PII do **DOM** (Enhanced Conversions), então o dataLayer **não** carrega PII. Contrato:

```js
// form_submit (form E WhatsApp — mesma estrutura)
{ event: 'form_submit', form_source: 'form' | 'whatsapp', form_id, project, tipo_evento, event_id }
// form_start:  { event:'form_start', form_source, form_id, project }
// form_error:  { event:'form_error', form_source, form_id, error }
// page_meta:   { event:'page_meta', page_path, ...utms, external_id, event_id }  (UTMCapture)
// escolha_funil (home de triagem): { event:'escolha_funil', funil }
```

`form_source` distingue a origem (formulário da página × popup do WhatsApp) sem depender de string do `form_id`.

## QA de tracking (obrigatório antes do deploy)

Validar em runtime (Playwright) replicando os `cJS` do container — acessar com `?utm_source=google&gclid=...`, preencher o form e checar:
- cookies `utm_source`, `utm_campaign`, `gclid`, `_external_id` setados;
- `window.__page_event_id` definido;
- os seletores de Enhanced Conversion (`#form-field-email/telefone/nome`) retornam os valores.

Depois, o **cliente valida no GTM Preview / Tag Assistant** (logado) que as tags disparam. Só disparar lead de teste real no n8n com o OK do usuário.

## Não capturado (limitações conhecidas)

- **Leads via WhatsApp direto** (ex.: cards da home de triagem que vão pro `wa.me`): não passam pelo form, então Enhanced Conversions não capturam PII. Medir pelo evento de clique e, se preciso, anexar a origem na mensagem do `wa.me`.
