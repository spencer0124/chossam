/**
 * Switch — toggle switch (beautified from TDS, reanimated).
 *
 * Supports controlled (checked + onCheckedChange) and uncontrolled (defaultChecked).
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  type AccessibilityProps,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SdsColors } from '@/design-system/tokens';
import { useControlled, hexToRgbChannels } from '../../utils';
import { useTheme } from '../../core';
import { springConfig } from '../../foundation/easings';

// ── Constants ──
const TRACK_WIDTH = 50;
const TRACK_HEIGHT = 30;
const TRACK_RADIUS = 15;
const KNOB_SIZE = 16;
const KNOB_OFFSET_OFF = 7;
const KNOB_OFFSET_ON = TRACK_WIDTH - KNOB_SIZE - KNOB_OFFSET_OFF;

export interface SwitchProps extends AccessibilityProps {
  checked?: boolean;
  onCheckedChange?: (value: boolean) => void;
  /** @default false */
  defaultChecked?: boolean;
  /** @default false */
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
  style?: StyleProp<ViewStyle>;
}

export default function Switch({
  checked: _checked,
  defaultChecked = false,
  disabled = false,
  style,
  onPress,
  onCheckedChange,
  accessibilityState,
  ...restProps
}: SwitchProps) {
  const [checked, setChecked] = useControlled({
    controlledValue: _checked,
    defaultValue: defaultChecked,
  });
  const { token } = useTheme();

  // ── Animation ──
  const translateX = useSharedValue(checked ? KNOB_OFFSET_ON : KNOB_OFFSET_OFF);
  const bgOpacity = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    translateX.value = withSpring(
      checked ? KNOB_OFFSET_ON : KNOB_OFFSET_OFF,
      springConfig('quick'),
    );
    bgOpacity.value = withTiming(checked ? 1 : 0, { duration: 200 });
  }, [checked, translateX, bgOpacity]);

  const handlePress = useCallback(
    (e: any) => {
      if (disabled) return;
      onPress?.(e);
      onCheckedChange?.(!checked);
      setChecked(!checked);
    },
    [disabled, onPress, onCheckedChange, checked, setChecked],
  );

  // The track fades its brand colour in and out, so the worklet needs the
  // alpha to vary — which means an rgba() string, not a hex token. A worklet
  // runs on the UI thread and cannot read context or call the hook, so the
  // channels are parsed here on the JS side and captured as plain numbers.
  const { r, g, b } = useMemo(
    () => hexToRgbChannels(token.accent.fillColor),
    [token.accent.fillColor],
  );

  const trackStyle = useAnimatedStyle(
    () => ({
      backgroundColor: `rgba(${r}, ${g}, ${b}, ${bgOpacity.value})`,
    }),
    [r, g, b],
  );

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.container, style]}
      accessibilityRole="switch"
      accessible
      accessibilityState={{ checked, disabled, ...accessibilityState }}
      {...restProps}
    >
      <Animated.View
        style={[
          styles.track,
          { opacity: disabled ? 0.3 : 1 },
        ]}
      >
        {/* Off background (grey) */}
        <Animated.View style={[styles.trackBg, { backgroundColor: SdsColors.grey300 }]} />
        {/* On background (blue) */}
        <Animated.View style={[styles.trackBg, trackStyle]} />
        {/* Knob */}
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_RADIUS,
    overflow: 'hidden',
  },
  trackBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TRACK_RADIUS,
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    backgroundColor: SdsColors.background,
    borderRadius: KNOB_SIZE / 2,
    position: 'absolute',
    top: 7,
  },
});

export { Switch };
