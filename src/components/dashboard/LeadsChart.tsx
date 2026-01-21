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
 * LeadsChart renders a bar chart showing leads by source.
 */
export function LeadsChart({
  data,
  title,
  height = 300,
  className,
}: LeadsChartProps) {
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
        color: '#6B7280',
      },
      axisLine: {
        lineStyle: {
          color: '#E5E7EB',
        },
      },
    },
    yAxis: {
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
    <div className={cn('bg-white rounded-xl border border-gray-200 p-6', className)}>
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
