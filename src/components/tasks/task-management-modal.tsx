'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimerButton } from '@/components/timer/timer-button';
import { Edit2, Save, X, Clock, User, CheckCircle } from 'lucide-react';
import { useStaff } from '@/lib/hooks/useStaff';

interface Task {
  id: string;
  garment_id: string;
  service_id: string | null;
  operation: string;
  stage: 'pending' | 'working' | 'done' | 'ready' | 'delivered';
  planned_minutes: number;
  actual_minutes: number;
  is_active: boolean;
  assignee: string | null;
  notes?: string;
  garment: {
    id: string;
    type: string;
    label_code?: string;
  };
  service?: {
    id: string;
    name: string;
    code: string;
  };
}

interface TaskManagementModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

const STAGE_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'working', label: 'Working' },
  { value: 'done', label: 'Done' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
];

export function TaskManagementModal({
  orderId,
  isOpen,
  onClose
}: TaskManagementModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Task>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { staff } = useStaff(true);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchTasks();
    }
  }, [isOpen, orderId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/order/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task.id);
    setEditForm({
      planned_minutes: task.planned_minutes,
      actual_minutes: task.actual_minutes,
      assignee: task.assignee || null,
      stage: task.stage,
      notes: task.notes || '',
    });
  };

  const handleSaveTask = async (taskId: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        await fetchTasks(); // Refresh tasks
        setEditingTask(null);
        setEditForm({});
      } else {
        console.error('Failed to save task');
      }
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditForm({});
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

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

  // Group tasks by garment
  const tasksByGarment = tasks.reduce((acc, task) => {
    const garmentId = task.garment_id;
    if (!acc[garmentId]) {
      acc[garmentId] = {
        garment: task.garment,
        tasks: [],
      };
    }
    acc[garmentId].tasks.push(task);
    return acc;
  }, {} as Record<string, { garment: Task['garment']; tasks: Task[] }>);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Tasks" size="lg">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Task count header */}
        <div className="flex justify-between items-center pb-4 border-b">
          <p className="text-sm text-gray-600">
            {tasks.length} task(s) found
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : Object.keys(tasksByGarment).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No services for this order. Add services during order intake.
            </p>
          </div>
        ) : (
          Object.entries(tasksByGarment).map(([garmentId, { garment, tasks: garmentTasks }]) => (
            <Card key={garmentId} className="p-4 space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                {garment.type}
                {garment.label_code && (
                  <Badge variant="outline" className="text-xs">
                    {garment.label_code}
                  </Badge>
                )}
              </h3>

              {garmentTasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-3 space-y-3">
                  {editingTask === task.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Stage
                          </label>
                          <Select
                            value={editForm.stage || ''}
                            onValueChange={(value) =>
                              setEditForm({ ...editForm, stage: value as Task['stage'] })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STAGE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Assignee
                          </label>
                          <Select
                            value={editForm.assignee || ''}
                            onValueChange={(value) =>
                              setEditForm({ ...editForm, assignee: value || null })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              {staff.map((member) => (
                                <SelectItem key={member.id} value={member.name}>
                                  {member.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Planned (min)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={editForm.planned_minutes || ''}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                planned_minutes: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Actual (min)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={editForm.actual_minutes || ''}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                actual_minutes: parseInt(e.target.value) || 0,
                              })
                            }
                            disabled={task.is_active}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <Textarea
                          value={editForm.notes || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, notes: e.target.value })
                          }
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveTask(task.id)}
                          disabled={saving}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Badge className={`text-xs ${getStageColor(task.stage)}`}>
                            {task.stage}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{task.operation}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatMinutes(task.planned_minutes)} planned
                              </span>
                              {task.actual_minutes > 0 && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  {formatMinutes(task.actual_minutes)} actual
                                </span>
                              )}
                              {task.assignee && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {task.assignee}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <TimerButton
                            orderId={orderId}
                            garmentId={task.id}
                            orderStatus="working" // Assuming we're in working context
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTask(task)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {task.notes && (
                        <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                          {task.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          ))
        )}
      </div>
    </Modal>
  );
}