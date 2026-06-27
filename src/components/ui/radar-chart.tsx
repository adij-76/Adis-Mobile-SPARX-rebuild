import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export type RadarPoint = { label: string; value: number /* 0-100 */ };

export type RadarChartProps = {
  data: RadarPoint[];
  size?: number;
  fill?: string;
  stroke?: string;
};

/** Lightweight spider/radar chart (no external chart lib). */
export function RadarChart({
  data,
  size = 260,
  fill = 'rgba(22,104,144,0.25)',
  stroke = Colors.primary,
}: RadarChartProps) {
  const n = data.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 34; // padding for labels
  const rings = 4;

  const angleFor = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const point = (i: number, r: number) => ({
    x: cx + r * Math.cos(angleFor(i)),
    y: cy + r * Math.sin(angleFor(i)),
  });

  const gridPolys = Array.from({ length: rings }, (_, ring) => {
    const r = (R * (ring + 1)) / rings;
    return data.map((_, i) => point(i, r)).map((p) => `${p.x},${p.y}`).join(' ');
  });

  const dataPoly = data
    .map((d, i) => point(i, (Math.max(0, Math.min(100, d.value)) / 100) * R))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        {/* grid rings */}
        {gridPolys.map((poly, i) => (
          <Polygon key={i} points={poly} fill="none" stroke={Colors.stroke} strokeWidth={1} />
        ))}
        {/* spokes */}
        {data.map((_, i) => {
          const p = point(i, R);
          return <Line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={Colors.stroke} strokeWidth={1} />;
        })}
        {/* data polygon */}
        <Polygon points={dataPoly} fill={fill} stroke={stroke} strokeWidth={2} />
        {/* vertices */}
        <G>
          {data.map((d, i) => {
            const p = point(i, (Math.max(0, Math.min(100, d.value)) / 100) * R);
            return <Circle key={i} cx={p.x} cy={p.y} r={4} fill={stroke} />;
          })}
        </G>
        {/* labels */}
        {data.map((d, i) => {
          const p = point(i, R + 16);
          return (
            <SvgText
              key={i}
              x={p.x}
              y={p.y}
              fontSize={11}
              fill={Colors.textSub}
              textAnchor="middle"
              alignmentBaseline="middle">
              {d.label}
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
