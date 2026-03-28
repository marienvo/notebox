import {memo, useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {ACCENT_COLOR} from './accentColor';

const BAR_COUNT = 36;
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const MAX_BAR_H = 72;
const MIN_BAR_H = 7;
const WAVE_LAG_SEC = 0.15;

const BAR_INDICES = Array.from({length: BAR_COUNT}, (_, i) => i);

type Props = {
  isDarkMode: boolean;
};

function centerMaskMultiplier(index: number, n: number): number {
  'worklet';
  if (n <= 1) {
    return 0.36;
  }
  const norm = index / (n - 1);
  const distFromCenter = Math.abs(norm - 0.5) * 2;
  return 0.3 + 0.7 * Math.pow(distFromCenter, 1.38);
}

function computeBarHeight(
  tSec: number,
  index: number,
  n: number,
  staticOnly: boolean,
): number {
  'worklet';
  if (staticOnly) {
    const wave = 0.5 + 0.5 * Math.sin(index * 0.55);
    return MIN_BAR_H + wave * (MAX_BAR_H - MIN_BAR_H) * 0.7;
  }
  const norm = n <= 1 ? 0.5 : index / (n - 1);
  const phase = index * 0.42 + norm * Math.PI;
  const chatter = 0.5 + 0.5 * Math.sin(tSec * 11.2 + phase);
  const flutter = 0.5 + 0.5 * Math.sin(tSec * 16.8 + phase * 1.65);
  const blend = 0.56 * chatter + 0.44 * flutter;
  const envelope = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(tSec * 1.85));
  const micro = 0.52 + 0.48 * Math.sin(tSec * 6.1 + index * 0.33);
  const raw = blend * envelope * micro;
  return MIN_BAR_H + raw * (MAX_BAR_H - MIN_BAR_H);
}

type ColumnProps = {
  index: number;
  isDarkMode: boolean;
  reducedMotionSV: SharedValue<number>;
  t: SharedValue<number>;
};

const WaveColumn = memo(function WaveColumn({
  index,
  isDarkMode,
  reducedMotionSV,
  t,
}: ColumnProps) {
  const colStyle = [
    styles.column,
    index < BAR_COUNT - 1 ? styles.columnGapped : null,
  ];
  const barStyle = useAnimatedStyle(() => {
    const tSec = t.value;
    const staticOnly = reducedMotionSV.value === 1;
    const h = computeBarHeight(tSec, index, BAR_COUNT, staticOnly);
    const mask = centerMaskMultiplier(index, BAR_COUNT);
    const baseOpacity = isDarkMode ? 0.5 : 0.36;
    return {
      height: h,
      opacity: baseOpacity * mask,
    };
  }, [index, isDarkMode]);

  const tickStyle = useAnimatedStyle(() => {
    const tSec = t.value;
    const staticOnly = reducedMotionSV.value === 1;
    const lag = staticOnly ? 0 : WAVE_LAG_SEC;
    const hTick = computeBarHeight(Math.max(0, tSec - lag), index, BAR_COUNT, staticOnly);
    const mask = centerMaskMultiplier(index, BAR_COUNT);
    const intensity = 0.38 + 0.52 * (hTick / MAX_BAR_H);
    return {
      bottom: hTick + 1,
      opacity: 0.72 * intensity * mask,
    };
  }, [index]);

  return (
    <View style={colStyle}>
      <Animated.View style={[styles.tick, tickStyle]} />
      <Animated.View
        style={[
          styles.bar,
          isDarkMode ? styles.barFillDark : styles.barFillLight,
          barStyle,
        ]}
      />
    </View>
  );
});

export function StartupSplashContent({isDarkMode}: Props) {
  const reducedMotion = useReducedMotion();

  const t = useSharedValue(0);
  const reducedMotionSV = useSharedValue(reducedMotion ? 1 : 0);
  const enterOpacity = useSharedValue(0);

  const frame = useFrameCallback(({timeSinceFirstFrame}) => {
    'worklet';
    t.value = timeSinceFirstFrame / 1000;
  }, false);

  useEffect(() => {
    reducedMotionSV.value = reducedMotion ? 1 : 0;
  }, [reducedMotion, reducedMotionSV]);

  useEffect(() => {
    frame.setActive(!reducedMotion);
    return () => frame.setActive(false);
  }, [reducedMotion, frame]);

  useEffect(() => {
    enterOpacity.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [enterOpacity]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
  }));

  return (
    <Animated.View style={[styles.wrapper, enterStyle]}>
      <View style={styles.waveBlock}>
        <View style={styles.barsRow}>
          {BAR_INDICES.map(i => (
            <WaveColumn
              key={i}
              index={i}
              isDarkMode={isDarkMode}
              reducedMotionSV={reducedMotionSV}
              t={t}
            />
          ))}
        </View>
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.brand, isDarkMode ? styles.brandDark : styles.brandLight]}>
          Eskerra
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  waveBlock: {
    height: MAX_BAR_H + 44,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  barsRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    height: MAX_BAR_H,
  },
  column: {
    alignItems: 'center',
    height: MAX_BAR_H,
    justifyContent: 'flex-end',
    position: 'relative',
    width: BAR_WIDTH,
  },
  columnGapped: {
    marginRight: BAR_GAP,
  },
  bar: {
    borderRadius: 1,
    width: BAR_WIDTH,
  },
  barFillDark: {
    backgroundColor: '#e0e0e0',
  },
  barFillLight: {
    backgroundColor: '#2a2a2a',
  },
  tick: {
    backgroundColor: ACCENT_COLOR,
    borderRadius: 1,
    height: 2,
    position: 'absolute',
    width: BAR_WIDTH,
  },
  brand: {
    bottom: -2,
    fontSize: 32,
    fontWeight: '200',
    left: 0,
    letterSpacing: 3,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
    zIndex: 2,
  },
  brandDark: {
    color: '#f5f5f5',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  brandLight: {
    color: '#1a1a1a',
    textShadowColor: 'rgba(255,255,255,0.85)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
});
