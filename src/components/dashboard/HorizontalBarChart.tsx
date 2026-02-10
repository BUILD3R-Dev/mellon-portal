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

  const option = {
    title: {
      text: title,
      left: 'left',
      textStyle: {
        fontSize: 16,
        fontWeight: 600,
        color: '#111827',
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
        color: '#6B7280',
      },
      splitLine: {
        lineStyle: {
          color: '#F3F4F6',
        },
      },
    },
    yAxis: {
      type: 'category',
      data: chartData.map((d) => d.stage),
      axisLabel: {
        color: '#6B7280',
        width: 100,
        overflow: 'truncate',
      },
      axisLine: {
        lineStyle: {
          color: '#E5E7EB',
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
          color: '#6B7280',
        },
      },
    ],
  };

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-6', className)}>
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
