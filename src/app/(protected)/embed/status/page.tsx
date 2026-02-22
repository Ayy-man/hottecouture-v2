'use client';

import { useState } from 'react';

interface OrderStatus {
  order_number: number;
  status: string;
  status_label: string;
  items_count: number;
  estimated_completion: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#EAB308',
  working: '#3B82F6',
  done: '#22C55E',
  ready: '#A855F7',
  delivered: '#6B7280',
};

export default function EmbeddableStatusPage() {
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderStatus[]>([]);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const isOrderNumber = /^\d+$/.test(searchValue.trim());
      const params = new URLSearchParams({ lang: 'fr' });
      
      if (isOrderNumber) {
        params.set('order', searchValue.trim());
      } else {
        params.set('phone', searchValue.trim());
      }

      const response = await fetch(`/api/status/lookup?${params}`);
      const data = await response.json();

      if (data.found && data.orders) {
        setOrders(data.orders);
      } else {
        setOrders([]);
        setError(data.message || 'Aucune commande trouvée');
      }
    } catch {
      setError('Erreur de connexion');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Suivi Commande - Hotte Couture</title>
      </head>
      <body style={{ 
        margin: 0, 
        padding: '16px', 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f9fafb',
        minHeight: '100vh',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <h2 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '18px', 
            fontWeight: 600,
            color: '#1f2937',
            textAlign: 'center'
          }}>
            🧵 Suivi de commande
          </h2>

          <form onSubmit={handleSearch} style={{ marginBottom: '16px' }}>
            <input
              type="text"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder="Téléphone ou # commande"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                marginBottom: '8px',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              disabled={loading || !searchValue.trim()}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: 600,
                color: 'white',
                backgroundColor: loading ? '#9ca3af' : '#8b5cf6',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Recherche...' : 'Rechercher'}
            </button>
          </form>

          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              borderRadius: '8px',
              textAlign: 'center',
              marginBottom: '12px',
            }}>
              {error}
            </div>
          )}

          {searched && orders.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {orders.map(order => (
                <div 
                  key={order.order_number}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{
                    height: '4px',
                    backgroundColor: STATUS_COLORS[order.status] || '#6B7280',
                  }} />
                  <div style={{ padding: '12px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontWeight: 700, fontSize: '16px' }}>
                        #{order.order_number}
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}>
                        {order.status_label}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      <div>{order.items_count} article{order.items_count > 1 ? 's' : ''}</div>
                      {order.estimated_completion && (
                        <div>Date prévue: {new Date(order.estimated_completion).toLocaleDateString('fr-CA')}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p style={{ 
            textAlign: 'center', 
            fontSize: '11px', 
            color: '#9ca3af',
            marginTop: '16px',
          }}>
            Hotte Design & Couture
          </p>
        </div>
      </body>
    </html>
  );
}
