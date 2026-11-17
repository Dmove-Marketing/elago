# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server at http://localhost:4321
npm run build      # Static build to dist/
npm run preview    # Preview built site
npm run scaffold   # Convert HTML files from _html-originais/ to Astro pages
npm run deploy     # Build + scp dist/ para o servidor configurado em config.json
```

**Deploy:** `npm run deploy` — lê `deploy.user`, `deploy.server` e `deploy.remote_path` do `config.json` e envia `dist/` via `scp`. Antes do primeiro deploy, preencha esses campos no `config.json` do projeto. O script aborta com mensagem clara se `deploy.server` estiver vazio. **`deploy.remote_path` deve ser exatamente `/var/www/<dominio>` (sem barra no fim):** `scripts/deploy-domain.mjs` valida isso e aborta o `npm run deploy` e o workflow do GitHub Actions antes do `rsync --delete`. Nunca remova essa validação — uma barra no fim já fez o rsync mirar `/var/www/` e apagar os sites de todos os clientes.

## Checklist de novo projeto

1. Edite `config.json`: `project_name`, `project_slug`, `client`, `tracking.gtm_id`, `forms.lead-form.webhooks[0]`, `deploy.*`
2. Coloque o HTML exportado do Elementor em `_html-originais/`
3. Rode `npm run scaffold` para gerar as páginas Astro automaticamente
4. Revise cada `.astro` gerado: ajuste `title`, `description`, `ogImage`, `canonical`
5. Substitua os placeholders de imagem em `src/assets/images/` pelos arquivos reais
6. Coloque favicon e logo em `public/images/` (`icone.png`, `logotipo.webp`, `og-default.jpg`)
7. Ajuste as cores em `src/styles/global.css` (variáveis `--color-primary`, `--bg-primary`, etc.)
8. Teste localmente: `npm run dev`
9. Deploy: defina `environment: "production"` no `config.json`, então `npm run deploy`

## Architecture

This is an **Astro static site** (output: `static`) used as a client landing-page template by the Dmove agency.

### Key files

- **`config.json`** — project-level config: `project_slug`, GTM ID, form webhook URLs, required fields, and redirect URL. All pages import this at build time.
- **`src/layouts/Base.astro`** — mandatory wrapper for every page. Accepts `title`, `description`, `ogImage`, `canonical`, `noIndex`, `theme` (`dark`/`light`), `jsonLd` props. Injects GTM, UTM capture, fonts, and JSON-LD automatically based on `config.json`.
- **`src/components/forms/LeadForm.astro`** — reusable lead form component. Reads webhook URL and redirect from props; auto-initializes `forms.ts` via its own `<script>`. Supports a `prefix` prop that scopes all CSS class names to avoid conflicts when the page has its own form styles.
- **`src/scripts/forms.ts`** — form submission logic. Reads `data-submit-url`, `data-project`, `data-grid-id`, `data-success-id` from the `<form>` element. Handles honeypot, loading state, GTM push (`form_start`, `form_submit`, `form_error`), success state reveal, and redirect. Attaches tracking data from `sessionStorage` (UTMs, click IDs) to every payload.
- **`src/scripts/smooth-scroll.ts`** — Lenis smooth scroll; exposes instance as `window.__lenis`.
- **`src/components/tracking/UTMCapture.astro`** — captures UTM params and click IDs into `sessionStorage` key `dmove_tracking`; called automatically by `Base.astro` when `config.tracking.enabled` is true.

### UI components (`src/components/ui/`)

- **`Img.astro`** — wrapper do `<Image>` do Astro. Lê de `src/assets/images/` por nome de arquivo. Converte para WebP/AVIF em build time. Prop `priority` ativa `eager + fetchpriority="high"` (use na imagem LCP/hero).
- **`Video.astro`** — player de vídeo self-hosted (arquivo `.mp4` em CDN ou VPS). Lazy-load via Intersection Observer. Gera `VideoObject` JSON-LD automaticamente para indexação pelo Google. Não depende de YouTube.
- **`StaticMap.astro`** — embed do Google Maps com overlay CSS que bloqueia todos os cliques, impedindo pontos de fuga da página.

### Images

All page images live in **`src/assets/images/`**. Astro processes them at build time (WebP conversion, compression, correct dimensions). Never put images in `public/` unless they must bypass processing (favicons, OG images).

Use the `<Img>` component exclusively — never a bare `<img>` tag for content images.

| Situation | `priority` prop |
|---|---|
| First visible image / LCP hero | `priority` (no value needed, it's boolean) |
| Everything else | omit (lazy by default) |

### Videos

Use the `<Video>` component with a publicly accessible `.mp4` URL. Recommended hosting: **Bunny.net** (upload via FTP/panel, URL format: `https://[zone].b-cdn.net/video.mp4`) or the project VPS for short clips. The component generates `VideoObject` JSON-LD automatically — pass `title`, `description`, `uploadDate` (ISO 8601), and `duration` (ISO 8601, e.g. `"PT2M30S"`) for full Google indexing.

Do not use `<VideoEmbed>` (YouTube facade) for primary content videos — use `<Video>` with a self-hosted file.

### Page scaffolding workflow

Place raw HTML files in `_html-originais/`, then run `npm run scaffold`. The script:
1. Extracts `<style>` blocks → `src/styles/<slug>.css`
2. Extracts inline `<script>` blocks → `src/scripts/<slug>.js`
3. Generates `src/pages/<slug>.astro` with proper imports
4. Normalises `<form>` attributes to use `config.json` values and standardises field `name` attributes (`name/whatsapp/phone/e-mail` → `nome/telefone/email`)
5. Injects honeypot field e `forms.ts` import quando um `<form>` é detectado

After scaffolding, review the generated `.astro` and replace image placeholders with actual files in `src/assets/images/`.

### Form field name conventions

Required field names sent to the webhook: `nome`, `email`, `telefone`. The honeypot field must be `name="website"` and stay hidden.

### Tracking data

Submitted with every form payload: UTM params, click IDs (`gclid`, `fbclid`, `ttclid`, etc.), `Fonte` (webhook base URL + UTM query string), `Data`, `Horário`, `URL da página`, `Agente de usuário`, `Desenvolvido por`.

### GTM

The GTM snippet is injected via the standard synchronous snippet (not deferred) so the Google Tag Assistant detects it correctly. The GTM ID is read from `config.tracking.gtm_id`.
