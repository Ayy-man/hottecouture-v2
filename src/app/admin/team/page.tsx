'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users, RefreshCw, Loader2, Trash2 } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export default function TeamManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/admin/team');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch staff');
      }

      setStaff(data.staff);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch staff');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isAdding) return;

    try {
      setIsAdding(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add staff member');
      }

      setNewName('');
      setSuccessMessage(`${data.staff.name} added successfully!`);
      await fetchStaff();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to add staff:', err);
      setError(err instanceof Error ? err.message : 'Failed to add staff member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      setTogglingId(id);
      setError(null);

      const response = await fetch('/api/admin/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update staff member');
      }

      // Update local state
      setStaff(prev =>
        prev.map(s => (s.id === id ? { ...s, is_active: !currentActive } : s))
      );
    } catch (err) {
      console.error('Failed to toggle staff status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update staff member');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    // Confirm deletion
    if (!confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(id);
      setError(null);

      const response = await fetch(`/api/admin/team/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete staff member');
      }

      // Remove from local state
      setStaff(prev => prev.filter(s => s.id !== id));
      setSuccessMessage(`${name} deleted successfully`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete staff:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete staff member');
    } finally {
      setDeletingId(null);
    }
  };

  const activeStaff = staff.filter(s => s.is_active);
  const inactiveStaff = staff.filter(s => !s.is_active);

  return (
    <div className='min-h-screen bg-muted/50 py-8'>
      <div className='container mx-auto px-4 max-w-4xl'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-center mb-2'>
            Team Management
          </h1>
          <p className='text-center text-muted-foreground'>
            Manage seamstresses and team members
          </p>
        </div>

        {error && (
          <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700'>
            {error}
          </div>
        )}

        {successMessage && (
          <div className='mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700'>
            {successMessage}
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Add New Team Member */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <UserPlus className='w-5 h-5' />
                Add New Team Member
              </CardTitle>
              <CardDescription>
                Add a new seamstress or team member to the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddStaff} className='space-y-4'>
                <div className='space-y-2'>
                  <label htmlFor='name' className='text-sm font-medium'>
                    Name
                  </label>
                  <Input
                    id='name'
                    type='text'
                    placeholder='Enter team member name'
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    disabled={isAdding}
                    minLength={2}
                    required
                  />
                </div>
                <Button
                  type='submit'
                  className='w-full'
                  disabled={isAdding || !newName.trim()}
                >
                  {isAdding ? (
                    <>
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className='w-4 h-4 mr-2' />
                      Add Team Member
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Current Team Members */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <Users className='w-5 h-5' />
                    Current Team Members
                  </CardTitle>
                  <CardDescription>
                    {staff.length} total ({activeStaff.length} active, {inactiveStaff.length} inactive)
                  </CardDescription>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={fetchStaff}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
                </div>
              ) : staff.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  <Users className='w-12 h-12 mx-auto mb-4 text-muted-foreground/50' />
                  <p>No team members yet</p>
                  <p className='text-sm'>Add your first team member using the form</p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {/* Active Members */}
                  {activeStaff.length > 0 && (
                    <div className='space-y-2'>
                      {activeStaff.map(member => (
                        <div
                          key={member.id}
                          className='flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg'
                        >
                          <div className='flex items-center gap-3'>
                            <span className='font-medium'>{member.name}</span>
                            <Badge className='bg-green-500 hover:bg-green-600'>
                              Active
                            </Badge>
                          </div>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleToggleActive(member.id, member.is_active)}
                            disabled={togglingId === member.id}
                          >
                            {togglingId === member.id ? (
                              <Loader2 className='w-4 h-4 animate-spin' />
                            ) : (
                              'Deactivate'
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inactive Members */}
                  {inactiveStaff.length > 0 && (
                    <div className='space-y-2'>
                      {activeStaff.length > 0 && (
                        <div className='text-sm text-muted-foreground mt-4 mb-2'>
                          Inactive Members
                        </div>
                      )}
                      {inactiveStaff.map(member => (
                        <div
                          key={member.id}
                          className='flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg'
                        >
                          <div className='flex items-center gap-3'>
                            <span className='font-medium text-muted-foreground'>
                              {member.name}
                            </span>
                            <Badge variant='secondary'>Inactive</Badge>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleToggleActive(member.id, member.is_active)}
                              disabled={togglingId === member.id || deletingId === member.id}
                            >
                              {togglingId === member.id ? (
                                <Loader2 className='w-4 h-4 animate-spin' />
                              ) : (
                                'Activate'
                              )}
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleDelete(member.id, member.name)}
                              disabled={deletingId === member.id || togglingId === member.id}
                              className='text-red-600 hover:text-red-700 hover:bg-red-50'
                            >
                              {deletingId === member.id ? (
                                <Loader2 className='w-4 h-4 animate-spin' />
                              ) : (
                                <Trash2 className='w-4 h-4' />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
