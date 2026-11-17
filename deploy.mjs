import { execSync } from "child_process";
import { createRequire } from "module";
import { getDeployDomain } from "./scripts/deploy-domain.mjs";

const require = createRequire(import.meta.url);
const config = require("./config.json");

const { user, server, remote_path } = config.deploy ?? {};

if (!server) {
  console.error('Deploy abortado: preencha "deploy.server" no config.json.');
  process.exit(1);
}

// Valida e normaliza o caminho (sem barra no fim, sempre /var/www/<dominio>)
const domain = getDeployDomain(remote_path);
const remote = `/var/www/${domain}`;

const dest = `${user}@${server}:${remote}`;
console.log(`Enviando dist/ → ${dest}`);
execSync(`scp -r dist/. ${dest}`, { stdio: "inherit" });
console.log(`Ajustando permissões → 755`);
execSync(`ssh ${user}@${server} "chmod -R 755 ${remote}"`, { stdio: "inherit" });
