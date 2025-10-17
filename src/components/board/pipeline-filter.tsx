'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors, Sparkles, Filter, X } from 'lucide-react';
import { OrderType } from '@/lib/types/database';
import {
  getPipelineConfig,
  getPipelineStats,
} from '@/lib/workflow/pipeline-system';

interface PipelineFilterProps {
  orders: any[];
  selectedPipeline: OrderType | 'all';
  onPipelineChange: (pipeline: OrderType | 'all') => void;
  className?: string;
}

export function PipelineFilter({
  orders,
  selectedPipeline,
  onPipelineChange,
  className = '',
}: PipelineFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const pipelineStats = getPipelineStats(orders);
  const totalOrders = orders.length;

  const pipelines = [
    {
      type: 'all' as const,
      name: 'All Orders',
      icon: Filter,
      color: 'bg-gray-100 text-gray-800',
      count: totalOrders,
      description: 'View all orders across all pipelines',
    },
    {
      type: 'alteration' as OrderType,
      name: 'Alterations',
      icon: Scissors,
      color: 'bg-blue-100 text-blue-800',
      count: pipelineStats.alteration,
      description: 'Standard garment alterations and repairs',
    },
    {
      type: 'custom' as OrderType,
      name: 'Custom Design',
      icon: Sparkles,
      color: 'bg-purple-100 text-purple-800',
      count: pipelineStats.custom,
      description: 'Custom design and creation work',
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Compact Filter Bar */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          <span className='text-sm font-medium text-gray-700'>Pipeline:</span>
          <div className='flex items-center space-x-2'>
            {pipelines.map(pipeline => {
              const Icon = pipeline.icon;
              const isSelected = selectedPipeline === pipeline.type;

              return (
                <Button
                  key={pipeline.type}
                  variant={isSelected ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => onPipelineChange(pipeline.type)}
                  className={`btn-press flex items-center space-x-2 font-semibold shadow-md hover:shadow-lg transition-all duration-300 ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                      : 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 border-gray-300'
                  }`}
                >
                  <Icon className='w-4 h-4' />
                  <span>{pipeline.name}</span>
                  <Badge
                    variant='secondary'
                    className={`ml-1 ${
                      isSelected
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-gray-200 text-gray-600 border-gray-300'
                    }`}
                  >
                    {pipeline.count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>

        <Button
          variant='ghost'
          size='sm'
          onClick={() => setIsExpanded(!isExpanded)}
          className='text-gray-500 hover:text-gray-700'
        >
          {isExpanded ? (
            <X className='w-4 h-4' />
          ) : (
            <Filter className='w-4 h-4' />
          )}
        </Button>
      </div>

      {/* Expanded Pipeline Details */}
      {isExpanded && (
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {pipelines.map(pipeline => {
                const Icon = pipeline.icon;
                const isSelected = selectedPipeline === pipeline.type;
                const config =
                  pipeline.type !== 'all'
                    ? getPipelineConfig(pipeline.type)
                    : null;

                return (
                  <div
                    key={pipeline.type}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => onPipelineChange(pipeline.type)}
                  >
                    <div className='flex items-center space-x-3 mb-2'>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${pipeline.color}`}
                      >
                        <Icon className='w-4 h-4' />
                      </div>
                      <div>
                        <h3 className='font-semibold'>{pipeline.name}</h3>
                        <p className='text-sm text-gray-600'>
                          {pipeline.description}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center justify-between'>
                      <div className='text-2xl font-bold text-primary'>
                        {pipeline.count}
                      </div>
                      <div className='text-right text-sm text-gray-500'>
                        {config && (
                          <>
                            <div>{config.estimatedDays} days avg</div>
                            <div>{config.rushMultiplier}x rush</div>
                          </>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className='mt-2 text-xs text-primary font-medium'>
                        Currently viewing
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pipeline Statistics */}
            <div className='mt-6 pt-4 border-t'>
              <h4 className='font-semibold mb-3'>Pipeline Statistics</h4>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                <div className='text-center'>
                  <div className='text-lg font-bold text-gray-900'>
                    {totalOrders}
                  </div>
                  <div className='text-gray-600'>Total Orders</div>
                </div>
                <div className='text-center'>
                  <div className='text-lg font-bold text-blue-600'>
                    {pipelineStats.alteration || 0}
                  </div>
                  <div className='text-gray-600'>Alterations</div>
                </div>
                <div className='text-center'>
                  <div className='text-lg font-bold text-purple-600'>
                    {pipelineStats.custom || 0}
                  </div>
                  <div className='text-gray-600'>Custom Design</div>
                </div>
                <div className='text-center'>
                  <div className='text-lg font-bold text-green-600'>
                    {Math.round(
                      ((pipelineStats.alteration || 0) / totalOrders) * 100
                    ) || 0}
                    %
                  </div>
                  <div className='text-gray-600'>Alteration %</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
