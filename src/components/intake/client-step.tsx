'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { ClientCreate } from '@/lib/dto'

interface ClientStepProps {
  data: ClientCreate | null
  onUpdate: (client: ClientCreate) => void
  onNext: () => void
}

export function ClientStep({ data, onUpdate, onNext }: ClientStepProps) {
  const t = useTranslations('intake.client')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ClientCreate[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState<ClientCreate>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    language: 'fr',
    newsletter_consent: false,
    preferred_contact: 'email',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const supabase = createClient()

  useEffect(() => {
    if (data) {
      setFormData(data)
    }
  }, [data])

  const searchClients = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const { data: clients, error } = await supabase
        .from('client')
        .select('*')
        .or(`phone.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)

      if (error) {
        console.error('Search error:', error)
        return
      }

      setSearchResults(clients || [])
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchClients(searchQuery)
  }

  const selectClient = (client: ClientCreate) => {
    setFormData(client)
    onUpdate(client)
    setSearchQuery('')
    setSearchResults([])
    setShowCreateForm(false)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.first_name.trim()) {
      newErrors.first_name = t('errors.required')
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = t('errors.required')
    }

    if (!formData.phone && !formData.email) {
      newErrors.contact = 'Phone or email is required'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('errors.invalidEmail')
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = t('errors.invalidPhone')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onUpdate(formData)
      onNext()
    }
  }

  const handleInputChange = (field: keyof ClientCreate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Search existing clients */}
      {!showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('search')}</CardTitle>
            <CardDescription>
              Search for existing clients by phone or email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <Button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="w-full py-3 text-lg"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </form>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="font-medium">Search Results:</h3>
                {searchResults.map((client, index) => (
                  <div
                    key={index}
                    onClick={() => selectClient(client)}
                    className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <p className="font-medium">
                      {client.first_name} {client.last_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {client.phone && `Phone: ${client.phone}`}
                      {client.phone && client.email && ' • '}
                      {client.email && `Email: ${client.email}`}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !isSearching && (
              <div className="mt-4 text-center">
                <p className="text-gray-600 mb-4">{t('notFound')}</p>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full py-3 text-lg"
                >
                  {t('createNew')}
                </Button>
              </div>
            )}

            {!searchQuery && (
              <div className="mt-4 text-center">
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full py-3 text-lg"
                >
                  {t('createNew')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create new client form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('createNew')}</CardTitle>
            <CardDescription>
              Enter client information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('firstName')} *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className={`w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.first_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('lastName')} *
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className={`w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.last_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('phone')}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('language')}
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('preferredContact')}
                  </label>
                  <select
                    value={formData.preferred_contact}
                    onChange={(e) => handleInputChange('preferred_contact', e.target.value)}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.newsletter_consent}
                      onChange={(e) => handleInputChange('newsletter_consent', e.target.checked)}
                      className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium">{t('newsletterConsent')}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('notes')}
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {errors.contact && (
                <p className="text-sm text-red-600">{errors.contact}</p>
              )}

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 py-3 text-lg"
                >
                  Back to Search
                </Button>
                <Button
                  type="submit"
                  className="flex-1 py-3 text-lg"
                >
                  Continue
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Selected client summary */}
      {data && !showCreateForm && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-800">
                  {data.first_name} {data.last_name}
                </h3>
                <p className="text-sm text-green-600">
                  {data.phone && `Phone: ${data.phone}`}
                  {data.phone && data.email && ' • '}
                  {data.email && `Email: ${data.email}`}
                </p>
              </div>
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="outline"
                size="sm"
              >
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
