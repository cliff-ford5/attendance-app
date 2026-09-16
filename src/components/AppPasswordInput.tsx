import { useState } from 'react';
import { TextInput as PaperTextInput, type TextInputProps } from 'react-native-paper';
import { AppTextInput } from './AppTextInput';

// A password field with a built-in show/hide toggle — every password
// field in the app uses this instead of AppTextInput + a bare
// `secureTextEntry`, so the toggle logic isn't reimplemented per screen
// (Login, Register both need it). `right`/`secureTextEntry` are owned by
// this component, not left open for a caller to accidentally override.
export function AppPasswordInput(props: Omit<TextInputProps, 'secureTextEntry' | 'right'>) {
  const [visible, setVisible] = useState(false);

  return (
    <AppTextInput
      {...props}
      secureTextEntry={!visible}
      right={
        <PaperTextInput.Icon
          icon={visible ? 'eye-off' : 'eye'}
          onPress={() => setVisible((v) => !v)}
          forceTextInputFocus={false}
        />
      }
    />
  );
}
