export function renderTemplate(
  template: string,
  context: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => context[key] ?? '');
}

export function templateToTitle(templateCode: string): string {
  return templateCode
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}
