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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlus,
  Users,
  RefreshCw,
  Loader2,
  Trash2,
  Pencil,
  Archive,
  RotateCcw,
  Save,
  X,
  Mail,
  Phone,
  Clock,
  Palette,
} from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  color?: string;
  weekly_capacity_hours?: number;
  is_active: boolean;
  created_at: string;
}

const ROLE_OPTIONS = [
  { value: 'seamstress', label: 'Couturière' },
  { value: 'manager', label: 'Gestionnaire' },
  { value: 'admin', label: 'Administrateur' },
];

const COLOR_OPTIONS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Rose' },
  { value: '#f43f5e', label: 'Rouge' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Jaune' },
  { value: '#22c55e', label: 'Vert' },
  { value: '#14b8a6', label: 'Turquoise' },
  { value: '#0ea5e9', label: 'Bleu' },
  { value: '#6b7280', label: 'Gris' },
];

const DEFAULT_FORM = {
  name: '',
  email: '',
  phone: '',
  role: 'seamstress',
  color: '#6366f1',
  weekly_capacity_hours: 40,
};

export default function TeamManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  // Action states
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || isSaving) return;

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email?.trim() || undefined,
          phone: formData.phone?.trim() || undefined,
          role: formData.role,
          color: formData.color,
          weekly_capacity_hours: formData.weekly_capacity_hours,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add staff member');
      }

      setFormData(DEFAULT_FORM);
      setIsAdding(false);
      showSuccess(`${data.staff.name} ajouté avec succès!`);
      await fetchStaff();
    } catch (err) {
      console.error('Failed to add staff:', err);
      setError(err instanceof Error ? err.message : 'Failed to add staff member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formData.name.trim() || isSaving) return;

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/admin/team/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email?.trim() || null,
          phone: formData.phone?.trim() || null,
          role: formData.role,
          color: formData.color,
          weekly_capacity_hours: formData.weekly_capacity_hours,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update staff member');
      }

      setFormData(DEFAULT_FORM);
      setEditingId(null);
      showSuccess('Membre mis à jour avec succès!');
      await fetchStaff();
    } catch (err) {
      console.error('Failed to update staff:', err);
      setError(err instanceof Error ? err.message : 'Failed to update staff member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      setTogglingId(id);
      setError(null);

      const response = await fetch(`/api/admin/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update staff member');
      }

      setStaff(prev =>
        prev.map(s => (s.id === id ? { ...s, is_active: !currentActive } : s))
      );
      showSuccess(currentActive ? 'Membre archivé' : 'Membre réactivé');
    } catch (err) {
      console.error('Failed to toggle staff status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update staff member');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${name}" définitivement? Cette action est irréversible.`)) {
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

      setStaff(prev => prev.filter(s => s.id !== id));
      showSuccess(`${name} supprimé`);
    } catch (err) {
      console.error('Failed to delete staff:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete staff member');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (member: StaffMember) => {
    setEditingId(member.id);
    setIsAdding(false);
    setFormData({
      name: member.name,
      email: member.email || '',
      phone: member.phone || '',
      role: member.role || 'seamstress',
      color: member.color || '#6366f1',
      weekly_capacity_hours: member.weekly_capacity_hours || 40,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData(DEFAULT_FORM);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData(DEFAULT_FORM);
  };

  const activeStaff = staff.filter(s => s.is_active);
  const inactiveStaff = staff.filter(s => !s.is_active);

  const renderForm = (isEdit: boolean) => (
    <form onSubmit={isEdit ? handleUpdateStaff : handleAddStaff} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-1">
            <Users className="h-3 w-3" /> Nom *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nom complet"
            required
            minLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Rôle</Label>
          <Select
            value={formData.role}
            onValueChange={value => setFormData({ ...formData, role: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-1">
            <Mail className="h-3 w-3" /> Courriel
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-1">
            <Phone className="h-3 w-3" /> Téléphone
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            placeholder="514-555-1234"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color" className="flex items-center gap-1">
            <Palette className="h-3 w-3" /> Couleur
          </Label>
          <Select
            value={formData.color}
            onValueChange={value => setFormData({ ...formData, color: value })}
          >
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: formData.color }}
                />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {COLOR_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: opt.value }}
                    />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity" className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Capacité (h/sem)
          </Label>
          <Input
            id="capacity"
            type="number"
            min="1"
            max="80"
            value={formData.weekly_capacity_hours}
            onChange={e =>
              setFormData({ ...formData, weekly_capacity_hours: parseInt(e.target.value) || 40 })
            }
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
          <X className="h-4 w-4 mr-1" /> Annuler
        </Button>
        <Button type="submit" size="sm" disabled={isSaving || !formData.name.trim()}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          {isSaving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );

  const renderMemberRow = (member: StaffMember) => {
    const isEditing = editingId === member.id;

    if (isEditing) {
      return (
        <div key={member.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium mb-3">Modifier {member.name}</h4>
          {renderForm(true)}
        </div>
      );
    }

    const isActive = member.is_active;
    const bgClass = isActive ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100';

    return (
      <div key={member.id} className={`flex items-center justify-between p-4 border rounded-lg ${bgClass}`}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
            style={{ backgroundColor: member.color || '#6366f1' }}
          >
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium flex items-center gap-2">
              {member.name}
              <Badge className={isActive ? 'bg-green-500 hover:bg-green-600' : ''} variant={isActive ? 'default' : 'secondary'}>
                {isActive ? 'Actif' : 'Archivé'}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{ROLE_OPTIONS.find(r => r.value === member.role)?.label || 'Couturière'}</span>
              {member.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {member.email}
                </span>
              )}
              {member.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {member.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {member.weekly_capacity_hours || 40}h/sem
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startEdit(member)}
            title="Modifier"
            disabled={togglingId === member.id || deletingId === member.id}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(member.id, member.is_active)}
            title={isActive ? 'Archiver' : 'Réactiver'}
            disabled={togglingId === member.id || deletingId === member.id}
          >
            {togglingId === member.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isActive ? (
              <Archive className="h-4 w-4" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
          </Button>
          {!isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(member.id, member.name)}
              title="Supprimer"
              disabled={deletingId === member.id || togglingId === member.id}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {deletingId === member.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            Gestion de l&apos;équipe
          </h1>
          <p className="text-center text-muted-foreground">
            Gérer les couturières et les membres de l&apos;équipe
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        <div className="space-y-6">
          {/* Add New Team Member Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    {isAdding ? 'Nouveau membre' : 'Ajouter un membre'}
                  </CardTitle>
                  <CardDescription>
                    {isAdding ? 'Remplissez les informations du nouveau membre' : 'Cliquez pour ajouter un nouveau membre à l\'équipe'}
                  </CardDescription>
                </div>
                {!isAdding && !editingId && (
                  <Button onClick={startAdd}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                )}
              </div>
            </CardHeader>
            {isAdding && (
              <CardContent>
                {renderForm(false)}
              </CardContent>
            )}
          </Card>

          {/* Current Team Members */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Membres de l&apos;équipe
                  </CardTitle>
                  <CardDescription>
                    {staff.length} total ({activeStaff.length} actifs, {inactiveStaff.length} archivés)
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStaff}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : staff.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Aucun membre dans l&apos;équipe</p>
                  <p className="text-sm">Ajoutez votre premier membre avec le bouton ci-dessus</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Active Members */}
                  {activeStaff.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Membres actifs</h3>
                      {activeStaff.map(renderMemberRow)}
                    </div>
                  )}

                  {/* Inactive Members */}
                  {inactiveStaff.length > 0 && (
                    <div className="space-y-2 mt-6">
                      <h3 className="text-sm font-medium text-muted-foreground">Membres archivés</h3>
                      {inactiveStaff.map(renderMemberRow)}
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
