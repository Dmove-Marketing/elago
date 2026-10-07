#!/usr/bin/env node
/**
 * extract-preview.mjs — embrião do scaffold greenfield (Claude Design → Astro)
 * Lê um HTML de preview (com imagens em base64), separa CSS e body,
 * troca cada base64 por um placeholder __IMG_n__ e gera um manifesto
 * com o contexto de cada imagem (alt/classe) para mapeamento manual → CDN.
 *
 * Uso: node tools/extract-preview.mjs <arquivo.html>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename } from 'node:path';

const input = process.argv[2];
if (!input) {
  console.error('Uso: node tools/extract-preview.mjs <arquivo.html>');
  process.exit(1);
}

const html = readFileSync(input, 'utf8');
mkdirSync('_work', { recursive: true });

// 1) <style> block
const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
const style = styleMatch ? styleMatch[1].trim() : '';

// 2) <body> content
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
let body = bodyMatch ? bodyMatch[1] : html;

// 3) trocar base64 por placeholders + coletar manifesto
const manifest = [];
let n = 0;
const replaceB64 = (segmentName, text) =>
  text.replace(/data:([a-z]+)\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/gi, (m, kind) => {
    const id = `__${kind.toUpperCase()}_${n}__`;
    manifest.push({ id, index: n, in: segmentName, kind, bytes: m.length });
    n++;
    return id;
  });

body = replaceB64('body', body);
const styleClean = replaceB64('style', style);

// 4) enriquecer manifesto com contexto (para cada __IMG_n__ no body: alt + tag)
for (const item of manifest) {
  if (item.in !== 'body') continue;
  const idx = body.indexOf(item.id);
  const around = body.slice(Math.max(0, idx - 300), idx + 60);
  const altM = around.match(/alt="([^"]*)"/);
  item.alt = altM ? altM[1] : '';
  item.context = around.replace(/\s+/g, ' ').slice(-160);
}

writeFileSync('_work/style.css', styleClean);
writeFileSync('_work/body.html', body);
writeFileSync('_work/images.json', JSON.stringify(manifest, null, 2));

console.log(`✅ Extraído de ${basename(input)}`);
console.log(`   _work/style.css   (${styleClean.length} chars)`);
console.log(`   _work/body.html   (${body.length} chars)`);
console.log(`   _work/images.json (${manifest.length} imagens: ` +
  `${manifest.filter(m => m.in === 'body').length} no body, ` +
  `${manifest.filter(m => m.in === 'style').length} no CSS)`);
