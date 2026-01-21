/**
 * PieChart component
 *
 * A reusable pie chart component for displaying categorical breakdowns.
 * Uses ECharts via echarts-for-react for visualization.
 */
import * as React from 'react';
import ReactECharts from 'echarts-for-react';
import { cn } from '@/lib/utils/cn';

export interface PieChartDataPoint {
  name: string;
  value: number;
}

export interface PieChartProps {
  /** The chart data */
  data: PieChartDataPoint[];
  /** Chart title */
  title: string;
  /** Chart height in pixels */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

// Color palette for pie chart segments
const COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
];

/**
 * PieChart renders a pie/donut chart for categorical data.
 */
export function PieChart({
  data,
  title,
  height = 300,
  className,
}: PieChartProps) {
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
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: {
        color: '#6B7280',
      },
    },
    series: [
      {
        name: title,
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: data.map((d, i) => ({
          name: d.name,
          value: d.value,
          itemStyle: {
            color: COLORS[i % COLORS.length],
          },
        })),
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
