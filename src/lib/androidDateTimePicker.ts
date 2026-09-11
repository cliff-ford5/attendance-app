import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

// Android-only. The declarative <DateTimePicker> component, conditionally
// rendered and unmounted inside its own onChange (the standard pattern for
// Android, since the dialog is native and shouldn't stay in the tree),
// races against the native dialog's own dismiss cleanup — causing a real
// crash ("Cannot read property 'dismiss' of undefined") when the user
// cancels. The library's own imperative API sidesteps this entirely: it
// never mounts a component, just opens a native dialog directly. iOS has
// no equivalent crash and keeps using the declarative component inline.

export function openAndroidDatePicker(value: Date, onChange: (date: Date) => void, minimumDate?: Date) {
  DateTimePickerAndroid.open({
    value,
    mode: 'date',
    minimumDate,
    onChange: (event, selected) => {
      if (event.type === 'set' && selected) onChange(selected);
    },
  });
}

export function openAndroidTimePicker(value: Date, onChange: (date: Date) => void) {
  DateTimePickerAndroid.open({
    value,
    mode: 'time',
    onChange: (event, selected) => {
      if (event.type === 'set' && selected) onChange(selected);
    },
  });
}

// Android has no native combined date+time dialog — chains a date picker
// into a time picker, matching what the declarative mode="datetime" fakes.
export function openAndroidDateTimePicker(value: Date, onChange: (date: Date) => void) {
  DateTimePickerAndroid.open({
    value,
    mode: 'date',
    onChange: (dateEvent, selectedDate) => {
      if (dateEvent.type !== 'set' || !selectedDate) return;
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: 'time',
        onChange: (timeEvent, selectedTime) => {
          if (timeEvent.type !== 'set' || !selectedTime) return;
          const combined = new Date(selectedDate);
          combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
          onChange(combined);
        },
      });
    },
  });
}
