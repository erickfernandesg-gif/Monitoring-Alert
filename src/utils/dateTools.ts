import { formatDistanceToNow, format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

export function safeFormatDistanceToNow(dateString: string): string {
  try {
    if (!dateString) return "Data desconhecida";
    const date = new Date(dateString);
    if (!isValid(date)) return "Data inválida";
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch (error) {
    return "Data inválida";
  }
}

export function safeFormat(dateString: string, formatStr: string): string {
  try {
    if (!dateString) return "Data desconhecida";
    const date = new Date(dateString);
    if (!isValid(date)) return "Data inválida";
    return format(date, formatStr, { locale: ptBR });
  } catch (error) {
    return "Data inválida";
  }
}
