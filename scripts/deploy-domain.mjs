// Valida o deploy.remote_path do config.json e devolve o domínio (nome da pasta em /var/www).
// Existe para evitar o acidente crítico: com barra no fim ("/var/www/site.com/") o nome da
// pasta virava vazio e o `rsync --delete` rodava em /var/www/, apagando os sites de todos os clientes.
// Qualquer valor fora de /var/www/<dominio> ABORTA o deploy antes de enviar qualquer coisa.
import { createRequire } from "module";
import { fileURLToPath } from "url";

export function getDeployDomain(remotePath) {
  const p = String(remotePath ?? "").trim().replace(/\/+$/, "");
  const m = p.match(/^\/var\/www\/([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)$/);
  if (!m) {
    console.error(
      `Deploy abortado: deploy.remote_path inválido (${JSON.stringify(remotePath)}).
` +
      `Use o formato /var/www/<dominio>, ex.: /var/www/eventos.cliente.com.br`
    );
    process.exit(1);
  }
  return m[1];
}

// Uso no GitHub Actions: DOMAIN=$(node scripts/deploy-domain.mjs)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = createRequire(import.meta.url)("../config.json");
  console.log(getDeployDomain(config.deploy?.remote_path));
}
