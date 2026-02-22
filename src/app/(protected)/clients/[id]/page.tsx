'use client';

import { useState, useEffect, use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Phone, Smartphone, Mail, Package, Ruler, Calendar, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  mobile_phone?: string;
  email?: string;
  language?: string;
  preferred_contact?: string;
  newsletter_consent?: boolean;
  created_at: string;
}

interface Order {
  id: string;
  order_number: number;
  type: string;
  status: string;
  due_date?: string;
  total_cents: number;
  created_at: string;
}

interface Measurement {
  id: string;
  name: string;
  name_fr: string;
  value: number;
  unit: string;
  measured_at: string;
}

type TabType = 'info' | 'orders' | 'measurements';

function maskPhone(phone: string): string {
  if (!phone || phone.length <= 4) return '****';
  return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
}

function maskEmail(email: string): string {
  if (!email) return '****@****';
  const parts = email.split('@');
  const local = parts[0];
  const domain = parts[1];
  if (!local || !domain) return '****@****';
  const maskedLocal = local.length > 2
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length);
  return `${maskedLocal}@${domain}`;
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [measurements, setMeasurements] = useState<Record<string, Measurement[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    try {
      setLoading(true);

      // Fetch client info
      const clientRes = await fetch(`/api/clients/${clientId}`);
      if (!clientRes.ok) throw new Error('Failed to load client');
      const clientData = await clientRes.json();
      setClient(clientData);

      // Fetch orders
      const ordersRes = await fetch(`/api/orders?client_id=${clientId}`);
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }

      // Fetch measurements
      const measRes = await fetch(`/api/clients/${clientId}/measurements`);
      if (measRes.ok) {
        const measData = await measRes.json();
        setMeasurements(measData.data || {});
      }
    } catch (err) {
      console.error('Error loading client:', err);
      setError(err instanceof Error ? err.message : 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      working: 'bg-blue-100 text-blue-800',
      done: 'bg-green-100 text-green-800',
      ready: 'bg-purple-100 text-purple-800',
      delivered: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-8">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">Erreur</div>
          <p className="text-muted-foreground mb-4">{error || 'Client non trouvé'}</p>
          <Link href="/clients">
            <Button>Retour aux clients</Button>
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'info' as TabType, label: 'Informations', icon: User },
    { key: 'orders' as TabType, label: 'Commandes', icon: Package },
    { key: 'measurements' as TabType, label: 'Mesures', icon: Ruler },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/clients">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {client.first_name} {client.last_name}
              </h1>
              <p className="text-muted-foreground">
                Client depuis {formatDate(client.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-white text-muted-foreground hover:bg-accent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <Card>
          <CardContent className="p-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Coordonnées</h2>
                  <button
                    onClick={() => setRevealed(!revealed)}
                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800"
                  >
                    {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {revealed ? 'Masquer' : 'Afficher'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.phone && (
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Téléphone</p>
                        <p className="font-mono">{revealed ? client.phone : maskPhone(client.phone)}</p>
                      </div>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Courriel</p>
                        <p className="font-mono">{revealed ? client.email : maskEmail(client.email)}</p>
                      </div>
                    </div>
                  )}
                  {client.mobile_phone && (
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Mobile/SMS</p>
                        <p className="font-mono">{revealed ? client.mobile_phone : maskPhone(client.mobile_phone)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Langue</p>
                    <p className="font-medium">{client.language === 'en' ? 'English' : 'Français'}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Contact préféré</p>
                    <p className="font-medium">{client.preferred_contact === 'email' ? '📧 Courriel' : '💬 SMS'}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Infolettre</p>
                    <p className="font-medium">{client.newsletter_consent ? '✅ Abonné' : '❌ Non abonné'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Historique des commandes</h2>
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune commande</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map(order => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-accent transition-colors">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-semibold">Commande #{order.order_number}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {formatDate(order.created_at)}
                            </div>
                          </div>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                          <Badge variant="outline">
                            {order.type === 'custom' ? 'Sur mesure' : 'Retouche'}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(order.total_cents)}</p>
                          {order.due_date && (
                            <p className="text-sm text-muted-foreground">Prévu: {formatDate(order.due_date)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'measurements' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Mesures du client</h2>
                {Object.keys(measurements).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ruler className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune mesure enregistrée</p>
                    <p className="text-sm mt-2">Les mesures seront ajoutées lors de la création d&apos;une commande</p>
                  </div>
                ) : (
                  Object.entries(measurements).map(([category, items]) => (
                    <div key={category} className="space-y-3">
                      <h3 className="font-medium text-foreground capitalize">
                        {category === 'body' ? 'Mesures corporelles' :
                         category === 'curtain' ? 'Rideaux' :
                         category === 'upholstery' ? 'Rembourrage' : category}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {items.map((m: Measurement) => (
                          <div key={m.id} className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">{m.name_fr || m.name}</p>
                            <p className="text-lg font-semibold">
                              {m.value} <span className="text-sm font-normal text-muted-foreground">{m.unit}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
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
