'use client';

import { useState, useEffect } from 'react';
import { TimerButton } from '@/components/timer/timer-button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PlayCircle } from 'lucide-react';

interface Task {
  id: string;
  service_id: string | null;
  operation: string;
  stage: 'pending' | 'working' | 'done' | 'ready' | 'delivered';
  planned_minutes: number;
  actual_minutes: number;
  is_active: boolean;
  service?: {
    id: string;
    name: string;
    code: string;
    category: string;
  };
}

interface GarmentTaskSummaryProps {
  garmentId: string;
  orderId: string;
  orderStatus: string;
  garmentType?: string;
}

export function GarmentTaskSummary({
  garmentId,
  orderId,
  orderStatus,
  garmentType
}: GarmentTaskSummaryProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [garmentId]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/tasks/order/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        const garmentTasks = data.data.tasksByGarment[garmentId] || [];
        setTasks(garmentTasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const totalPlanned = tasks.reduce((sum, task) => sum + (task.planned_minutes || 0), 0);
  const totalActual = tasks.reduce((sum, task) => sum + (task.actual_minutes || 0), 0);
  const completedTasks = tasks.filter(task => task.stage === 'done').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const variance = totalActual - totalPlanned;
  const hasActiveTimer = tasks.some(task => task.is_active);

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'done':
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'working':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return <div className="animate-pulse h-20 bg-gray-100 rounded"></div>;
  }

  return (
    <Card className="p-4 space-y-3">
      {/* Summary Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <h4 className="font-medium text-sm">
            {garmentType || 'Garment'} Tasks
          </h4>
          <Badge variant="outline" className="text-xs">
            {completedTasks}/{totalTasks} Complete
          </Badge>
          {hasActiveTimer && (
            <Badge className="bg-blue-100 text-blue-800 animate-pulse">
              <PlayCircle className="w-3 h-3 mr-1" />
              Active
            </Badge>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <Progress value={progressPercentage} className="h-2" />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Planned: {formatMinutes(totalPlanned)}</span>
          <span>Actual: {formatMinutes(totalActual)}</span>
          <span className={variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : ''}>
            {variance > 0 ? '+' : ''}{formatMinutes(variance)}
          </span>
        </div>
      </div>

      {/* Task List */}
      {expanded && tasks.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2 flex-1">
                <Badge className={`text-xs ${getStageColor(task.stage)}`}>
                  {task.stage}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">{task.operation}</p>
                  <p className="text-xs text-gray-500">
                    {formatMinutes(task.planned_minutes)} planned
                    {task.actual_minutes > 0 && (
                      <> • {formatMinutes(task.actual_minutes)} actual</>
                    )}
                  </p>
                </div>
              </div>

              <TimerButton
                orderId={orderId}
                garmentId={task.id}
                orderStatus={orderStatus}
              />
            </div>
          ))}
        </div>
      )}

      {expanded && tasks.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-2">
          No services for this garment. Add services during order intake.
        </p>
      )}
    </Card>
  );
}