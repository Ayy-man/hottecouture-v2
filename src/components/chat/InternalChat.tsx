'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface InternalChatProps {
  className?: string;
}

export function InternalChat({ className }: InternalChatProps) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userQuery = query.trim();
    setQuery('');
    setLoading(true);

    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userQuery, 
      timestamp: new Date() 
    }]);

    try {
      const response = await fetch('/api/chat/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery, session_id: sessionId }),
      });

      const data = await response.json();

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response || data.error || 'Une erreur est survenue', 
        timestamp: new Date() 
      }]);
    } catch {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Erreur de connexion / Connection error', 
        timestamp: new Date() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "Aujourd'hui", query: "Today's orders" },
    { label: 'En attente', query: 'Pending orders' },
    { label: 'En retard', query: 'Overdue orders' },
  ];

  return (
    <Card className={cn('flex flex-col h-[500px]', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>💬</span> Assistant Commandes
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-4 pt-0">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p className="mb-4">Posez une question sur les commandes:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickActions.map(action => (
                  <Button
                    key={action.query}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery(action.query);
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                'p-3 rounded-lg max-w-[85%] whitespace-pre-wrap',
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : 'bg-muted'
              )}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="bg-muted p-3 rounded-lg max-w-[85%] animate-pulse">
              Recherche...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ex: Status #12345, commandes en retard..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? '...' : 'Envoyer'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
