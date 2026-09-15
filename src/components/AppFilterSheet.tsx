import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Checkbox, Dialog, Portal } from 'react-native-paper';

export type FilterOption = { value: string; label: string };

// The shared filter panel opened by AppFilterButton — checkboxes, always
// multi-select. Even a field that's single-valued *per record* (like a
// leave request's own status) still benefits from a multi-select filter
// ("Approved + Rejected" is a completely reasonable thing to want to see
// together) — that's a fact about filtering, not about the record, so
// there's no real single-select use case in this app to justify the
// complexity of a second mode. If one genuinely turns up later (e.g. a
// mutually-exclusive sort order), add radio buttons back then, not before.
// Deliberately no explicit "All"/"Any" option in the list — "no filter" is
// what "Clear" produces, rather than a redundant option meaning the same
// thing as selecting nothing.
export function AppFilterSheet({
  visible,
  onDismiss,
  title,
  options,
  selected,
  onApply,
}: {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  options: FilterOption[];
  selected: string[];
  onApply: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(selected);

  // Re-sync the draft to whatever's actually applied every time the sheet
  // opens, so a dismissed-without-applying edit doesn't linger next time.
  useEffect(() => {
    if (visible) setDraft(selected);
  }, [visible, selected]);

  function toggle(value: string) {
    setDraft((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function apply() {
    onApply(draft);
    onDismiss();
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView>
            {options.map((opt) => (
              <Checkbox.Item
                key={opt.value}
                label={opt.label}
                status={draft.includes(opt.value) ? 'checked' : 'unchecked'}
                onPress={() => toggle(opt.value)}
              />
            ))}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={() => setDraft([])}>Clear</Button>
          <Button mode="contained" onPress={apply}>
            Apply
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    paddingHorizontal: 0,
  },
});
