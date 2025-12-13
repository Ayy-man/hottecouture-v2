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
    if (email && email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return 'Invalid email format';
      }
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

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Partial<ClientCreate> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    // Phone validation (now required)
    const phoneError = validatePhone(formData.phone || '');
    if (phoneError) {
      newErrors.phone = phoneError;
    }

    // Email validation (optional but must be valid if provided)
    const emailError = validateEmail(formData.email || '');
    if (emailError) {
      newErrors.email = emailError;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
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
      } catch (err) {
        console.error('Error creating client:', err);
        setErrors({ first_name: 'Failed to create client. Please try again.' });
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleSelectClient = (client: ClientCreate) => {
    onUpdate(client);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className='h-full flex flex-col overflow-hidden min-h-0'>
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
              <span className='font-medium'>Back</span>
            </Button>
          )}
        </div>

        <div className='flex-1 text-center'>
          <h2 className='text-lg font-semibold text-gray-900'>
            Client Information
          </h2>
          <p className='text-sm text-gray-500'>
            Search for an existing client or create a new one
          </p>
        </div>

        {data && (
          <Button
            onClick={onNext}
            className='bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white px-6 py-2 rounded-lg font-medium transition-all duration-200'
          >
            Next
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
                  Search Client
                </label>
                <input
                  id='search'
                  type='text'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder='Enter phone number or email'
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[40px] text-sm touch-manipulation'
                />
              </div>

              {isSearching && (
                <div className='text-center py-2'>
                  <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto'></div>
                  <p className='mt-1 text-xs text-gray-600'>Searching...</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className='space-y-1'>
                  <h3 className='font-medium text-sm'>Search Results</h3>
                  {searchResults.map((client, index) => (
                    <div
                      key={client.first_name + client.last_name + index}
                      className='p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer'
                      onClick={() => handleSelectClient(client)}
                    >
                      <div className='font-medium text-sm'>
                        {client.first_name} {client.last_name}
                      </div>
                      <div className='text-xs text-gray-600'>
                        {client.phone} • {client.email}
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
                  Create New Client
                </Button>
              ) : (
                <form onSubmit={handleCreateClient} className='space-y-3'>
                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label
                        htmlFor='firstName'
                        className='block text-xs font-medium mb-1'
                      >
                        First Name *
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
                        Last Name *
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
                        Phone *
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
                        Email
                      </label>
                      <input
                        id='email'
                        type='email'
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
                        Preferred Contact
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
                      Subscribe to newsletter
                    </label>
                  </div>

                  <div className='flex gap-2'>
                    <Button
                      type='submit'
                      className='flex-1 btn-press bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm py-2'
                      disabled={isCreating}
                    >
                      {isCreating ? 'Creating...' : 'Create Client'}
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => setShowCreateForm(false)}
                      className='flex-1 btn-press bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-gray-300 text-sm py-2'
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className='p-3 bg-green-50 border border-green-200 rounded-md'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='font-medium text-green-800 text-sm'>
                    {data.first_name} {data.last_name}
                  </h3>
                  <p className='text-xs text-green-600'>
                    {data.phone} • {data.email}
                  </p>
                  <div className='text-xs text-green-600 mt-1'>
                    Preferred:{' '}
                    {data.preferred_contact === 'email' ? '📧 Email' : '💬 SMS'}{' '}
                    • Newsletter:{' '}
                    {data.newsletter_consent
                      ? '✅ Subscribed'
                      : '❌ Not subscribed'}
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
                  Change Client
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
