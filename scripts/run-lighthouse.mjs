import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';

const baseUrl = 'http://localhost:4321';
const outputDir = path.join(process.cwd(), 'scripts', 'lighthouse-reports');
const reportMdPath = path.join(process.cwd(), 'lighthouse_report.md');

// 1. Encontra todas as páginas Astro na pasta src/pages automaticamente
function discoverPages() {
  const pagesDir = path.join(process.cwd(), 'src', 'pages');
  if (!fs.existsSync(pagesDir)) {
    console.error(`❌ Diretório src/pages não encontrado.`);
    process.exit(1);
  }

  const files = fs.readdirSync(pagesDir);
  const detected = files
    .filter(f => f.endsWith('.astro'))
    .map(f => {
      const slug = f.replace('.astro', '');
      const route = slug === 'index' ? '/' : `/${slug}`;
      const prettyName = slug === 'index' 
        ? 'Home' 
        : slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return { name: prettyName, path: route };
    });

  const ignoreHome = process.argv.includes('--ignore-home') || true;
  return ignoreHome ? detected.filter(p => p.path !== '/') : detected;
}

// 2. Verifica se a porta 4321 já está rodando
function isServerRunning() {
  return new Promise((resolve) => {
    const req = http.request({ host: 'localhost', port: 4321, method: 'HEAD', timeout: 1000 }, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const pages = discoverPages();
  console.log(`\n🔍 Páginas detectadas para análise:`);
  pages.forEach(p => console.log(`   - ${p.name} (${p.path})`));

  let serverProcess = null;
  const alreadyRunning = await isServerRunning();

  if (!alreadyRunning) {
    console.log(`\n🚀 Servidor de preview não está rodando. Iniciando em segundo plano com "npm run preview"...`);
    try {
      console.log('📦 Executando build de produção antes do teste...');
      execSync('npm run build', { stdio: 'inherit' });
    } catch (e) {
      console.error('❌ Falha ao compilar o build. Abortando.');
      process.exit(1);
    }

    serverProcess = spawn('npm', ['run', 'preview'], { shell: true, stdio: 'ignore' });
    
    let attempts = 0;
    let up = false;
    while (attempts < 10) {
      await sleep(1500);
      up = await isServerRunning();
      if (up) break;
      attempts++;
    }
    
    if (!up) {
      console.error('❌ Não foi possível iniciar o servidor preview na porta 4321.');
      serverProcess.kill();
      process.exit(1);
    }
    console.log('✅ Servidor iniciado com sucesso.');
  } else {
    console.log(`\n✅ Usando servidor já ativo na porta 4321.`);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results = [];

  for (const page of pages) {
    const url = `${baseUrl}${page.path}`;
    const reportPath = path.join(outputDir, `${page.name.replace(/\s+/g, '_').toLowerCase()}.json`);
    console.log(`\n========================================`);
    console.log(`Auditando ${page.name} (${url})...`);
    console.log(`========================================\n`);

    let auditSuccess = false;
    try {
      const cmd = `npx -y lighthouse "${url}" --chrome-flags="--headless --no-sandbox" --output=json --output-path="${reportPath}"`;
      execSync(cmd, { stdio: 'inherit' });
      auditSuccess = true;
    } catch (err) {
      console.log(`Lighthouse finalizado (verificando se o arquivo JSON foi gravado)...`);
    }

    if (fs.existsSync(reportPath)) {
      try {
        const reportJson = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const categories = reportJson.categories || {};
        const audits = reportJson.audits || {};

        const performance = Math.round((categories.performance?.score || 0) * 100);
        const accessibility = Math.round((categories.accessibility?.score || 0) * 100);
        const bestPractices = Math.round((categories['best-practices']?.score || 0) * 100);
        const seo = Math.round((categories.seo?.score || 0) * 100);

        const fcp = audits['first-contentful-paint']?.displayValue || 'N/A';
        const lcp = audits['largest-contentful-paint']?.displayValue || 'N/A';
        const cls = audits['cumulative-layout-shift']?.displayValue || 'N/A';
        const tbt = audits['total-blocking-time']?.displayValue || 'N/A';
        const speedIndex = audits['speed-index']?.displayValue || 'N/A';

        results.push({
          name: page.name,
          path: page.path,
          performance,
          accessibility,
          bestPractices,
          seo,
          fcp,
          lcp,
          cls,
          tbt,
          speedIndex
        });

        console.log(`📊 Notas de ${page.name} -> Desempenho: ${performance} | Acessibilidade: ${accessibility} | Melhores Práticas: ${bestPractices} | SEO: ${seo}`);
        auditSuccess = true;
      } catch (parseErr) {
        console.error(`❌ Erro ao ler JSON da página ${page.name}:`, parseErr.message);
      }
    }

    if (!auditSuccess) {
      console.error(`❌ Falha geral na auditoria da página ${page.name}`);
      results.push({ name: page.name, path: page.path, error: 'Falha ao processar relatório.' });
    }

    await sleep(2000);
  }

  if (serverProcess) {
    console.log(`\n🛑 Encerrando o servidor local em segundo plano...`);
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
    } else {
      serverProcess.kill('SIGINT');
    }
  }

  let md = `# Relatório de Desempenho e SEO (Lighthouse)\n\n`;
  md += `Relatório gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
  md += `Este relatório apresenta a análise de desempenho para as páginas do projeto **Villa Cidade Jardim**.\n\n`;

  md += `## Resumo Geral das Notas\n\n`;
  md += `| Página | Desempenho | Acessibilidade | Melhores Práticas | SEO |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: |\n`;

  for (const res of results) {
    if (res.error) {
      md += `| [${res.name}](${baseUrl}${res.path}) | ❌ Erro | ❌ Erro | ❌ Erro | ❌ Erro |\n`;
    } else {
      const perfIcon = res.performance >= 90 ? '🟢' : res.performance >= 50 ? '🟡' : '🔴';
      const accIcon = res.accessibility >= 90 ? '🟢' : res.accessibility >= 50 ? '🟡' : '🔴';
      const bpIcon = res.bestPractices >= 90 ? '🟢' : res.bestPractices >= 50 ? '🟡' : '🔴';
      const seoIcon = res.seo >= 90 ? '🟢' : res.seo >= 50 ? '🟡' : '🔴';

      md += `| [${res.name}](${baseUrl}${res.path}) | ${perfIcon} ${res.performance} | ${accIcon} ${res.accessibility} | ${bpIcon} ${res.bestPractices} | ${seoIcon} ${res.seo} |\n`;
    }
  }

  md += `\n> [!NOTE]\n> **Legenda das notas:**\n> - 🟢 90-100: Bom\n> - 🟡 50-89: Precisa de melhorias\n> - 🔴 0-49: Ruim\n\n`;

  md += `## Métricas Detalhadas (Core Web Vitals)\n\n`;
  md += `| Página | FCP | LCP | CLS | TBT | Speed Index |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const res of results) {
    if (res.error) {
      md += `| ${res.name} | N/A | N/A | N/A | N/A | N/A |\n`;
    } else {
      md += `| ${res.name} | ${res.fcp} | ${res.lcp} | ${res.cls} | ${res.tbt} | ${res.speedIndex} |\n`;
    }
  }

  md += `\n## Recomendações e Análise\n\n`;

  for (const res of results) {
    if (res.error) continue;
    md += `### ${res.name}\n\n`;
    md += `- **Desempenho**: ${res.performance}/100\n`;
    md += `- **Acessibilidade**: ${res.accessibility}/100\n`;
    md += `- **Melhores Práticas**: ${res.bestPractices}/100\n`;
    md += `- **SEO**: ${res.seo}/100\n\n`;

    if (res.performance < 90) {
      md += `> [!TIP]\n`;
      md += `> **Oportunidades de Desempenho:**\n`;
      md += `> - Use o componente \`<Img>\` com a propriedade \`priority\` para o banner Hero (LCP) em vez de CSS \`background-image\`.\n`;
      md += `> - Reduza scripts de terceiros não essenciais ou use carregamento adiado (defer/async).\n\n`;
    } else {
      md += `> [!NOTE]\n`;
      md += `> Excelente desempenho! A página está bem otimizada.\n\n`;
    }
  }

  fs.writeFileSync(reportMdPath, md);
  console.log(`\n🎉 Relatório final gerado com sucesso em: ${reportMdPath}`);
  console.log(`📂 Relatórios detalhados individuais salvos na pasta: scripts/lighthouse-reports/\n`);
}

main().catch(err => {
  console.error('❌ Erro inesperado durante a execução:', err);
  process.exit(1);
});
