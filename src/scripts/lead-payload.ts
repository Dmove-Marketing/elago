// Mapeamento normalizado para o padrão exato de chaves do n8n.
// Compartilhado entre forms.ts (formulário da página) e WhatsAppWidget para que
// todo formulário do site envie os mesmos nomes de campo ao webhook.
export const keyMap: Record<string, string> = {
  nome: 'Nome',
  sobrenome: 'Sobrenome',
  orcamento: 'Orçamento previsto',
  etapa_planejamento: 'Etapa do planejamento',
  email: 'E-mail',
  'e-mail': 'E-mail',
  telefone: 'WhatsApp',
  whatsapp: 'WhatsApp',
  data: 'Data do evento',
  data_evento: 'Data do evento',
  'data do evento': 'Data do evento',
  tipo_evento: 'Tipo de evento',
  'tipo de evento': 'Tipo de evento',
  convidados: 'Convidados',
  empresa: 'Empresa',
  mensagem: 'Mensagem',
  detalhes_adicionais: 'Mensagem',
  'detalhes adicionais': 'Mensagem',
  como_descobriu: 'Como descobriu',
  'como descobriu': 'Como descobriu',
};

// Opções de "Tipo de evento" — fonte única compartilhada entre os formulários
// normais (formulário da página) e o popup de WhatsApp, para que todos ofereçam
// exatamente a mesma lista. Não inclui o placeholder "Selecione...".
export const tipoEventoOptions: { value: string; label: string }[] = [
  { value: 'Aniversario',                          label: 'Aniversário' },
  { value: 'Aniversario debutante',                label: 'Aniversário debutante' },
  { value: 'Bodas',                                label: 'Bodas' },
  { value: 'Casamento',                            label: 'Casamento' },
  { value: 'Confraternizacao corporativa',         label: 'Confraternização corporativa' },
  { value: 'Confraternizacao social',              label: 'Confraternização social' },
  { value: 'Corporativo',                          label: 'Corporativo' },
  { value: 'Feiras e Exposicoes',                  label: 'Feiras e Exposições' },
  { value: 'Masterclass e Palestras',              label: 'Masterclass e Palestras' },
  { value: 'Mentorias e Treinamentos',             label: 'Mentorias e Treinamentos' },
  { value: 'Offsite corporativo',                  label: 'Offsite corporativo' },
  { value: 'Reunioes de Networking',               label: 'Reuniões de Networking' },
  { value: 'Workshops, Conferencias e Seminarios', label: 'Workshops, Conferências e Seminários' },
  { value: 'Outros',                               label: 'Outros' },
];

// Opções de "Etapa do planejamento" — fonte única para formulários e popup de WhatsApp.
export const etapaPlanejamentoOptions: { value: string; label: string }[] = [
  { value: 'Apenas pesquisando valores',            label: 'Estou apenas pesquisando valores (ainda não visitei espaços)' },
  { value: 'Visitando espacos, ainda nao fechar',   label: 'Estou visitando espaços, mas ainda não estou pronto para fechar o evento' },
  { value: 'Visitando espacos, pronto para fechar', label: 'Estou visitando espaços e pronto para fechar o evento' },
];

// Máscara de moeda BRL (somente reais): "15000" -> "R$ 15.000"
export function maskBRL(v: string): string {
  const d = v.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
  if (!d) return '';
  return 'R$ ' + d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Origem do lead a partir dos UTMs/click IDs. Os valores batem com as opções do campo
// "Campanha" do Voe (Meta, Google, LinkedIn, YouTube, TikTok, Pinterest). Sem anúncio = "Orgânico".
export function detectOrigem(tr: Record<string, string>): string {
  const s = (tr.utm_source || '').toLowerCase();
  const m = (tr.utm_medium || '').toLowerCase();
  const organico = /^(social|organic|organico|orgânico|bio|referral|email)$/.test(m) || /bio/.test((tr.utm_content || '').toLowerCase());
  if (tr.gclid || tr.gbraid || tr.wbraid) return 'Google';
  if (tr.ttclid) return 'TikTok';
  if (tr.fbclid) return 'Meta';
  if (!organico) {
    if (/^(google|adwords|googleads|google-ads|gads)$/.test(s)) return 'Google';
    if (/^(meta|facebook|fb|ig|instagram|an|msg|messenger)$/.test(s)) return 'Meta';
    if (/tiktok/.test(s)) return 'TikTok';
    if (/linkedin/.test(s)) return 'LinkedIn';
    if (/youtube/.test(s)) return 'YouTube';
    if (/pinterest/.test(s)) return 'Pinterest';
  }
  return 'Orgânico';
}

export const trackingParamKeys = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
  'utm_content', 'utm_id', 'gclid', 'gbraid', 'wbraid',
  'fbclid', 'ttclid', 'msclkid', 'sck',
  'fbc', 'fbp', 'external_id', 'event_id',
];

// Rótulo de origem do lead ("Fonte" no payload): "Landing page/<slug>", com a raiz como "home".
// Os parâmetros de tracking vão em campos próprios do payload, não no Fonte.
export function getPageSource(pathname: string): string {
  const slug = pathname.replace(/\/$/, '').split('/').filter(Boolean)[0];
  return `Landing page/${slug || 'home'}`;
}
