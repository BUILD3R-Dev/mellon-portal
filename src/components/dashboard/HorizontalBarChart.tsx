/**
 * HorizontalBarChart component
 *
 * A reusable horizontal bar chart for displaying stage breakdowns.
 * Uses ECharts via echarts-for-react for visualization.
 */
import * as React from 'react';
import ReactECharts from 'echarts-for-react';
import { cn } from '@/lib/utils/cn';

export interface HorizontalBarChartDataPoint {
  stage: string;
  count: number;
}

export interface HorizontalBarChartProps {
  /** The chart data */
  data: HorizontalBarChartDataPoint[];
  /** Chart title */
  title: string;
  /** Chart height in pixels */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reads a CSS variable from :root, with fallback
 */
function getCSSVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * HorizontalBarChart renders a horizontal bar chart showing counts by stage.
 */
export function HorizontalBarChart({
  data,
  title,
  height = 300,
  className,
}: HorizontalBarChartProps) {
  // Reverse so ECharts renders the first item at the top of the y-axis
  const chartData = [...data].reverse();

  const foreground = getCSSVar('--foreground', '#111827');
  const foregroundMuted = getCSSVar('--foreground-muted', '#6B7280');
  const borderColor = getCSSVar('--border', '#E5E7EB');
  const borderMuted = getCSSVar('--border-muted', '#F3F4F6');

  const option = {
    title: {
      text: title,
      left: 'left',
      textStyle: {
        fontSize: 16,
        fontWeight: 600,
        color: foreground,
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        color: foregroundMuted,
      },
      splitLine: {
        lineStyle: {
          color: borderMuted,
        },
      },
    },
    yAxis: {
      type: 'category',
      data: chartData.map((d) => d.stage),
      axisLabel: {
        color: foregroundMuted,
        width: 100,
        overflow: 'truncate',
      },
      axisLine: {
        lineStyle: {
          color: borderColor,
        },
      },
    },
    series: [
      {
        name: 'Count',
        type: 'bar',
        data: chartData.map((d) => d.count),
        itemStyle: {
          color: '#10B981',
          borderRadius: [0, 4, 4, 0],
        },
        barMaxWidth: 30,
        label: {
          show: true,
          position: 'right',
          color: foregroundMuted,
        },
      },
    ],
  };

  return (
    <div
      className={cn('rounded-xl border p-6', className)}
      style={{
        backgroundColor: 'var(--card-background, #FFFFFF)',
        borderColor: 'var(--card-border, #E5E7EB)',
      }}
    >
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
