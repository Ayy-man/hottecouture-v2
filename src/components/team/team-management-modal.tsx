'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import {
  UserPlus,
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
  Save,
  X,
  Users,
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
}

interface TeamManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStaffUpdated?: () => void;
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

const DEFAULT_FORM: Omit<StaffMember, 'id' | 'is_active'> = {
  name: '',
  email: '',
  phone: '',
  role: 'seamstress',
  color: '#6366f1',
  weekly_capacity_hours: 40,
};

export function TeamManagementModal({
  open,
  onOpenChange,
  onStaffUpdated,
}: TeamManagementModalProps) {
  const toast = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Omit<StaffMember, 'id' | 'is_active'>>(DEFAULT_FORM);

  // Fetch staff members
  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/admin/team');
      const data = await response.json();
      setStaff(data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Erreur lors du chargement de l\'équipe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchStaff();
    }
  }, [open]);

  // Filter staff based on active status
  const filteredStaff = staff.filter(s => showInactive ? !s.is_active : s.is_active);

  // Handle add new staff member
  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Membre ajouté avec succès');
        setIsAdding(false);
        setFormData(DEFAULT_FORM);
        await fetchStaff();
        onStaffUpdated?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de l\'ajout');
      }
    } catch (error) {
      console.error('Error adding staff:', error);
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  // Handle update staff member
  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Membre mis à jour');
        setEditingId(null);
        setFormData(DEFAULT_FORM);
        await fetchStaff();
        onStaffUpdated?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (member: StaffMember) => {
    try {
      const response = await fetch(`/api/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !member.is_active }),
      });

      if (response.ok) {
        toast.success(member.is_active ? 'Membre archivé' : 'Membre réactivé');
        await fetchStaff();
        onStaffUpdated?.();
      }
    } catch (error) {
      console.error('Error toggling staff status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Handle delete staff member
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre? Cette action est irréversible.')) {
      return;
    }

    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Membre supprimé');
        await fetchStaff();
        onStaffUpdated?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Start editing a staff member
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

  // Cancel editing/adding
  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData(DEFAULT_FORM);
  };

  // Start adding new member
  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData(DEFAULT_FORM);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestion de l'équipe
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2">
            <Button
              onClick={startAdd}
              disabled={isAdding}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Ajouter un membre
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Voir actifs' : 'Voir archivés'}
            </Button>
          </div>

          {/* Add new member form */}
          {isAdding && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
              <h3 className="font-semibold text-sm">Nouveau membre</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> Nom *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nom complet"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((opt) => (
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
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="514-555-1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color" className="flex items-center gap-1">
                    <Palette className="h-3 w-3" /> Couleur
                  </Label>
                  <Select
                    value={formData.color}
                    onValueChange={(value) => setFormData({ ...formData, color: value })}
                  >
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: formData.color }}
                        />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((opt) => (
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
                    onChange={(e) =>
                      setFormData({ ...formData, weekly_capacity_hours: parseInt(e.target.value) || 40 })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={cancelEdit}>
                  <X className="h-4 w-4 mr-1" /> Annuler
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}

          {/* Staff list */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {showInactive ? 'Aucun membre archivé' : 'Aucun membre actif'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStaff.map((member) => (
                <div
                  key={member.id}
                  className={`border rounded-lg p-4 ${
                    !member.is_active ? 'bg-muted/50 opacity-75' : 'bg-white'
                  }`}
                >
                  {editingId === member.id ? (
                    // Edit form
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> Nom *
                          </Label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rôle</Label>
                          <Select
                            value={formData.role}
                            onValueChange={(value) => setFormData({ ...formData, role: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> Courriel
                          </Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> Téléphone
                          </Label>
                          <Input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Palette className="h-3 w-3" /> Couleur
                          </Label>
                          <Select
                            value={formData.color}
                            onValueChange={(value) => setFormData({ ...formData, color: value })}
                          >
                            <SelectTrigger>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: formData.color }}
                                />
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {COLOR_OPTIONS.map((opt) => (
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
                          <Label className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Capacité (h/sem)
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            max="80"
                            value={formData.weekly_capacity_hours}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                weekly_capacity_hours: parseInt(e.target.value) || 40,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={cancelEdit}>
                          <X className="h-4 w-4 mr-1" /> Annuler
                        </Button>
                        <Button size="sm" onClick={() => handleUpdate(member.id)} disabled={saving}>
                          <Save className="h-4 w-4 mr-1" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display view
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: member.color || '#6366f1' }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {member.name}
                            {!member.is_active && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded">Archivé</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-3">
                            <span>
                              {ROLE_OPTIONS.find((r) => r.value === member.role)?.label || 'Couturière'}
                            </span>
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
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(member)}
                          title={member.is_active ? 'Archiver' : 'Réactiver'}
                        >
                          {member.is_active ? (
                            <Archive className="h-4 w-4" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>
                        {!member.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(member.id)}
                            title="Supprimer"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
