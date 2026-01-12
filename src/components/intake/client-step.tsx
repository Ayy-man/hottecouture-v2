'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { ClientCreate, MeasurementsData } from '@/lib/dto';
// GHL contact sync is handled server-side in the intake API

// Measurement template type
interface MeasurementTemplate {
  id: string;
  name: string;
  name_fr: string;
  category: string;
  unit: string;
  display_order: number;
}

// Custom measurement for per-order fields
interface CustomMeasurement {
  name: string;
  value: string;
}

interface ClientStepProps {
  data: ClientCreate | null;
  measurements?: MeasurementsData | undefined;
  onUpdate: (client: ClientCreate) => void;
  onMeasurementsUpdate?: (m: MeasurementsData) => void;
  onNext: () => void;
  onPrev?: () => void;
}

export function ClientStep({
  data,
  measurements: propMeasurements,
  onUpdate,
  onMeasurementsUpdate,
  onNext,
  onPrev,
}: ClientStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClientCreate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<ClientCreate>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    language: 'fr',
    preferred_contact: 'email',
    newsletter_consent: false,
  });
  const [errors, setErrors] = useState<Partial<ClientCreate>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [revealedClients, setRevealedClients] = useState<Set<string>>(new Set());
  const [duplicateClient, setDuplicateClient] = useState<ClientCreate | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(false);

  // Dynamic measurement templates from database
  const [measurementTemplates, setMeasurementTemplates] = useState<MeasurementTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // Dynamic measurements state - keys are template names
  const [measurements, setMeasurements] = useState<Record<string, string>>({});

  // Custom per-order measurements
  const [customMeasurements, setCustomMeasurements] = useState<CustomMeasurement[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomValue, setNewCustomValue] = useState('');

  // Load measurement templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const res = await fetch('/api/admin/measurement-templates?category=body');
        if (res.ok) {
          const data = await res.json();
          setMeasurementTemplates(data.templates || []);
        }
      } catch (err) {
        console.error('Error loading measurement templates:', err);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

  // Sync measurements with props
  useEffect(() => {
    if (propMeasurements) {
      const measurementValues: Record<string, string> = {};
      // Map known fields from propMeasurements to dynamic state
      Object.entries(propMeasurements).forEach(([key, value]) => {
        if (key !== 'notes' && value !== null && value !== undefined) {
          measurementValues[key] = value.toString();
        }
      });
      // Handle notes separately
      if (propMeasurements.notes) {
        measurementValues['notes'] = propMeasurements.notes;
      }
      setMeasurements(measurementValues);
    }
  }, [propMeasurements]);

  // Update a single measurement field and notify parent
  const updateMeasurement = useCallback((field: string, value: string) => {
    setMeasurements(prev => {
      const updated = { ...prev, [field]: value };

      // Convert dynamic measurements to MeasurementsData format for parent
      // This maintains backward compatibility with the intake API
      const measurementsData: MeasurementsData = {
        bust: updated['bust'] ? parseFloat(updated['bust']) : null,
        waist: updated['waist'] ? parseFloat(updated['waist']) : null,
        hips: updated['hips'] ? parseFloat(updated['hips']) : null,
        inseam: updated['inseam'] ? parseFloat(updated['inseam']) : null,
        arm_length: updated['arm_length'] ? parseFloat(updated['arm_length']) : null,
        neck: updated['neck'] ? parseFloat(updated['neck']) : null,
        shoulders: updated['shoulders'] ? parseFloat(updated['shoulders']) : null,
        height: updated['height'] ? parseFloat(updated['height']) : null,
        notes: updated['notes'] || undefined,
      };

      // Also include any additional dynamic measurements
      // The intake API will handle them via template lookup
      Object.entries(updated).forEach(([key, val]) => {
        if (!['bust', 'waist', 'hips', 'inseam', 'arm_length', 'neck', 'shoulders', 'height', 'notes'].includes(key) && val) {
          (measurementsData as any)[key] = parseFloat(val) || null;
        }
      });

      onMeasurementsUpdate?.(measurementsData);
      return updated;
    });
  }, [onMeasurementsUpdate]);

  // Load measurements from API when existing client is selected
  const loadClientMeasurements = useCallback(async (clientId: string) => {
    setIsLoadingMeasurements(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/measurements`);
      if (res.ok) {
        const { data: grouped } = await res.json();
        // Body measurements are in the 'body' category
        const bodyMeasurements = grouped?.body || [];

        // Build dynamic measurements object from API response
        const loadedMeasurements: Record<string, string> = {};
        const measurementsData: MeasurementsData = {};

        for (const m of bodyMeasurements) {
          if (m.name && m.value) {
            loadedMeasurements[m.name] = m.value.toString();
            // Also build the MeasurementsData object for parent
            (measurementsData as any)[m.name] = m.value;
          }
        }

        setMeasurements(loadedMeasurements);

        // Notify parent with loaded measurements
        if (onMeasurementsUpdate) {
          onMeasurementsUpdate(measurementsData);
        }

        // Auto-expand measurements if client has saved data
        if (Object.keys(loadedMeasurements).length > 0) {
          setShowMeasurements(true);
        }
      }
    } catch (err) {
      console.error('Error loading client measurements:', err);
    } finally {
      setIsLoadingMeasurements(false);
    }
  }, [onMeasurementsUpdate]);

  const maskPhone = (phone: string): string => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) return '***';
    return '***-***-' + digits.slice(-4);
  };

  const maskEmail = (email: string): string => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return '***';
    return parts[0].charAt(0) + '***@' + parts[1];
  };

  const toggleReveal = (clientId: string) => {
    setRevealedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const supabase = createClient();

  // Real-time validation functions
  const validatePhone = (phone: string): string | null => {
    if (!phone.trim()) {
      return 'Phone number is required';
    }
    if (!/^\+?[\d\s\-\(\)]+$/.test(phone.trim())) {
      return 'Invalid phone number format';
    }
    return null;
  };

  const validateEmail = (email: string): string | null => {
    if (!email || !email.trim()) {
      return 'Email requis'; // Email is required for GHL sync
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Format email invalide';
    }
    return null;
  };

  const handlePhoneChange = (value: string) => {
    setFormData(prev => ({ ...prev, phone: value }));
    const phoneError = validatePhone(value);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (phoneError) {
        newErrors.phone = phoneError;
      } else {
        delete newErrors.phone;
      }
      return newErrors;
    });
  };

  const handleEmailChange = (value: string) => {
    setFormData(prev => ({ ...prev, email: value }));
    const emailError = validateEmail(value);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (emailError) {
        newErrors.email = emailError;
      } else {
        delete newErrors.email;
      }
      return newErrors;
    });
  };

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchClients();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchClients = async () => {
    setIsSearching(true);
    try {
      const { data: clients, error } = await supabase
        .from('client')
        .select(
          'id, first_name, last_name, phone, email, language, preferred_contact, newsletter_consent'
        )
        .or(
          `phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`
        )
        .limit(10);

      if (error) {
        console.error('Error searching clients:', error);
        setSearchResults([]);
      } else {
        setSearchResults(clients || []);
      }
    } catch (err) {
      console.error('Error searching clients:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const checkDuplicatePhone = async (phone: string): Promise<ClientCreate | null> => {
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length < 7) return null;
    
    const { data: existing } = await supabase
      .from('client')
      .select('id, first_name, last_name, phone, email, language, preferred_contact, newsletter_consent')
      .or(`phone.ilike.%${normalizedPhone.slice(-7)}%`)
      .limit(1)
      .maybeSingle();
    
    return existing as ClientCreate | null;
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Partial<ClientCreate> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Prénom requis';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Nom requis';
    }

    const phoneError = validatePhone(formData.phone || '');
    if (phoneError) {
      newErrors.phone = phoneError;
    }

    const emailError = validateEmail(formData.email || '');
    if (emailError) {
      newErrors.email = emailError;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsCreating(true);
      try {
        const existingClient = await checkDuplicatePhone(formData.phone || '');
        if (existingClient) {
          setDuplicateClient(existingClient);
          setShowDuplicateModal(true);
          setIsCreating(false);
          return;
        }

        await createClientInDB();
      } catch (err) {
        console.error('Error creating client:', err);
        setErrors({ first_name: 'Échec de création. Réessayez.' });
        setIsCreating(false);
      }
    }
  };

  const createClientInDB = async () => {
    setIsCreating(true);
    try {
      const { data: newClient, error } = await (supabase as any)
          .from('client')
          .insert([
            {
              first_name: formData.first_name.trim(),
              last_name: formData.last_name.trim(),
              phone: (formData.phone || '').trim(), // Now required, no fallback to null
              email: formData.email?.trim() || null,
              language: formData.language,
              preferred_contact: formData.preferred_contact,
              newsletter_consent: formData.newsletter_consent,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error('Error creating client:', error);
          setErrors({
            first_name: 'Failed to create client. Please try again.',
          });
          return;
        }

        // Note: GHL contact sync happens server-side in the intake API when the order is submitted

        onUpdate(newClient);
        setShowCreateForm(false);
        setFormData({
          first_name: '',
          last_name: '',
          phone: '',
          email: '',
          language: 'fr',
          preferred_contact: 'email',
          newsletter_consent: false,
        });
        setErrors({});
        // Don't auto-advance for new clients - let them add measurements first
      } catch (err) {
        console.error('Error creating client:', err);
        setErrors({ first_name: 'Échec de création. Réessayez.' });
      } finally {
        setIsCreating(false);
      }
  };

  const handleUseExistingClient = async () => {
    if (duplicateClient) {
      const clientWithId = duplicateClient as ClientCreate & { id?: string };
      onUpdate(duplicateClient);
      setShowDuplicateModal(false);
      setDuplicateClient(null);
      setShowCreateForm(false);
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        language: 'fr',
        preferred_contact: 'email',
        newsletter_consent: false,
      });
      // Load measurements for existing client
      if (clientWithId.id) {
        await loadClientMeasurements(clientWithId.id);
      }
      // Don't auto-advance - let user review measurements
    }
  };

  const handleCreateAnyway = async () => {
    setShowDuplicateModal(false);
    setDuplicateClient(null);
    await createClientInDB();
  };

  const handleSelectClient = async (client: ClientCreate & { id?: string }) => {
    onUpdate(client);
    setSearchQuery('');
    setSearchResults([]);
    // Load saved measurements if client has an ID
    if (client.id) {
      await loadClientMeasurements(client.id);
    }
    // Don't auto-advance - let user review/edit measurements
  };

  return (
    <div className='h-full flex flex-col overflow-hidden min-h-0'>
      {/* Duplicate Client Modal */}
      {showDuplicateModal && duplicateClient && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up'>
            <div className='text-center mb-4'>
              <div className='w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3'>
                <span className='text-2xl'>⚠️</span>
              </div>
              <h3 className='text-lg font-bold text-foreground'>Client existant trouvé!</h3>
              <p className='text-sm text-muted-foreground mt-1'>Un client avec ce numéro de téléphone existe déjà.</p>
            </div>
            
            <div className='bg-muted/50 rounded-lg p-4 mb-4'>
              <p className='font-medium text-foreground'>
                {duplicateClient.first_name} {duplicateClient.last_name}
              </p>
              <p className='text-sm text-muted-foreground'>{duplicateClient.phone}</p>
              {duplicateClient.email && (
                <p className='text-sm text-muted-foreground'>{duplicateClient.email}</p>
              )}
            </div>
            
            <div className='flex gap-3'>
              <Button
                onClick={handleUseExistingClient}
                className='flex-1 bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white font-semibold'
              >
                Utiliser ce client
              </Button>
              <Button
                variant='outline'
                onClick={handleCreateAnyway}
                className='flex-1 border-border text-muted-foreground'
              >
                Créer nouveau
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* iOS-style Header with Navigation */}
      <div className='flex items-center justify-between px-1 py-3 border-b border-border bg-white flex-shrink-0'>
        <div className='w-1/4'>
          {onPrev && (
            <Button
              variant='ghost'
              onClick={onPrev}
              className='flex items-center gap-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-3 py-2 rounded-lg transition-all duration-200'
            >
              <svg
                className='w-4 h-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 19l-7-7 7-7'
                />
              </svg>
              <span className='font-medium'>Retour</span>
            </Button>
          )}
        </div>

        <div className='flex-1 text-center'>
          <h2 className='text-lg font-semibold text-foreground'>
            Information Client
          </h2>
          <p className='text-sm text-muted-foreground'>
            Rechercher un client existant ou en créer un nouveau
          </p>
        </div>

        {data && (
          <Button
            onClick={onNext}
            className='bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white px-6 py-2 rounded-lg font-medium transition-all duration-200'
          >
            Suivant
          </Button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='p-4 space-y-4'>
          {!data ? (
            <>
              {/* Search section - hidden when create form is open */}
              {!showCreateForm && (
                <>
                  <div>
                    <label
                      htmlFor='search'
                      className='block text-sm font-medium mb-1'
                    >
                      Rechercher Client
                    </label>
                    <input
                      id='search'
                      type='text'
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder='Entrer téléphone ou courriel'
                      className='w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[40px] text-sm touch-manipulation'
                    />
                  </div>

                  {isSearching && (
                    <div className='text-center py-2'>
                      <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto'></div>
                      <p className='mt-1 text-xs text-muted-foreground'>Recherche...</p>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className='space-y-1'>
                      <h3 className='font-medium text-sm'>Résultats</h3>
                      {searchResults.map((client, index) => (
                        <div
                          key={client.first_name + client.last_name + index}
                          className='p-2 border border-border rounded-md hover:bg-muted/50 cursor-pointer'
                          onClick={() => handleSelectClient(client)}
                        >
                          <div className='font-medium text-sm'>
                            {client.first_name} {client.last_name}
                          </div>
                          <div
                            className='text-xs text-muted-foreground cursor-pointer hover:text-foreground'
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleReveal(client.phone + client.email);
                            }}
                            title='Tap to reveal/hide'
                          >
                            {revealedClients.has(client.phone + client.email)
                              ? `${client.phone} • ${client.email}`
                              : `${maskPhone(client.phone || '')} • ${maskEmail(client.email || '')}`}
                          </div>
                          <div className='text-xs text-muted-foreground mt-1'>
                            Preferred:{' '}
                            {client.preferred_contact === 'email'
                              ? '📧 Email'
                              : '💬 SMS'}{' '}
                            • Newsletter: {client.newsletter_consent ? '✅' : '❌'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!showCreateForm ? (
                <Button
                  variant='outline'
                  onClick={() => setShowCreateForm(true)}
                  className='w-full btn-press bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-primary-500 text-sm py-2'
                >
                  Créer Nouveau Client
                </Button>
              ) : (
                <form onSubmit={handleCreateClient} className='space-y-3'>
                  <button
                    type='button'
                    onClick={() => setShowCreateForm(false)}
                    className='flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 mb-2'
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
                    </svg>
                    Retour à la recherche
                  </button>
                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label
                        htmlFor='firstName'
                        className='block text-xs font-medium mb-1'
                      >
                        Prénom *
                      </label>
                      <input
                        id='firstName'
                        type='text'
                        value={formData.first_name}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            first_name: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[36px] text-sm touch-manipulation ${
                          errors.first_name
                            ? 'border-red-500'
                            : 'border-border'
                        }`}
                      />
                      {errors.first_name && (
                        <p className='text-red-500 text-xs mt-1'>
                          {errors.first_name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor='lastName'
                        className='block text-xs font-medium mb-1'
                      >
                        Nom *
                      </label>
                      <input
                        id='lastName'
                        type='text'
                        value={formData.last_name}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            last_name: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[36px] text-sm touch-manipulation ${
                          errors.last_name
                            ? 'border-red-500'
                            : 'border-border'
                        }`}
                      />
                      {errors.last_name && (
                        <p className='text-red-500 text-xs mt-1'>
                          {errors.last_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label
                        htmlFor='phone'
                        className='block text-xs font-medium mb-1'
                      >
                        Téléphone *
                      </label>
                      <input
                        id='phone'
                        type='tel'
                        value={formData.phone}
                        onChange={e => handlePhoneChange(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[36px] text-sm touch-manipulation ${
                          errors.phone ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder='+1 (555) 123-4567'
                      />
                      {errors.phone && (
                        <p className='text-red-500 text-xs mt-1'>
                          {errors.phone}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor='email'
                        className='block text-xs font-medium mb-1'
                      >
                        Email <span className='text-red-500'>*</span>
                      </label>
                      <input
                        id='email'
                        type='email'
                        required
                        value={formData.email}
                        onChange={e => handleEmailChange(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[36px] text-sm touch-manipulation ${
                          errors.email ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder='client@example.com'
                      />
                      {errors.email && (
                        <p className='text-red-500 text-xs mt-1'>
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label
                        htmlFor='language'
                        className='block text-xs font-medium mb-1'
                      >
                        Language
                      </label>
                      <select
                        id='language'
                        value={formData.language}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            language: e.target.value as 'fr' | 'en',
                          }))
                        }
                        className='w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[36px] text-sm touch-manipulation'
                      >
                        <option value='fr'>Français</option>
                        <option value='en'>English</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor='preferredContact'
                        className='block text-xs font-medium mb-1'
                      >
                        Contact Préféré
                      </label>
                      <select
                        id='preferredContact'
                        value={formData.preferred_contact}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            preferred_contact: e.target.value as
                              | 'email'
                              | 'sms',
                          }))
                        }
                        className='w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[36px] text-sm touch-manipulation'
                      >
                        <option value='email'>📧 Email</option>
                        <option value='sms'>💬 SMS</option>
                      </select>
                    </div>
                  </div>

                  <div className='flex items-center space-x-2'>
                    <input
                      id='newsletterConsent'
                      type='checkbox'
                      checked={formData.newsletter_consent}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          newsletter_consent: e.target.checked,
                        }))
                      }
                      className='h-3 w-3 text-primary-600 focus:ring-primary-500 border-border rounded'
                    />
                    <label
                      htmlFor='newsletterConsent'
                      className='text-xs font-medium text-muted-foreground'
                    >
                      Abonner à l'infolettre
                    </label>
                  </div>

                  <div className='flex gap-2'>
                    <Button
                      type='submit'
                      className='flex-1 btn-press bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm py-2'
                      disabled={isCreating}
                    >
                      {isCreating ? 'Création...' : 'Créer Client'}
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => setShowCreateForm(false)}
                      className='flex-1 btn-press bg-gradient-to-r from-muted to-muted/80 hover:from-muted/80 hover:to-muted/60 text-muted-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-border text-sm py-2'
                      disabled={isCreating}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className='space-y-3'>
              <div className='p-3 bg-green-50 border border-green-200 rounded-md'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='font-medium text-green-800 text-sm'>
                      {data.first_name} {data.last_name}
                    </h3>
                    <p
                      className='text-xs text-green-600 cursor-pointer hover:text-green-800'
                      onClick={() => toggleReveal('selected-' + data.phone)}
                      title='Tap to reveal/hide'
                    >
                      {revealedClients.has('selected-' + data.phone)
                        ? `${data.phone} • ${data.email}`
                        : `${maskPhone(data.phone || '')} • ${maskEmail(data.email || '')}`}
                    </p>
                    <div className='text-xs text-green-600 mt-1'>
                      Contact:{' '}
                      {data.preferred_contact === 'email' ? '📧 Courriel' : '💬 SMS'}{' '}
                      • Infolettre:{' '}
                      {data.newsletter_consent
                        ? '✅ Abonné'
                        : '❌ Non abonné'}
                    </div>
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      onUpdate(null as any);
                      setShowCreateForm(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className='btn-press bg-gradient-to-r from-muted to-muted/80 hover:from-muted/80 hover:to-muted/60 text-muted-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-border text-xs px-2 py-1'
                  >
                    Changer Client
                  </Button>
                </div>
              </div>

              {/* Measurements Section */}
              <div className='border border-border rounded-md overflow-hidden'>
                <button
                  type='button'
                  onClick={() => setShowMeasurements(!showMeasurements)}
                  className='w-full px-3 py-2 flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors'
                >
                  <span className='text-sm font-medium text-muted-foreground'>📏 Mesures du client</span>
                  <svg
                    className={`w-4 h-4 text-muted-foreground transition-transform ${showMeasurements ? 'rotate-180' : ''}`}
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                  </svg>
                </button>
                
                {showMeasurements && (
                  <div className='p-3 space-y-3'>
                    <div className='flex items-center justify-between'>
                      <p className='text-xs text-muted-foreground'>Pour projets sur mesure (optionnel)</p>
                      {(isLoadingMeasurements || isLoadingTemplates) && (
                        <div className='flex items-center gap-1 text-xs text-primary-600'>
                          <div className='animate-spin w-3 h-3 border border-primary-500 border-t-transparent rounded-full'></div>
                          Chargement...
                        </div>
                      )}
                    </div>

                    {/* Dynamic measurement fields from templates */}
                    <div className='grid grid-cols-2 gap-2'>
                      {measurementTemplates.map(template => (
                        <div key={template.id}>
                          <label className='block text-xs text-muted-foreground mb-1'>
                            {template.name_fr} ({template.unit})
                          </label>
                          <input
                            type='number'
                            value={measurements[template.name] || ''}
                            onChange={e => updateMeasurement(template.name, e.target.value)}
                            className='w-full px-2 py-1 text-sm border border-border rounded focus:ring-1 focus:ring-primary-500'
                            placeholder={`ex: ${template.name === 'height' ? '170' : '0'}`}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Custom per-order measurements */}
                    {customMeasurements.length > 0 && (
                      <div className='border-t border-border pt-2'>
                        <p className='text-xs text-muted-foreground mb-2'>Mesures personnalisées</p>
                        <div className='grid grid-cols-2 gap-2'>
                          {customMeasurements.map((custom, index) => (
                            <div key={index} className='relative'>
                              <label className='block text-xs text-muted-foreground mb-1 flex items-center justify-between'>
                                <span>{custom.name}</span>
                                <button
                                  type='button'
                                  onClick={() => {
                                    setCustomMeasurements(prev => prev.filter((_, i) => i !== index));
                                  }}
                                  className='text-muted-foreground/70 hover:text-red-500'
                                >
                                  <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                                  </svg>
                                </button>
                              </label>
                              <input
                                type='number'
                                value={custom.value}
                                onChange={e => {
                                  const newValue = e.target.value;
                                  setCustomMeasurements(prev =>
                                    prev.map((c, i) => (i === index ? { ...c, value: newValue } : c))
                                  );
                                  // Update parent with custom measurement
                                  updateMeasurement(`custom_${custom.name.toLowerCase().replace(/\s+/g, '_')}`, newValue);
                                }}
                                className='w-full px-2 py-1 text-sm border border-border rounded focus:ring-1 focus:ring-primary-500'
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add custom measurement */}
                    {showAddCustom ? (
                      <div className='border-t border-border pt-2'>
                        <p className='text-xs text-muted-foreground mb-2'>Ajouter une mesure personnalisée</p>
                        <div className='grid grid-cols-2 gap-2'>
                          <input
                            type='text'
                            value={newCustomName}
                            onChange={e => setNewCustomName(e.target.value)}
                            placeholder='Nom (ex: Biceps)'
                            className='w-full px-2 py-1 text-sm border border-border rounded focus:ring-1 focus:ring-primary-500'
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Escape') {
                                setShowAddCustom(false);
                                setNewCustomName('');
                                setNewCustomValue('');
                              }
                            }}
                          />
                          <input
                            type='number'
                            value={newCustomValue}
                            onChange={e => setNewCustomValue(e.target.value)}
                            placeholder='Valeur (cm)'
                            className='w-full px-2 py-1 text-sm border border-border rounded focus:ring-1 focus:ring-primary-500'
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newCustomName.trim()) {
                                setCustomMeasurements(prev => [...prev, { name: newCustomName.trim(), value: newCustomValue }]);
                                // Update parent with custom measurement
                                updateMeasurement(`custom_${newCustomName.trim().toLowerCase().replace(/\s+/g, '_')}`, newCustomValue);
                                setNewCustomName('');
                                setNewCustomValue('');
                                setShowAddCustom(false);
                              }
                            }}
                          />
                        </div>
                        <div className='flex gap-2 mt-2'>
                          <button
                            type='button'
                            onClick={() => {
                              setShowAddCustom(false);
                              setNewCustomName('');
                              setNewCustomValue('');
                            }}
                            className='text-xs text-muted-foreground hover:text-muted-foreground'
                          >
                            Annuler
                          </button>
                          <button
                            type='button'
                            onClick={() => {
                              if (newCustomName.trim()) {
                                setCustomMeasurements(prev => [...prev, { name: newCustomName.trim(), value: newCustomValue }]);
                                // Update parent with custom measurement
                                updateMeasurement(`custom_${newCustomName.trim().toLowerCase().replace(/\s+/g, '_')}`, newCustomValue);
                                setNewCustomName('');
                                setNewCustomValue('');
                                setShowAddCustom(false);
                              }
                            }}
                            disabled={!newCustomName.trim()}
                            className='text-xs text-primary-600 hover:text-primary-700 disabled:text-muted-foreground/70'
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type='button'
                        onClick={() => setShowAddCustom(true)}
                        className='text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1'
                      >
                        <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                        </svg>
                        Ajouter une mesure personnalisée
                      </button>
                    )}

                    {/* Notes */}
                    <div>
                      <label className='block text-xs text-muted-foreground mb-1'>Notes de mesures</label>
                      <textarea
                        value={measurements['notes'] || ''}
                        onChange={e => updateMeasurement('notes', e.target.value)}
                        className='w-full px-2 py-1 text-sm border border-border rounded focus:ring-1 focus:ring-primary-500'
                        rows={2}
                        placeholder='Notes additionnelles...'
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
