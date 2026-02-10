/**
 * PipelineStages component
 *
 * A visual pipeline representation showing each stage as a card
 * in pipeline order. Cards display the stage name, contact count,
 * dollar value, and a proportional progress bar.
 */
import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface PipelineStageData {
  stage: string;
  count: number;
  dollarValue: number;
}

interface PipelineStagesProps {
  data: PipelineStageData[];
  className?: string;
}

function formatCurrency(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  if (num > 0) return `$${num.toLocaleString()}`;
  return '';
}

/**
 * Generates a color for a stage based on its position in the pipeline.
 * Transitions from blue (early) through indigo/violet to emerald (late).
 */
function getStageColor(index: number, total: number): string {
  const colors = [
    '#3B82F6', // blue-500
    '#3B82F6',
    '#6366F1', // indigo-500
    '#6366F1',
    '#8B5CF6', // violet-500
    '#8B5CF6',
    '#A855F7', // purple-500
    '#A855F7',
    '#EC4899', // pink-500
    '#EC4899',
    '#F59E0B', // amber-500
    '#F59E0B',
    '#10B981', // emerald-500
    '#10B981',
    '#059669', // emerald-600
    '#059669',
    '#14B8A6', // teal-500
    '#14B8A6',
  ];
  return colors[index % colors.length];
}

export function PipelineStages({ data, className }: PipelineStagesProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-6', className)}>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Pipeline Stages</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {data.map((stage, i) => {
          const barWidth = Math.max((stage.count / maxCount) * 100, 4);
          const color = getStageColor(i, data.length);
          const pct = totalCount > 0 ? ((stage.count / totalCount) * 100).toFixed(0) : '0';

          return (
            <div
              key={stage.stage}
              className="group relative border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-gray-300 transition-all"
            >
              {/* Color accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={{ backgroundColor: color }}
              />

              {/* Stage name */}
              <div
                className="text-xs font-medium text-gray-500 mt-1 truncate"
                title={stage.stage}
              >
                {stage.stage}
              </div>

              {/* Count + percentage */}
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-gray-900">{stage.count}</span>
                <span className="text-xs text-gray-400">{pct}%</span>
              </div>

              {/* Dollar value */}
              {stage.dollarValue > 0 && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatCurrency(stage.dollarValue)}
                </div>
              )}

              {/* Proportion bar */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${barWidth}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
