// Mapeamento normalizado para o padrão exato de chaves do n8n.
// Compartilhado entre forms.ts (formulário da página) e WhatsAppWidget para que
// todo formulário do site envie os mesmos nomes de campo ao webhook.
export const keyMap: Record<string, string> = {
  nome: 'Nome',
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

export const trackingParamKeys = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
  'utm_content', 'utm_id', 'gclid', 'gbraid', 'wbraid',
  'fbclid', 'ttclid', 'msclkid', 'sck',
  'fbc', 'fbp', 'external_id', 'event_id',
];

// Deriva "Landing page/<slug>" a partir da URL atual, sem precisar configurar
// nada manualmente por página. A home (slug vazio) é a landing de casamentos.
export function getPageSource(pathname: string): string {
  const slug = pathname.replace(/\/$/, '').split('/').filter(Boolean)[0];
  return `Landing page/${slug || 'casamentos'}`;
}
