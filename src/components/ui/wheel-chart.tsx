import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export type WheelDatum = {
  short: string;
  color: string;
  last: number; // 0-100
  current: number; // 0-100
};

export type WheelChartProps = {
  data: WheelDatum[];
  size?: number;
};

const TAU = Math.PI / 180;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg - 90) * TAU; // 0° at top, clockwise
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Annular-free pie sector from the centre out to radius r. */
function sectorPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y} Z`;
}

/**
 * Colourful polar-area (coxcomb) Wheel of Life. Each area is its own wedge in
 * its own hue, with two overlaid radii: last month (light) behind, current
 * month (saturated) in front.
 */
export function WheelChart({ data, size = 320 }: WheelChartProps) {
  const n = data.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 62; // leave room for the labels ringing the chart
  const rings = 4;
  const sweep = 360 / n;
  const clamp = (v: number) => Math.max(0, Math.min(100, v)) / 100;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        {/* dashed grid rings */}
        {Array.from({ length: rings }, (_, k) => (
          <Circle
            key={`ring-${k}`}
            cx={cx}
            cy={cy}
            r={(R * (k + 1)) / rings}
            fill="none"
            stroke={Colors.stroke}
            strokeWidth={1}
            strokeDasharray="2 5"
          />
        ))}

        {/* wedges: last month behind, current month in front */}
        {data.map((d, i) => {
          const a0 = i * sweep;
          const a1 = a0 + sweep;
          return (
            <G key={`w-${i}`}>
              <Path d={sectorPath(cx, cy, R * clamp(d.last), a0, a1)} fill={d.color} fillOpacity={0.32} />
              <Path d={sectorPath(cx, cy, R * clamp(d.current), a0, a1)} fill={d.color} fillOpacity={0.82} />
            </G>
          );
        })}

        {/* radial separators */}
        {data.map((_, i) => {
          const p = polar(cx, cy, R, i * sweep);
          return <Line key={`sep-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={Colors.white} strokeWidth={1.5} />;
        })}

        {/* labels at each wedge's mid-angle */}
        {data.map((d, i) => {
          const mid = i * sweep + sweep / 2;
          const p = polar(cx, cy, R + 12, mid);
          const anchor = p.x < cx - 4 ? 'end' : p.x > cx + 4 ? 'start' : 'middle';
          return (
            <SvgText
              key={`lbl-${i}`}
              x={p.x}
              y={p.y}
              fontSize={9}
              fontWeight="600"
              fill={Colors.textMain}
              textAnchor={anchor}
              alignmentBaseline="middle">
              {d.short}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
