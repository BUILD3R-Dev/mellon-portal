/**
 * LeadsChart component
 *
 * A reusable bar chart component for displaying leads data.
 * Uses ECharts via echarts-for-react for visualization.
 */
import * as React from 'react';
import ReactECharts from 'echarts-for-react';
import { cn } from '@/lib/utils/cn';

export interface LeadsChartDataPoint {
  source: string;
  leads: number;
}

export interface LeadsChartProps {
  /** The chart data */
  data: LeadsChartDataPoint[];
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
 * LeadsChart renders a bar chart showing leads by source.
 */
export function LeadsChart({
  data,
  title,
  height = 300,
  className,
}: LeadsChartProps) {
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
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.source),
      axisLabel: {
        rotate: data.length > 5 ? 45 : 0,
        color: foregroundMuted,
      },
      axisLine: {
        lineStyle: {
          color: borderColor,
        },
      },
    },
    yAxis: {
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
    series: [
      {
        name: 'Leads',
        type: 'bar',
        data: data.map((d) => d.leads),
        itemStyle: {
          color: '#3B82F6',
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 50,
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
