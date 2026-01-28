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

interface MeasurementTemplate {
  id: string;
  name: string;
  name_fr: string;
  category: string;
  unit: string;
  display_order: number;
  is_active: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  body: 'Corps',
  curtain: 'Rideaux',
  upholstery: 'Rembourrage',
  bedding: 'Literie',
};

const CATEGORY_ICONS: Record<string, string> = {
  body: '👤',
  curtain: '🪟',
  upholstery: '🛋️',
  bedding: '🛏️',
};

export default function MeasurementTemplatesPage() {
  const [templates, setTemplates] = useState<MeasurementTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('body');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('cm');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('');

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteUsageCount, setDeleteUsageCount] = useState<number | null>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/measurement-templates', {
        cache: 'no-store',
      });
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates || []);
        setCategories(data.categories || []);
      } else {
        setError(data.error || 'Failed to load templates');
      }
    } catch (err) {
      setError('Failed to load measurement templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = templates
    .filter(t => t.category === activeCategory)
    .sort((a, b) => a.display_order - b.display_order);

  const handleAddTemplate = async () => {
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/measurement-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_fr: newName.trim(),
          category: activeCategory,
          unit: newUnit.trim() || 'cm',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTemplates(prev => [...prev, data.template]);
        setNewName('');
        setNewUnit('cm');
        setShowAddForm(false);
      } else {
        alert(data.error || 'Failed to create template');
      }
    } catch (err) {
      alert('Failed to create template');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (template: MeasurementTemplate) => {
    setEditingId(template.id);
    setEditName(template.name_fr);
    setEditUnit(template.unit);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/measurement-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          name_fr: editName.trim(),
          unit: editUnit.trim() || 'cm',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTemplates(prev =>
          prev.map(t => (t.id === editingId ? data.template : t))
        );
        setEditingId(null);
        setEditName('');
        setEditUnit('');
      } else {
        alert(data.error || 'Failed to update template');
      }
    } catch (err) {
      alert('Failed to update template');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditUnit('');
  };

  const handleCheckDelete = async (templateId: string) => {
    try {
      const response = await fetch(
        `/api/admin/measurement-templates?usage=true&id=${templateId}`
      );
      const data = await response.json();

      if (data.success) {
        setDeleteUsageCount(data.usageCount);
        setDeleteConfirmId(templateId);
      }
    } catch (err) {
      console.error('Error checking usage:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      const response = await fetch(
        `/api/admin/measurement-templates?id=${deleteConfirmId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        setTemplates(prev => prev.filter(t => t.id !== deleteConfirmId));
      } else {
        alert(data.error || 'Failed to delete template');
      }
    } catch (err) {
      alert('Failed to delete template');
      console.error(err);
    } finally {
      setDeleteConfirmId(null);
      setDeleteUsageCount(null);
    }
  };

  const handleMoveUp = async (template: MeasurementTemplate) => {
    const currentIndex = filteredTemplates.findIndex(t => t.id === template.id);
    if (currentIndex <= 0) return;

    const prevTemplate = filteredTemplates[currentIndex - 1];
    if (!prevTemplate) return;

    // Swap display_order values
    try {
      await Promise.all([
        fetch('/api/admin/measurement-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: template.id,
            display_order: prevTemplate.display_order,
          }),
        }),
        fetch('/api/admin/measurement-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: prevTemplate.id,
            display_order: template.display_order,
          }),
        }),
      ]);

      // Update local state
      setTemplates(prev =>
        prev.map(t => {
          if (t.id === template.id) {
            return { ...t, display_order: prevTemplate.display_order };
          }
          if (t.id === prevTemplate.id) {
            return { ...t, display_order: template.display_order };
          }
          return t;
        })
      );
    } catch (err) {
      console.error('Error reordering:', err);
    }
  };

  const handleMoveDown = async (template: MeasurementTemplate) => {
    const currentIndex = filteredTemplates.findIndex(t => t.id === template.id);
    if (currentIndex >= filteredTemplates.length - 1) return;

    const nextTemplate = filteredTemplates[currentIndex + 1];
    if (!nextTemplate) return;

    // Swap display_order values
    try {
      await Promise.all([
        fetch('/api/admin/measurement-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: template.id,
            display_order: nextTemplate.display_order,
          }),
        }),
        fetch('/api/admin/measurement-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: nextTemplate.id,
            display_order: template.display_order,
          }),
        }),
      ]);

      // Update local state
      setTemplates(prev =>
        prev.map(t => {
          if (t.id === template.id) {
            return { ...t, display_order: nextTemplate.display_order };
          }
          if (t.id === nextTemplate.id) {
            return { ...t, display_order: template.display_order };
          }
          return t;
        })
      );
    } catch (err) {
      console.error('Error reordering:', err);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-muted/50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4'></div>
          <p className='text-muted-foreground'>Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-muted/50 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-red-600 mb-4'>{error}</p>
          <Button onClick={loadTemplates}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-muted/50 py-8'>
      <div className='container mx-auto px-4 max-w-4xl'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-center mb-2'>
            Gestion des Mesures
          </h1>
          <p className='text-center text-muted-foreground'>
            Gérez les champs de mesure disponibles pour chaque catégorie
          </p>
        </div>

        {/* Category Tabs */}
        <div className='flex flex-wrap gap-2 mb-6 justify-center'>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                activeCategory === cat
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-white text-foreground hover:bg-accent border border-border'
              }`}
            >
              <span>{CATEGORY_ICONS[cat] || '📏'}</span>
              <span>{CATEGORY_LABELS[cat] || cat}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeCategory === cat
                    ? 'bg-white/20 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {templates.filter(t => t.category === cat).length}
              </span>
            </button>
          ))}
        </div>

        {/* Templates List */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='flex items-center gap-2'>
                  <span>{CATEGORY_ICONS[activeCategory] || '📏'}</span>
                  {CATEGORY_LABELS[activeCategory] || activeCategory}
                </CardTitle>
                <CardDescription>
                  {filteredTemplates.length} champ(s) de mesure
                </CardDescription>
              </div>
              {!showAddForm && (
                <Button
                  onClick={() => setShowAddForm(true)}
                  className='bg-primary-500 hover:bg-primary-600'
                >
                  + Ajouter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Add Form */}
            {showAddForm && (
              <div className='mb-6 p-4 bg-primary-50 rounded-lg border-2 border-primary-200'>
                <h3 className='font-semibold mb-3'>Nouveau champ de mesure</h3>
                <div className='grid grid-cols-2 gap-3 mb-3'>
                  <div>
                    <label className='block text-sm font-medium mb-1'>
                      Nom (français) *
                    </label>
                    <input
                      type='text'
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder='ex: Tour de biceps'
                      className='w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500'
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddTemplate();
                        if (e.key === 'Escape') {
                          setShowAddForm(false);
                          setNewName('');
                          setNewUnit('cm');
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium mb-1'>Unité</label>
                    <input
                      type='text'
                      value={newUnit}
                      onChange={e => setNewUnit(e.target.value)}
                      placeholder='cm'
                      className='w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500'
                    />
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewName('');
                      setNewUnit('cm');
                    }}
                    variant='outline'
                    disabled={isSubmitting}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleAddTemplate}
                    disabled={!newName.trim() || isSubmitting}
                    className='bg-primary-500 hover:bg-primary-600'
                  >
                    {isSubmitting ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </div>
            )}

            {/* Templates List */}
            {filteredTemplates.length === 0 ? (
              <div className='text-center py-12 text-muted-foreground'>
                <p className='text-4xl mb-4'>📏</p>
                <p>Aucun champ de mesure dans cette catégorie</p>
                <p className='text-sm mt-2'>
                  Cliquez sur "Ajouter" pour créer un nouveau champ
                </p>
              </div>
            ) : (
              <div className='space-y-2'>
                {filteredTemplates.map((template, index) => (
                  <div
                    key={template.id}
                    className='flex items-center gap-3 p-3 bg-white border border-border rounded-lg hover:border-border transition-colors'
                  >
                    {/* Reorder buttons */}
                    <div className='flex flex-col gap-1'>
                      <button
                        onClick={() => handleMoveUp(template)}
                        disabled={index === 0}
                        className='p-1 text-muted-foreground/70 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed'
                        title='Monter'
                      >
                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 15l7-7 7 7' />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveDown(template)}
                        disabled={index === filteredTemplates.length - 1}
                        className='p-1 text-muted-foreground/70 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed'
                        title='Descendre'
                      >
                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                        </svg>
                      </button>
                    </div>

                    {/* Template info or edit form */}
                    {editingId === template.id ? (
                      <div className='flex-1 flex items-center gap-3'>
                        <input
                          type='text'
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className='flex-1 px-3 py-1.5 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500'
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <input
                          type='text'
                          value={editUnit}
                          onChange={e => setEditUnit(e.target.value)}
                          className='w-20 px-3 py-1.5 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500'
                          placeholder='cm'
                        />
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editName.trim() || isSubmitting}
                          className='p-2 text-green-600 hover:text-green-700 disabled:opacity-50'
                          title='Enregistrer'
                        >
                          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                          </svg>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className='p-2 text-muted-foreground/70 hover:text-muted-foreground'
                          title='Annuler'
                        >
                          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className='flex-1'>
                          <span className='font-medium'>{template.name_fr}</span>
                          <span className='text-muted-foreground text-sm ml-2'>
                            ({template.unit})
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <button
                            onClick={() => handleStartEdit(template)}
                            className='p-2 text-muted-foreground/70 hover:text-primary-600 transition-colors'
                            title='Modifier'
                          >
                            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleCheckDelete(template.id)}
                            className='p-2 text-muted-foreground/70 hover:text-red-600 transition-colors'
                            title='Supprimer'
                          >
                            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
              <h3 className='text-lg font-semibold mb-4'>
                Supprimer ce champ de mesure ?
              </h3>
              {deleteUsageCount !== null && (
                <p className='text-sm text-muted-foreground mb-4'>
                  {deleteUsageCount > 0 ? (
                    <span className='text-red-600 font-semibold'>
                      Ce champ est utilisé par {deleteUsageCount} mesure(s).
                      Impossible de supprimer.
                    </span>
                  ) : (
                    <span className='text-green-600'>
                      Ce champ n'est utilisé par aucune mesure. Suppression possible.
                    </span>
                  )}
                </p>
              )}
              <div className='flex gap-2'>
                <Button
                  onClick={() => {
                    setDeleteConfirmId(null);
                    setDeleteUsageCount(null);
                  }}
                  variant='outline'
                  className='flex-1'
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleteUsageCount !== null && deleteUsageCount > 0}
                  variant='destructive'
                  className='flex-1'
                >
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Back link */}
        <div className='mt-6 text-center'>
          <a
            href='/'
            className='text-primary-600 hover:text-primary-700 hover:underline'
          >
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}
