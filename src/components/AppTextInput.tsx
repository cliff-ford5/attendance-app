import { TextInput, type TextInputProps } from 'react-native-paper';

// Defaults every text field in the app to Paper's "outlined" mode instead
// of its default "flat" (heavy filled-background) mode — the flat style is
// what made every input look like a dated, mismatched lavender block.
// Outlined reads cleaner and more current, and still respects `mode` if a
// caller ever needs to override it.
export function AppTextInput(props: TextInputProps) {
  return <TextInput mode="outlined" {...props} />;
}
