'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { ClientCreate } from '@/lib/dto';
import {
  upsertGHLContact,
  formatClientForGHL,
} from '@/lib/webhooks/ghl-webhook';

interface ClientStepProps {
  data: ClientCreate | null;
  onUpdate: (client: ClientCreate) => void;
  onNext: () => void;
  onPrev?: () => void;
}

export function ClientStep({
  data,
  onUpdate,
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
  const [measurements, setMeasurements] = useState({
    bust: '',
    waist: '',
    hips: '',
    inseam: '',
    arm_length: '',
    neck: '',
    shoulders: '',
    height: '',
    notes: '',
  });

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

        // Send new client to GHL webhook
        let ghlContactId = null;
        try {
          const ghlContactData = formatClientForGHL({
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            email: formData.email?.trim() || '',
            phone: (formData.phone || '').trim(), // Now required
            preferred_contact: formData.preferred_contact,
          });

          const ghlResult = await upsertGHLContact(ghlContactData);
          if (ghlResult.success) {
            ghlContactId = ghlResult.contactId;
            console.log(
              '✅ GHL contact created successfully for client:',
              newClient.id,
              'Contact ID:',
              ghlContactId
            );
          } else {
            console.warn(
              '⚠️ GHL webhook failed (non-blocking):',
              ghlResult.error
            );
          }
        } catch (ghlError) {
          console.warn('⚠️ GHL webhook error (non-blocking):', ghlError);
          // Don't fail the client creation if GHL webhook fails
        }

        // Update client with GHL contact ID if we got one
        if (ghlContactId) {
          try {
            await (supabase as any)
              .from('client')
              .update({ ghl_contact_id: ghlContactId })
              .eq('id', newClient.id);
            console.log('✅ Updated client with GHL contact ID:', ghlContactId);
          } catch (updateError) {
            console.warn(
              '⚠️ Failed to update client with GHL contact ID (non-blocking):',
              updateError
            );
          }
        }

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

  const handleUseExistingClient = () => {
    if (duplicateClient) {
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
      // For existing clients, auto-advance since measurements would be on file
      setTimeout(() => onNext(), 300);
    }
  };

  const handleCreateAnyway = async () => {
    setShowDuplicateModal(false);
    setDuplicateClient(null);
    await createClientInDB();
  };

  const handleSelectClient = (client: ClientCreate) => {
    onUpdate(client);
    setSearchQuery('');
    setSearchResults([]);
    setTimeout(() => onNext(), 300);
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
              <h3 className='text-lg font-bold text-gray-900'>Client existant trouvé!</h3>
              <p className='text-sm text-gray-600 mt-1'>Un client avec ce numéro de téléphone existe déjà.</p>
            </div>
            
            <div className='bg-gray-50 rounded-lg p-4 mb-4'>
              <p className='font-medium text-gray-900'>
                {duplicateClient.first_name} {duplicateClient.last_name}
              </p>
              <p className='text-sm text-gray-600'>{duplicateClient.phone}</p>
              {duplicateClient.email && (
                <p className='text-sm text-gray-600'>{duplicateClient.email}</p>
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
                className='flex-1 border-gray-300 text-gray-700'
              >
                Créer nouveau
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* iOS-style Header with Navigation */}
      <div className='flex items-center justify-between px-1 py-3 border-b border-gray-200 bg-white flex-shrink-0'>
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
          <h2 className='text-lg font-semibold text-gray-900'>
            Information Client
          </h2>
          <p className='text-sm text-gray-500'>
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
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[40px] text-sm touch-manipulation'
                />
              </div>

              {isSearching && (
                <div className='text-center py-2'>
                  <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto'></div>
                  <p className='mt-1 text-xs text-gray-600'>Recherche...</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className='space-y-1'>
                  <h3 className='font-medium text-sm'>Résultats</h3>
                  {searchResults.map((client, index) => (
                    <div
                      key={client.first_name + client.last_name + index}
                      className='p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer'
                      onClick={() => handleSelectClient(client)}
                    >
                      <div className='font-medium text-sm'>
                        {client.first_name} {client.last_name}
                      </div>
                      <div
                        className='text-xs text-gray-600 cursor-pointer hover:text-gray-800'
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
                      <div className='text-xs text-gray-500 mt-1'>
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
                            : 'border-gray-300'
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
                            : 'border-gray-300'
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
                          errors.phone ? 'border-red-500' : 'border-gray-300'
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
                          errors.email ? 'border-red-500' : 'border-gray-300'
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
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[36px] text-sm touch-manipulation'
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
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[36px] text-sm touch-manipulation'
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
                      className='h-3 w-3 text-primary-600 focus:ring-primary-500 border-gray-300 rounded'
                    />
                    <label
                      htmlFor='newsletterConsent'
                      className='text-xs font-medium text-gray-700'
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
                      className='flex-1 btn-press bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-gray-300 text-sm py-2'
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
                    className='btn-press bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-gray-300 text-xs px-2 py-1'
                  >
                    Changer Client
                  </Button>
                </div>
              </div>

              {/* Measurements Section */}
              <div className='border border-gray-200 rounded-md overflow-hidden'>
                <button
                  type='button'
                  onClick={() => setShowMeasurements(!showMeasurements)}
                  className='w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors'
                >
                  <span className='text-sm font-medium text-gray-700'>📏 Mesures du client</span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${showMeasurements ? 'rotate-180' : ''}`}
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                  </svg>
                </button>
                
                {showMeasurements && (
                  <div className='p-3 space-y-3'>
                    <p className='text-xs text-gray-500'>Pour projets sur mesure (optionnel)</p>
                    <div className='grid grid-cols-2 gap-2'>
                      <div>
                        <label className='block text-xs text-gray-600 mb-1'>Tour de poitrine (cm)</label>
                        <input
                          type='number'
                          value={measurements.bust}
                          onChange={e => setMeasurements(prev => ({ ...prev, bust: e.target.value }))}
                          className='w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary-500'
                          placeholder='ex: 92'
                        />
                      </div>
                      <div>
                        <label className='block text-xs text-gray-600 mb-1'>Tour de taille (cm)</label>
                        <input
                          type='number'
                          value={measurements.waist}
                          onChange={e => setMeasurements(prev => ({ ...prev, waist: e.target.value }))}
                          className='w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary-500'
                          placeholder='ex: 76'
                        />
                      </div>
                      <div>
                        <label className='block text-xs text-gray-600 mb-1'>Tour de hanches (cm)</label>
                        <input
                          type='number'
                          value={measurements.hips}
                          onChange={e => setMeasurements(prev => ({ ...prev, hips: e.target.value }))}
                          className='w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary-500'
                          placeholder='ex: 97'
                        />
                      </div>
                      <div>
                        <label className='block text-xs text-gray-600 mb-1'>Entrejambe (cm)</label>
                        <input
                          type='number'
                          value={measurements.inseam}
                          onChange={e => setMeasurements(prev => ({ ...prev, inseam: e.target.value }))}
                          className='w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary-500'
                          placeholder='ex: 81'
                        />
                      </div>
                      <div>
                        <label className='block text-xs text-gray-600 mb-1'>Longueur bras (cm)</label>
                        <input
                          type='number'
                          value={measurements.arm_length}
                          onChange={e => setMeasurements(prev => ({ ...prev, arm_length: e.target.value }))}
                          className='w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary-500'
                          placeholder='ex: 63'
                        />
                      </div>
                      <div>
                        <label className='block text-xs text-gray-600 mb-1'>Tour de cou (cm)</label>
                        <input
                          type='number'
                          value={measurements.neck}
                          onChange={e => setMeasurements(prev => ({ ...prev, neck: e.target.value }))}
                          className='w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary-500'
                          placeholder='ex: 38'
                        />
                      </div>
                      <div>
                        <label className='block text-xs text-gray-600 mb-1'>Largeur épaules (cm)</label>
                        <input
                          type='number'
                          value={measurements.shoulders}
                          onChange={e => setMeasurements(prev => ({ ...prev, shoulders: e.target.value }))}
                          className='w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary-500'
                          placeholder='ex: 46'
                        />
                      </div>
                      <div>
                        <label className='block text-xs text-gray-600 mb-1'>Hauteur totale (cm)</label>
                        <input
                          type='number'
                          value={measurements.height}
                          onChange={e => setMeasurements(prev => ({ ...prev, height: e.target.value }))}
                          className='w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary-500'
                          placeholder='ex: 170'
                        />
                      </div>
                    </div>
                    <div>
                      <label className='block text-xs text-gray-600 mb-1'>Notes de mesures</label>
                      <textarea
                        value={measurements.notes}
                        onChange={e => setMeasurements(prev => ({ ...prev, notes: e.target.value }))}
                        className='w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary-500'
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
