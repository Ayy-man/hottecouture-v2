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
    <div className='space-y-6'>
      <div className='text-center'>
        <h2 className='text-2xl font-bold mb-2'>Choose Your Service Type</h2>
        <p className='text-gray-600'>Select the type of work you need done</p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
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
              onClick={() => onPipelineChange(type)}
            >
              <CardHeader className='text-center'>
                <div className='mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center'>
                  <Icon className='w-8 h-8 text-primary' />
                </div>
                <CardTitle className='text-xl'>{config.name}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>

              <CardContent className='space-y-4'>
                {/* Features */}
                <div className='space-y-2'>
                  {features.map((feature, index) => (
                    <div key={index} className='flex items-center text-sm'>
                      <div className='w-2 h-2 rounded-full bg-primary mr-3' />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Time Estimate */}
                <div className='bg-gray-50 rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-sm font-medium text-gray-600'>
                      Estimated Time
                    </span>
                  </div>
                  <div className='flex items-center space-x-4'>
                    <div className='flex items-center text-sm'>
                      <Clock className='w-4 h-4 mr-1 text-gray-500' />
                      <span className='font-medium'>{estimate.days} days</span>
                    </div>
                    <div className='text-sm text-gray-500'>
                      ~{estimate.hours} hours
                    </div>
                  </div>
                </div>

                {/* Pricing Info */}
                <div className='text-center'>
                  <div className='text-sm text-gray-600 mb-1'>
                    {type === 'alteration' ? 'Starting at' : 'Consultation'}
                  </div>
                  <div className='text-lg font-bold text-primary'>
                    {type === 'alteration' ? '$15' : 'Free'}
                  </div>
                </div>

                {/* Selection Button */}
                <div className='flex items-center justify-center'>
                  {isSelected ? (
                    <div className='w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg text-center shadow-lg'>
                      ✓ Selected
                    </div>
                  ) : (
                    <div className='w-full py-2 px-4 bg-gray-100 text-gray-600 font-medium rounded-lg text-center border border-gray-200'>
                      Select This Option
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pipeline Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className='text-center'>Pipeline Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {pipelines.map(({ type, config }) => (
              <div key={type} className='space-y-3'>
                <div className='flex items-center space-x-2'>
                  <span className='text-2xl'>{config.icon}</span>
                  <h4 className='font-semibold'>{config.name}</h4>
                </div>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>Typical Timeline:</span>
                    <span className='font-medium'>
                      {config.estimatedDays} days
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>Default Assignee:</span>
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

      {/* Navigation */}
      <div className='flex space-x-4'>
        {onPrev && (
          <Button
            type='button'
            variant='outline'
            onClick={onPrev}
            className='flex-1 py-3 text-lg btn-press'
          >
            Previous
          </Button>
        )}
        <Button
          type='button'
          onClick={onNext}
          className='flex-1 py-3 text-lg btn-press bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300'
        >
          Next Step →
        </Button>
      </div>
    </div>
  );
}
