'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, User, Phone, Mail, Package, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
  created_at: string
  order_count?: number
  total_value?: number
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****'
  return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4)
}

function maskEmail(email: string): string {
  const parts = email.split('@')
  const local = parts[0]
  const domain = parts[1]
  if (!local || !domain) return '****@****'
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length)
  return `${maskedLocal}@${domain}`
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [revealedClients, setRevealedClients] = useState<Set<string>>(new Set())

  const toggleReveal = (clientId: string) => {
    setRevealedClients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  // Load all clients
  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      } else {
        throw new Error('Failed to load clients')
      }
    } catch (err) {
      console.error('Error loading clients:', err)
      setError(err instanceof Error ? err.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Filter clients based on search
  const filteredClients = clients.filter(client => {
    if (searchTerm === '') return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      client.first_name.toLowerCase().includes(searchLower) ||
      client.last_name.toLowerCase().includes(searchLower) ||
      client.phone?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Loading clients...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">Error loading clients</div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/board">
            <Button>Back to Board</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/board">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Board
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Client Directory
            </h1>
            <p className="text-muted-foreground">
              Search and view order history for any client
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-4 h-4" />
          <Input
            placeholder="Search clients by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <User className="w-12 h-12 text-muted-foreground/70 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No clients found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Try adjusting your search criteria.'
                  : 'No clients have been added yet.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 mb-4 sm:mb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-foreground">
                        {client.first_name} {client.last_name}
                      </h3>
                      <Badge variant="outline">
                        Client since {formatDate(client.created_at)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {(client.phone || client.email) && (
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => toggleReveal(client.id)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {revealedClients.has(client.id) ? (
                              <>
                                <EyeOff className="w-3 h-3" />
                                Hide Contact Info
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                Show Contact Info
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span className="font-mono">
                            {revealedClients.has(client.id) ? client.phone : maskPhone(client.phone)}
                          </span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="font-mono">
                            {revealedClients.has(client.id) ? client.email : maskEmail(client.email)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link href={`/clients/${client.id}`}>
                      <Button className="w-full sm:w-auto">
                        <User className="w-4 h-4 mr-2" />
                        Voir détails
                      </Button>
                    </Link>
                    <Link href={`/orders/history?clientId=${client.id}`}>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Package className="w-4 h-4 mr-2" />
                        Commandes
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        </div>
      </div>
      </div>
    </div>
  )
}