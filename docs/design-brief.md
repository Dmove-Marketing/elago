# Design Brief — Como construir o HTML no Claude Design

**Para quem cria o HTML da landing page no Claude Design.**
**Objetivo:** entregar um HTML que já nasce "pronto para conversão". Quanto mais este brief for seguido, mais rápido a página vai pro ar em Astro e com menos erro. Cada regra abaixo nasceu de um problema real que atrasou uma implementação.

> Regra de ouro: **o visual pode ser 100% livre e criativo** — o que padronizamos é o "esqueleto" técnico por trás. Capriche no design; só siga as regras de estrutura, mídia e formulário.

---

## O pacote de entrega

Entregue numa pasta do Google Drive:

1. **O arquivo `.html`** da página
2. **Pasta `imagens/`** — todas as imagens usadas, com nomes descritivos
3. **`favicon`** — o ícone do site (junto das imagens)
4. **Fontes** — se usar fonte que não é do Google Fonts (`.woff2` ou `.ttf`)
5. **Vídeos** (se houver) — o arquivo `.mp4`/`.webm`

---

## As 8 regras

### 1. Imagens: NUNCA em base64 — referencie por nome
Esta é a regra mais importante. O Claude Design tende a embutir as imagens dentro do HTML (base64), o que gera arquivos de dezenas de MB e nos obriga a "adivinhar" qual imagem é qual, na mão.

- ❌ **Evite:** `<img src="data:image/jpeg;base64,/9j/4AAQ...">` (milhares de caracteres)
- ✅ **Faça:** `<img src="imagens/hero-corporativo.jpg" alt="Salão decorado para evento">`
- Use o **mesmo nome** do arquivo entregue na pasta. Assim a imagem entra direto no nosso CDN sem retrabalho.
- Sempre com `alt` descritivo (bom pra SEO e pra sabermos o que é cada imagem).

### 2. Favicon: entregue junto com as imagens
O ícone que aparece na aba do navegador. Entregue um arquivo quadrado (PNG, mín. 256×256). Sem ele, temos que improvisar a partir do logo.

### 3. Vídeos: arquivo separado, nunca base64
Mesma lógica das imagens. Um vídeo em base64 deixou um HTML com **26 MB**. Entregue o `.mp4`/`.webm` na pasta e referencie normalmente no `<video>`.

### 4. Fontes: prefira Google Fonts
- ✅ **Ideal:** usar fontes do Google Fonts (carregam sozinhas).
- Se o design pedir uma **fonte específica**, entregue os arquivos (`.woff2` de preferência, ou `.ttf`) na pasta.
- Declare a fonte com uma variável no `:root` (ver regra 5).

### 5. Cores e fontes como variáveis no `:root`
No `<style>`, defina a paleta e as fontes como CSS variables. Isso já vem sendo feito bem — mantenha.
```css
:root {
  --cor-primaria: #1a73e8;   /* cor principal da marca */
  --cor-fundo: #ffffff;      /* fundo da página */
  --fonte-titulo: "Nome da Fonte", sans-serif;
}
```

### 6. Seções semânticas com `id`
Cada bloco da página numa `<section>` com um `id` que descreve o conteúdo. Isso já vem sendo feito bem.
```html
<section class="hero" id="topo"> ... </section>
<section class="contato" id="contato"> ... </section>
```

### 7. Formulário: use o PADRÃO Dmove (ver abaixo) e NÃO escreva o envio
- Monte os campos com os **nomes exatos** da tabela padrão (senão o lead chega torto no sistema).
- **Marque os obrigatórios** com `required`.
- ❌ **Não escreva** JavaScript de envio (nada de `fetch`, "enviar por e-mail", Formspree, etc.). Nós ligamos o formulário ao sistema depois.
- Pode estilizar o formulário à vontade — só mantenha os campos e nomes.

### 8. Nada de tracking/analytics no HTML
Não coloque Google Tag Manager, Google Analytics, Pixel, `dataLayer` nem cookies. Tudo isso é injetado por nós automaticamente. Colocar duplica e quebra a medição.

---

## O padrão de formulário Dmove

Todo formulário de captação segue estes campos e **nomes** (`name`):

| Campo (`name`) | Label exibido | Tipo | Obrigatório? |
|---|---|---|---|
| `nome` | Nome | texto | Sim |
| `telefone` | Telefone | telefone | Sim |
| `email` | E-mail | e-mail | Sim |
| `tipo_evento` | Tipo de evento | **lista (select)** | Sim |
| `data_evento` | Data do evento | data | Sim |
| `convidados` | Número de convidados | número | Sim |
| `detalhes_adicionais` | **Detalhes do evento (não obrigatório)** | área de texto | **Não** (único opcional) |

**Regra do funil:**
- **Páginas corporativas** (ex.: `/eventos-corporativos`): adicione o campo **`empresa` — "Nome da empresa"** como **primeiro** campo (obrigatório).
- **Páginas sociais** (casamentos, debutantes, aniversários, formaturas): **sem** o campo empresa.

O campo "Tipo de evento" e a data podem vir como campos simples — nós trocamos pelo select completo e pelo calendário padrão na implementação. O importante é o **nome** do campo estar certo.

---

## Slugs padrão (nome da página na URL)

Use estes caminhos quando aplicável:
`/casamentos` · `/eventos-corporativos` · `/eventos-corporativos-confraternizacoes` · `/debutantes` · `/aniversarios` · `/formaturas`

---

## Checklist antes de entregar

```
[ ] HTML sem imagens em base64 (referenciadas por nome)
[ ] Pasta de imagens com nomes descritivos + alt em cada <img>
[ ] Favicon incluído
[ ] Vídeos como arquivo separado (se houver)
[ ] Fontes entregues (se não for Google Fonts)
[ ] Cores/fontes em variáveis :root
[ ] Seções com id semântico
[ ] Formulário com os names padrão + obrigatórios marcados + SEM JS de envio
[ ] "Nome da empresa" como 1º campo se for página corporativa
[ ] Nenhum GTM/Analytics/Pixel no HTML
```
