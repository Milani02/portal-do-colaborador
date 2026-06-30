export function relativeDate(dateStr) {
  const date = new Date(dateStr);
  const diff = (Date.now() - date) / 1000;
  if (diff < 60)     return 'agora mesmo';
  if (diff < 3600)   return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400)  return `há ${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 7)      return `há ${days} dia${days > 1 ? 's' : ''}`;
  return date.toLocaleDateString('pt-BR');
}

export function exactDatetime(dateStr) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function shortDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}
