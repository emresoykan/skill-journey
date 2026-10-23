import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { entryXp } from './game';
import { useJourney } from './journey-state';
import { MicButton } from './MicButton';
import { MAX_OPEN_TODOS, type Todo } from './todos';

const teal = '#166B65';

// Bugün sekmesi: bir kerelik işler. Tik atılınca iş bugünün kaydı olur (beceri + XP);
// bitmeyen iş ertesi güne kalır.
export function TodosCard() {
  const { todoList, todoError, setTodoError, addTodo, busy, loading } = useJourney();
  const [title, setTitle] = useState('');
  if (loading) return null;
  const { open, doneToday } = todoList;
  const total = open.length + doneToday.length;

  async function submit() {
    if (await addTodo(title)) setTitle('');
  }

  return <View style={s.card}>
    <View style={s.head}>
      <Text style={s.title}>Yapılacaklar</Text>
      {total ? <Text style={[s.count, !open.length && s.countDone]}>{open.length ? `${doneToday.length}/${total}` : '🌟 Hepsi tamam'}</Text> : null}
    </View>
    {total ? null : <Text style={s.intro}>Yapmayı düşündüğün işleri ekle. Bitirince tikle; iş bugünkü kayıtlarına geçer ve becerine XP kazandırır.</Text>}

    {open.map(todo => <TodoRow key={todo.id} todo={todo} />)}
    {doneToday.map(todo => <TodoRow key={todo.id} todo={todo} />)}

    {open.length < MAX_OPEN_TODOS ? <View style={s.inputRow}>
      <TextInput
        accessibilityLabel="Yeni yapılacak iş"
        placeholder="Yeni iş, örn. Bütçe raporunu bitir"
        placeholderTextColor="#9AA6A8"
        maxLength={120}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={submit}
        value={title}
        onChangeText={value => { setTitle(value); setTodoError(''); }}
        style={s.input}
      />
      <MicButton value={title} onChangeText={value => { setTitle(value); setTodoError(''); }} size={46} />
      <Pressable accessibilityRole="button" accessibilityLabel="Yapılacak ekle" disabled={busy || !title.trim()} onPress={submit} style={[s.add, (busy || !title.trim()) && { opacity: 0.45 }]}>
        <Text style={s.addText}>Ekle</Text>
      </Pressable>
    </View> : null}
    {todoError ? <Text style={s.error}>{todoError}</Text> : null}
  </View>;
}

function TodoRow({ todo }: { todo: Todo }) {
  const { entries, busy, completeTodo, reopenTodo, removeTodo } = useJourney();
  const [confirming, setConfirming] = useState(false);
  const done = !!todo.doneAt;
  const entry = done ? entries.find(item => item.id === todo.entryId) : undefined;

  return <View>
    <View style={s.rowWrap}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done, disabled: busy }}
        aria-checked={done}
        accessibilityLabel={todo.title}
        disabled={busy}
        onPress={() => done ? reopenTodo(todo) : completeTodo(todo)}
        style={[s.row, done && s.rowDone]}
      >
        <View style={[s.circle, done && s.circleDone]}><Text style={s.circleMark}>{done ? '✓' : ''}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={[s.todoTitle, done && s.todoTitleDone]}>{todo.title}</Text>
          {done ? <Text style={s.meta}>{entry ? `Bugün tamamlandı · +${entryXp(entry)} XP` : 'Bugün tamamlandı'}</Text> : null}
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Sil: ${todo.title}`} hitSlop={6} disabled={busy} onPress={() => setConfirming(!confirming)} style={s.remove}>
        <Text style={s.removeText}>✕</Text>
      </Pressable>
    </View>
    {confirming ? <View style={s.confirm}>
      <Text style={s.confirmText}>{done ? 'İş listeden kalksın mı? Kaydı ve kazandığın XP Anılar\'da kalır.' : 'Bu iş listeden silinsin mi?'}</Text>
      <View style={s.confirmActions}>
        <Pressable accessibilityRole="button" onPress={() => setConfirming(false)}><Text style={s.cancel}>Vazgeç</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => removeTodo(todo.id)}><Text style={s.danger}>Evet, sil</Text></Pressable>
      </View>
    </View> : null}
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#182637', fontSize: 20, fontWeight: '800' },
  count: { color: '#8B5B00', backgroundColor: '#FFF0C2', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '800', overflow: 'hidden' },
  countDone: { color: teal, backgroundColor: '#DDF1E9' },
  intro: { color: '#657482', fontSize: 13, lineHeight: 19, marginTop: 8 },
  rowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E2E9E4', paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFBF9' },
  rowDone: { backgroundColor: '#EEF8F3', borderColor: '#BEDDD1' },
  circle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#C9D5CF', alignItems: 'center', justifyContent: 'center' },
  circleDone: { backgroundColor: teal, borderColor: teal },
  circleMark: { color: 'white', fontSize: 14, fontWeight: '800' },
  todoTitle: { color: '#182637', fontSize: 15, fontWeight: '700' },
  todoTitleDone: { color: teal, textDecorationLine: 'line-through' },
  meta: { color: '#657482', fontSize: 11, marginTop: 2 },
  remove: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: '#D5DFDA', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#A33D3D', fontSize: 13, fontWeight: '800' },
  confirm: { backgroundColor: '#FFF5F3', borderRadius: 10, padding: 10, marginTop: 8 },
  confirmText: { color: '#6E3C37', fontSize: 12, lineHeight: 18 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 6 },
  cancel: { color: '#657482', fontSize: 12, fontWeight: '700' },
  danger: { color: '#A33D3D', fontSize: 12, fontWeight: '800' },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 14 },
  input: { flex: 1, minWidth: 0, height: 46, borderColor: '#D5DFDA', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, color: '#182637', fontSize: 14, backgroundColor: '#FAFBF9' },
  add: { height: 46, paddingHorizontal: 16, borderRadius: 12, backgroundColor: teal, alignItems: 'center', justifyContent: 'center' },
  addText: { color: 'white', fontSize: 14, fontWeight: '800' },
  error: { color: '#B34242', fontSize: 12, marginTop: 10 },
});
