// Yapılacakların saf mantığı. Yalnız tip içe aktarır; npm test doğrudan çalıştırabilir.

// Bir kerelik iş. Tamamlanınca sıradan bir kayıt (entryId) oluşturur; XP ve beceri o kayıttan gelir.
// Bitmeyen iş ertesi güne kalır; tamamlanan iş yalnız tamamlandığı gün listede görünür.
export type Todo = { id: string; title: string; createdAt: string; doneAt?: string; entryId?: string };

export const MAX_OPEN_TODOS = 30;

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const normalize = (title: string) => title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
export const cleanTodoTitle = (title: string) => title.trim().replace(/\s+/g, ' ');

export function todoTitleError(title: string, todos: Todo[]): string | null {
  if (!cleanTodoTitle(title)) return 'Yapılacak iş boş olamaz.';
  const open = todos.filter(todo => !todo.doneAt);
  if (open.length >= MAX_OPEN_TODOS) return `En fazla ${MAX_OPEN_TODOS} açık iş tutabilirsin.`;
  if (open.some(todo => normalize(todo.title) === normalize(title))) return 'Bu iş zaten listende.';
  return null;
}

// Liste: önce açık işler (eklenme sırasıyla), sonra bugün tamamlananlar. Önceki günlerde biten işler gizlenir.
export function visibleTodos(todos: Todo[], now = new Date()): { open: Todo[]; doneToday: Todo[] } {
  const today = dayKey(now);
  return {
    open: todos.filter(todo => !todo.doneAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    doneToday: todos.filter(todo => todo.doneAt && dayKey(new Date(todo.doneAt)) === today).sort((a, b) => a.doneAt!.localeCompare(b.doneAt!)),
  };
}

// Saklanan listeden kalıcı olarak atılacaklar: 30 günden eski tamamlanmış işler (kayıtları Anılar'da kalır).
export function pruneTodos(todos: Todo[], now = new Date()): Todo[] {
  const limit = now.getTime() - 30 * 86_400_000;
  return todos.filter(todo => !todo.doneAt || new Date(todo.doneAt).getTime() >= limit);
}

export function parseTodos(value: unknown): Todo[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((todo): todo is Todo => !!todo && typeof todo === 'object' && typeof todo.id === 'string' && typeof todo.title === 'string' && typeof todo.createdAt === 'string')
    .map(todo => ({
      id: todo.id,
      title: todo.title,
      createdAt: todo.createdAt,
      ...(typeof todo.doneAt === 'string' ? { doneAt: todo.doneAt } : {}),
      ...(typeof todo.entryId === 'string' ? { entryId: todo.entryId } : {}),
    }));
}
