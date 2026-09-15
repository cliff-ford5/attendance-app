import { LinearGradient } from 'expo-linear-gradient';
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
import { ActivityIndicator, Icon, Text } from 'react-native-paper';

const THUMB_SIZE = 52;
const TRACK_PADDING = 4;
const CONFIRM_THRESHOLD = 0.7;

// Lightens/darkens a hex color by `percent` (negative = darker) — used to
// derive a gradient's second stop from the single color this component is
// already given, rather than needing a second prop threaded through every
// call site just for a gradient end color.
function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0x00ff) + amt);
  const b = clamp((num & 0x0000ff) + amt);
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

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
      <Animated.View style={[styles.fill, fillStyle]}>
        <LinearGradient colors={[color, shade(color, -12)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fillGradient} />
      </Animated.View>
      <Animated.View style={[styles.labelWrap, labelStyle]} pointerEvents="none">
        <Text variant="titleMedium" style={[styles.label, { color }]}>
          {label}
        </Text>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.thumb, thumbStyle]}>
          <LinearGradient colors={[shade(color, 10), shade(color, -15)]} style={styles.thumbGradient} />
          {/* disabled only ever means "confirm already fired, waiting on
              check-in/out to finish" here — swapping to a spinner instead
              of leaving the static arrow sitting there is what actually
              tells the user it's working, not stuck. */}
          {disabled ? <ActivityIndicator size={20} color="#FFFFFF" /> : <Icon source={icon} size={22} color="#FFFFFF" />}
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
    overflow: 'hidden',
  },
  fillGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    overflow: 'hidden',
    // A subtle lift under the thumb specifically — this is the one thing
    // on the screen the employee is about to drag, worth reading as
    // slightly "raised" off the track rather than flush with it.
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  thumbGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
