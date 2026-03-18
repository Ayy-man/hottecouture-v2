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
import { EmojiPicker } from '@/components/ui/emoji-picker';
import {
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface GarmentTypeRow {
  id: string;
  code: string;
  name: string;
  category: string;
  icon: string;
  is_common: boolean;
  is_custom: boolean;
  display_order: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  womens: 'Vetements femmes',
  mens: 'Vetements hommes',
  outerwear: 'Manteaux',
  formal: 'Tenue de soiree',
  activewear: 'Vetements sport',
  home: 'Sur mesure',
  outdoor: 'Exterieur',
  other: 'Autre',
  alteration: 'Retouches',
  custom: 'Personnalise',
};

export default function GarmentTypesAdminPage() {
  const [garmentTypes, setGarmentTypes] = useState<GarmentTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteUsageCount, setDeleteUsageCount] = useState<number | null>(null);

  // Success message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadGarmentTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/garment-types', { cache: 'no-store' });
      const data = await response.json();

      if (data.success) {
        const types: GarmentTypeRow[] = (data.garmentTypes || []).map(
          (t: any) => ({
            id: t.id,
            code: t.code,
            name: t.name,
            category: t.category,
            icon: t.icon || '📝',
            is_common: t.is_common,
            is_custom: t.is_custom,
            display_order: t.display_order ?? 0,
          })
        );
        setGarmentTypes(types);
        setError(null);
      } else {
        setError(data.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      setError('Erreur lors du chargement des types de vetement');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGarmentTypes();
  }, []);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const sortedTypes = [...garmentTypes].sort(
    (a, b) => a.display_order - b.display_order
  );

  const handleStartEdit = (type: GarmentTypeRow) => {
    setEditingId(type.id);
    setEditName(type.name);
    setEditEmoji(type.icon || '📝');
  };

  const handleSaveEdit = async (typeId: string) => {
    if (!editName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/garment-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: typeId,
          name: editName.trim(),
          icon: editEmoji,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGarmentTypes(prev =>
          prev.map(t =>
            t.id === typeId
              ? { ...t, name: editName.trim(), icon: editEmoji }
              : t
          )
        );
        setEditingId(null);
        setEditName('');
        setEditEmoji('');
        showSuccess('Type modifie');
      } else {
        alert(data.error || 'Erreur lors de la modification');
      }
    } catch (err) {
      alert('Erreur lors de la modification');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditEmoji('');
  };

  const handleCheckDelete = async (typeId: string) => {
    try {
      const response = await fetch(
        `/api/admin/garment-types?usage=true&id=${typeId}`
      );
      const data = await response.json();

      if (data.success) {
        setDeleteUsageCount(data.usageCount);
        setDeleteConfirmId(typeId);
      }
    } catch (err) {
      console.error('Erreur lors de la verification:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      const response = await fetch(
        `/api/admin/garment-types?id=${deleteConfirmId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        setGarmentTypes(prev => prev.filter(t => t.id !== deleteConfirmId));
        showSuccess('Type supprime');
      } else {
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      alert('Erreur lors de la suppression');
      console.error(err);
    } finally {
      setDeleteConfirmId(null);
      setDeleteUsageCount(null);
    }
  };

  const handleMoveUp = async (type: GarmentTypeRow) => {
    const index = sortedTypes.findIndex(t => t.id === type.id);
    if (index <= 0) return;

    const prevType = sortedTypes[index - 1];
    if (!prevType) return;

    try {
      await Promise.all([
        fetch('/api/admin/garment-types', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: type.id,
            display_order: prevType.display_order,
          }),
        }),
        fetch('/api/admin/garment-types', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: prevType.id,
            display_order: type.display_order,
          }),
        }),
      ]);

      setGarmentTypes(prev =>
        prev.map(t => {
          if (t.id === type.id) {
            return { ...t, display_order: prevType.display_order };
          }
          if (t.id === prevType.id) {
            return { ...t, display_order: type.display_order };
          }
          return t;
        })
      );
    } catch (err) {
      console.error('Erreur lors du reordonnancement:', err);
    }
  };

  const handleMoveDown = async (type: GarmentTypeRow) => {
    const index = sortedTypes.findIndex(t => t.id === type.id);
    if (index >= sortedTypes.length - 1) return;

    const nextType = sortedTypes[index + 1];
    if (!nextType) return;

    try {
      await Promise.all([
        fetch('/api/admin/garment-types', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: type.id,
            display_order: nextType.display_order,
          }),
        }),
        fetch('/api/admin/garment-types', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: nextType.id,
            display_order: type.display_order,
          }),
        }),
      ]);

      setGarmentTypes(prev =>
        prev.map(t => {
          if (t.id === type.id) {
            return { ...t, display_order: nextType.display_order };
          }
          if (t.id === nextType.id) {
            return { ...t, display_order: type.display_order };
          }
          return t;
        })
      );
    } catch (err) {
      console.error('Erreur lors du reordonnancement:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary-500" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadGarmentTypes}>Reessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-muted/50">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-center mb-2">
              Gestion des Types de Vetement
            </h1>
            <p className="text-center text-muted-foreground">
              Modifier, supprimer et reorganiser les types de vetement
            </p>
          </div>

          {/* Success banner */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center">
              {successMessage}
            </div>
          )}

          {/* Main card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Types de vetement</CardTitle>
                  <CardDescription>
                    {sortedTypes.length} type(s) actif(s)
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadGarmentTypes}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                  />
                  Actualiser
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sortedTypes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-4xl mb-4">👔</p>
                  <p>Aucun type de vetement</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedTypes.map((type, index) => (
                    <div key={type.id}>
                      {editingId === type.id ? (
                        /* Edit mode row */
                        <div className="flex items-center gap-3 p-3 bg-primary-50 border-2 border-primary-200 rounded-lg">
                          {/* EmojiPicker */}
                          <EmojiPicker
                            value={editEmoji}
                            onSelect={(emoji) => setEditEmoji(emoji)}
                          />

                          {/* Name input */}
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(type.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />

                          {/* Save button */}
                          <button
                            onClick={() => handleSaveEdit(type.id)}
                            disabled={!editName.trim() || isSubmitting}
                            className="p-2 text-green-600 hover:text-green-700 disabled:opacity-50"
                            title="Enregistrer"
                          >
                            {isSubmitting ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </button>

                          {/* Cancel button */}
                          <button
                            onClick={handleCancelEdit}
                            className="p-2 text-muted-foreground/70 hover:text-muted-foreground"
                            title="Annuler"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        /* Normal row */
                        <div className="flex items-center gap-3 p-3 bg-white border border-border rounded-lg hover:border-border transition-colors">
                          {/* Up/down reorder buttons */}
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleMoveUp(type)}
                              disabled={index === 0}
                              className="p-1 text-muted-foreground/70 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Monter"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(type)}
                              disabled={index === sortedTypes.length - 1}
                              className="p-1 text-muted-foreground/70 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Descendre"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Emoji + Name + Category badge */}
                          <div className="flex-1 flex items-center gap-3">
                            <span className="text-2xl">{type.icon || '📝'}</span>
                            <div>
                              <span className="font-medium">{type.name}</span>
                              <span className="text-muted-foreground text-sm ml-2">
                                (
                                {CATEGORY_LABELS[type.category] ||
                                  type.category}
                                )
                              </span>
                            </div>
                          </div>

                          {/* Edit + Delete buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStartEdit(type)}
                              className="p-2 text-muted-foreground/70 hover:text-primary-600 transition-colors"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCheckDelete(type.id)}
                              className="p-2 text-muted-foreground/70 hover:text-red-600 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Back link */}
          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-primary-600 hover:text-primary-700 hover:underline"
            >
              ← Retour a l'accueil
            </a>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Supprimer ce type de vetement ?
            </h3>
            {deleteUsageCount !== null && (
              <p className="text-sm text-muted-foreground mb-4">
                {deleteUsageCount > 0 ? (
                  <span className="text-red-600 font-semibold">
                    Ce type est utilise dans {deleteUsageCount} commande(s).
                    Impossible de supprimer.
                  </span>
                ) : (
                  <span className="text-green-600">
                    Ce type n'est utilise dans aucune commande. Suppression
                    possible.
                  </span>
                )}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setDeleteConfirmId(null);
                  setDeleteUsageCount(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteUsageCount !== null && deleteUsageCount > 0}
                variant="destructive"
                className="flex-1"
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
