'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Scissors, Sparkles } from 'lucide-react';
import { OrderType } from '@/lib/types/database';
import {
  getPipelineConfig,
  calculateEstimatedCompletion,
} from '@/lib/workflow/pipeline-system';

interface PipelineSelectorProps {
  selectedPipeline: OrderType;
  onPipelineChange: (pipeline: OrderType) => void;
  onNext: () => void;
  onPrev?: () => void;
}

export function PipelineSelector({
  selectedPipeline,
  onPipelineChange,
  onNext,
  onPrev,
}: PipelineSelectorProps) {
  const pipelines = [
    {
      type: 'alteration' as OrderType,
      config: getPipelineConfig('alteration'),
      icon: Scissors,
      features: [
        'Standard alterations',
        'Quick turnaround',
        'Fixed pricing',
        'Quality guarantee',
      ],
    },
    {
      type: 'custom' as OrderType,
      config: getPipelineConfig('custom'),
      icon: Sparkles,
      features: [
        'Custom design work',
        'Personal consultation',
        'Unique creations',
        'Premium materials',
      ],
    },
  ];

  const getEstimatedTime = (pipelineType: OrderType) => {
    const estimate = calculateEstimatedCompletion(pipelineType, false);
    return {
      days: estimate.days,
      hours: estimate.hours,
      isRush: false,
    };
  };

  return (
    <div className='h-full flex flex-col overflow-hidden min-h-0'>
      {/* iOS-style Header */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-border bg-white flex-shrink-0'>
        <div className='w-1/3'>
          {onPrev && (
            <Button
              onClick={onPrev}
              variant='ghost'
              className='text-primary-600 hover:text-primary-800 p-0'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-5 w-5 mr-1'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 19l-7-7 7-7'
                />
              </svg>
              Back
            </Button>
          )}
        </div>
        <h2 className='text-lg font-semibold text-foreground'>
          Choose Your Service Type
        </h2>
        <Button
          onClick={onNext}
          className='text-primary-600 hover:text-primary-800 p-0'
          variant='ghost'
        >
          Next
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-6 w-6 ml-1'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 5l7 7-7 7'
            />
          </svg>
        </Button>
      </div>

      {/* Main Content Area */}
      <div className='flex-1 overflow-y-auto p-4 bg-muted/50 min-h-0'>
        <div className='max-w-4xl mx-auto space-y-4'>
          <div className='text-center mb-6'>
            <p className='text-sm text-muted-foreground'>
              Select the type of work you need done
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {pipelines.map(({ type, config, icon: Icon, features }) => {
              const isSelected = selectedPipeline === type;
              const estimate = getEstimatedTime(type);

              return (
                <Card
                  key={type}
                  className={`cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'ring-2 ring-primary shadow-lg scale-105'
                      : 'hover:shadow-md hover:scale-102'
                  }`}
                  onClick={() => {
                    onPipelineChange(type);
                    setTimeout(() => onNext(), 300);
                  }}
                >
                  <CardHeader className='text-center pb-2'>
                    <div className='mx-auto mb-2 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center'>
                      <Icon className='w-5 h-5 text-primary' />
                    </div>
                    <CardTitle className='text-base'>{config.name}</CardTitle>
                    <CardDescription className='text-xs'>
                      {config.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className='space-y-2 pt-0'>
                    {/* Features */}
                    <div className='space-y-1'>
                      {features.map((feature, index) => (
                        <div key={index} className='flex items-center text-xs'>
                          <div className='w-1 h-1 rounded-full bg-primary mr-2' />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Time Estimate */}
                    <div className='bg-muted/50 rounded-lg p-2'>
                      <div className='flex items-center justify-between mb-1'>
                        <span className='text-xs font-medium text-muted-foreground'>
                          Estimated Time
                        </span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <div className='flex items-center text-xs'>
                          <Clock className='w-3 h-3 mr-1 text-muted-foreground' />
                          <span className='font-medium'>
                            {estimate.days} days
                          </span>
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          ~{estimate.hours} hours
                        </div>
                      </div>
                    </div>

                    {/* Pricing Info */}
                    <div className='text-center'>
                      <div className='text-sm font-bold text-primary'>
                        {type === 'alteration' ? '$15+' : 'Gratuit'}
                      </div>
                    </div>

                    {/* Selection Button */}
                    <div className='flex items-center justify-center'>
                      {isSelected ? (
                        <div className='w-full py-1.5 px-3 bg-gradient-to-r from-primary-500 to-accent-clay text-white font-semibold rounded-lg text-center shadow-lg text-xs'>
                          ✓ Selected
                        </div>
                      ) : (
                        <div className='w-full py-1.5 px-3 bg-muted text-muted-foreground font-medium rounded-lg text-center border border-border text-xs'>
                          Select This Option
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pipeline Comparison - Compact */}
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-center text-base'>
                Pipeline Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className='pt-0'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {pipelines.map(({ type, config }) => (
                  <div key={type} className='space-y-1'>
                    <div className='flex items-center space-x-2'>
                      <span className='text-sm'>{config.icon}</span>
                      <h4 className='font-semibold text-xs'>{config.name}</h4>
                    </div>
                    <div className='space-y-1 text-xs'>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Timeline:</span>
                        <span className='font-medium'>
                          {config.estimatedDays} days
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Assignee:</span>
                        <span className='font-medium capitalize'>
                          {config.defaultAssignee}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
