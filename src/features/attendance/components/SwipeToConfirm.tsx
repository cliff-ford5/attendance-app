import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Icon, Text } from 'react-native-paper';

const THUMB_SIZE = 52;
const TRACK_PADDING = 4;
const CONFIRM_THRESHOLD = 0.7;

// A deliberate "drag to confirm" gesture, not a plain button — the whole
// point is requiring an intentional action for something as consequential
// as check-in/out, the same reasoning "slide to unlock" patterns use.
// A pure gesture has no equivalent for screen-reader users (there's no
// drag in TalkBack/VoiceOver's touch-exploration model), so this also
// exposes a real accessibility action that performs the same confirm —
// not just a decorative aria label — per this project's stated priority
// on accessible interaction, not just accessible-looking markup.
export function SwipeToConfirm({
  label,
  onConfirm,
  disabled,
  color,
  icon = 'arrow-right',
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  color: string;
  icon?: string;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useSharedValue(0);
  const maxTranslate = Math.max(1, trackWidth - THUMB_SIZE - TRACK_PADDING * 2);

  const pan = Gesture.Pan()
    .enabled(!disabled && trackWidth > 0)
    .onChange((e) => {
      const next = translateX.value + e.changeX;
      translateX.value = Math.min(Math.max(next, 0), maxTranslate);
    })
    .onEnd(() => {
      if (translateX.value > maxTranslate * CONFIRM_THRESHOLD) {
        translateX.value = withSpring(maxTranslate);
        runOnJS(onConfirm)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE + TRACK_PADDING,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, maxTranslate * 0.6], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View
      style={[styles.track, { backgroundColor: `${color}26` }, disabled && styles.disabledTrack]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Activate to confirm"
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate' && !disabled) onConfirm();
      }}
    >
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
      <Animated.View style={[styles.labelWrap, labelStyle]} pointerEvents="none">
        <Text variant="titleMedium" style={[styles.label, { color }]}>
          {label}
        </Text>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.thumb, { backgroundColor: color }, thumbStyle]}>
          <Icon source={icon} size={22} color="#FFFFFF" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: THUMB_SIZE + TRACK_PADDING * 2,
    borderRadius: (THUMB_SIZE + TRACK_PADDING * 2) / 2,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabledTrack: {
    opacity: 0.5,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: (THUMB_SIZE + TRACK_PADDING * 2) / 2,
  },
  labelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
  },
  thumb: {
    position: 'absolute',
    left: TRACK_PADDING,
    top: TRACK_PADDING,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
