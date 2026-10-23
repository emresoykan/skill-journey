import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useJourney } from './journey-state';
import type { Todo } from './todos';

// "Bugün ne yaptın" kartındaki açık işler. Tik atılan iş kartın kayıt listesine geçer (beceri + XP).
export function OpenTodos() {
  const { todoList } = useJourney();
  if (!todoList.open.length) return null;
  return <View style={s.wrap}>
    <Text style={s.label}>YAPILACAKLAR · {todoList.open.length}</Text>
    {todoList.open.map(todo => <TodoRow key={todo.id} todo={todo} />)}
  </View>;
}

function TodoRow({ todo }: { todo: Todo }) {
  const { busy, completeTodo, removeTodo } = useJourney();
  const [confirming, setConfirming] = useState(false);
  return <View style={s.itemWrap}>
    <View style={s.item}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: false, disabled: busy }}
        aria-checked={false}
        accessibilityLabel={`Yaptım: ${todo.title}`}
        disabled={busy}
        onPress={() => completeTodo(todo)}
        style={s.main}
      >
        <View style={s.circle} />
        <Text style={s.text}>{todo.title}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Sil: ${todo.title}`} hitSlop={8} disabled={busy} onPress={() => setConfirming(!confirming)} style={s.remove}>
        <Text style={s.removeText}>✕</Text>
      </Pressable>
    </View>
    {confirming ? <View style={s.confirm}>
      <Text style={s.confirmText}>Bu iş listeden silinsin mi?</Text>
      <View style={s.confirmActions}>
        <Pressable accessibilityRole="button" onPress={() => setConfirming(false)}><Text style={s.cancel}>Vazgeç</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => removeTodo(todo.id)}><Text style={s.danger}>Evet, sil</Text></Pressable>
      </View>
    </View> : null}
  </View>;
}

const s = StyleSheet.create({
  wrap: { marginTop: 14 },
  label: { color: '#657482', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  itemWrap: { paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#EEF2EE' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  circle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#C9D5CF' },
  text: { flex: 1, color: '#182637', fontSize: 14, fontWeight: '600', lineHeight: 19 },
  remove: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#9AA6A8', fontSize: 13, fontWeight: '800' },
  confirm: { backgroundColor: '#FFF5F3', borderRadius: 10, padding: 10, marginBottom: 6 },
  confirmText: { color: '#6E3C37', fontSize: 12, lineHeight: 18 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 6 },
  cancel: { color: '#657482', fontSize: 12, fontWeight: '700' },
  danger: { color: '#A33D3D', fontSize: 12, fontWeight: '800' },
});
