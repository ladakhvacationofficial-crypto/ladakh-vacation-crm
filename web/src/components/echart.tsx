'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

/**
 * Thin ECharts wrapper. Deliberately not using `echarts-for-react` — that
 * package lags on React peer versions and this is 30 lines.
 */
export function EChart({
  option,
  height = 260,
  className,
}: {
  option: echarts.EChartsOption;
  height?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chart.current = echarts.init(ref.current, undefined, { renderer: 'canvas' });

    const onResize = () => chart.current?.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, true);
  }, [option]);

  return <div ref={ref} style={{ height }} className={className} />;
}

/**
 * Shared axis/tooltip styling. Values are literals rather than CSS variables
 * because ECharts renders into a canvas and can't read `var(--…)` at runtime.
 * Keep them synchronised with globals.css.
 */
export const chartBase: Pick<
  echarts.EChartsOption,
  'grid' | 'textStyle' | 'tooltip'
> = {
  grid: { left: 8, right: 12, top: 16, bottom: 4, containLabel: true },
  textStyle: { fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 11 },
  tooltip: {
    backgroundColor: '#ffffff',
    borderColor: '#e2ddd1',
    borderWidth: 1,
    textStyle: { color: '#1c2a42', fontSize: 12 },
    padding: [8, 10],
    extraCssText:
      'box-shadow: 0 8px 24px -8px rgba(7,15,31,0.18); border-radius: 8px;',
  },
};

export const axisStyle = {
  axisLine: { lineStyle: { color: '#e2ddd1' } },
  axisTick: { show: false },
  axisLabel: { color: '#5b6880', fontSize: 10 },
  splitLine: { lineStyle: { color: '#efece4' } },
};
