'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { calculateDepositCents } from '@/lib/payments/deposit-calculator';

interface PaymentStatusSectionProps {
  order: {
    id: string;
    order_number: number;
    type: 'alteration' | 'custom';
    total_cents: number;
    deposit_cents: number;
    deposit_paid_at: string | null;
    balance_due_cents: number;
    payment_status: string;
    paid_at: string | null;
    payment_method?: string | null;
    deposit_payment_method?: string | null;
  };
  onPaymentUpdate?: () => void;
}

export function PaymentStatusSection({ order, onPaymentUpdate }: PaymentStatusSectionProps) {
  const t = useTranslations('payments');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSentUrl, setLastSentUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  const isCustomOrder = order.type === 'custom';
  const depositRequired = isCustomOrder && !order.deposit_paid_at;
  const depositPaid = order.deposit_paid_at !== null;
  const fullyPaid = order.payment_status === 'paid';

  // Calculate actual balance (uses centralized calculator)
  const depositAmount = order.deposit_cents || (isCustomOrder ? calculateDepositCents(order.total_cents) : 0);
  const balanceDue = depositPaid
    ? order.total_cents - depositAmount
    : (isCustomOrder ? depositAmount : order.total_cents); // If deposit not paid, next payment is deposit

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });
  };

  const sendPaymentRequest = async (type: 'deposit' | 'balance' | 'full', sendSms: boolean = true) => {
    setLoading(type);
    setError(null);
    setLastSentUrl(null);
    setLinkCopied(false);
    setSmsSent(false);

    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          type,
          sendSms,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('failed'));
      }

      // Set URL first and copy to clipboard for "link only" mode
      const checkoutUrl = data.invoiceUrl;
      setLastSentUrl(checkoutUrl);
      setSmsSent(sendSms && data.smsSent === true);

      // For "link only" mode, also copy to clipboard automatically
      if (!sendSms && checkoutUrl) {
        try {
          await navigator.clipboard.writeText(checkoutUrl);
          setLinkCopied(true);
        } catch {
          // Fallback - user can manually copy
        }
      }

      // Don't call onPaymentUpdate here - payment hasn't happened yet
      // The actual payment completion will trigger updates via Stripe webhook
      // Calling it now causes re-renders that lose the URL state
    } catch (err) {
      console.error('Payment request error:', err);
      setError(err instanceof Error ? err.message : t('failed'));
    } finally {
      setLoading(null);
    }
  };

  const recordCashPayment = async (type: 'deposit' | 'balance' | 'full') => {
    setLoading(`cash-${type}`);
    setError(null);

    try {
      const response = await fetch('/api/payments/record-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          type,
          method: 'cash',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('failed'));
      }

      onPaymentUpdate?.();
    } catch (err) {
      console.error('Cash payment error:', err);
      setError(err instanceof Error ? err.message : t('failed'));
    } finally {
      setLoading(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  // Fully paid state
  if (fullyPaid) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 text-green-700 mb-2">
          <span className="font-semibold text-lg">{t('paid')}</span>
        </div>
        <div className="text-sm text-green-600 space-y-1">
          <div>{formatCurrency(order.total_cents)}</div>
          {order.paid_at && (
            <div>{t('paidOn', { date: formatDate(order.paid_at) })}</div>
          )}
          {order.payment_method && (
            <div className="capitalize">{t('via', { method: order.payment_method })}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        {t('title')}
        {order.payment_status === 'pending' && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">{t('pending')}</span>
        )}
        {order.payment_status === 'deposit_pending' && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{t('depositPending')}</span>
        )}
        {order.payment_status === 'deposit_paid' && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{t('depositReceived')}</span>
        )}
      </h3>

      {/* Totals */}
      <div className="space-y-2 text-sm border-b border-border pb-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('total')}</span>
          <span className="font-medium">{formatCurrency(order.total_cents)}</span>
        </div>

        {isCustomOrder && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('deposit50')}</span>
              <div className="flex items-center gap-2">
                <span className={depositPaid ? 'text-green-600 font-medium' : 'text-amber-600'}>
                  {formatCurrency(depositAmount)}
                </span>
                {depositPaid && (
                  <span className="text-green-600 text-xs">{formatDate(order.deposit_paid_at!)}</span>
                )}
              </div>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground font-medium">{t('balanceDue')}</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(depositPaid ? balanceDue : order.total_cents - depositAmount)}
              </span>
            </div>
          </>
        )}

        {!isCustomOrder && (
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-muted-foreground font-medium">{t('toPay')}</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(order.balance_due_cents || order.total_cents)}
            </span>
          </div>
        )}
      </div>

      {/* Deposit Required Warning */}
      {depositRequired && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800 font-medium">
            {t('depositRequired')}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            {t('depositRequiredMessage', { amount: formatCurrency(depositAmount) })}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Last Sent URL */}
      {lastSentUrl && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 space-y-2">
          <p className="text-sm text-green-700 font-medium">
            {smsSent ? t('linkSentSms') : linkCopied ? t('linkCopied') : t('linkCreated')}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={lastSentUrl}
              readOnly
              className="flex-1 text-xs px-2 py-1 border border-green-200 rounded bg-white truncate"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                copyToClipboard(lastSentUrl);
                setLinkCopied(true);
              }}
              className="text-xs"
            >
              {linkCopied ? t('copied') : t('copy')}
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Deposit buttons (for custom orders without deposit) */}
        {depositRequired && (
          <>
            <Button
              onClick={() => sendPaymentRequest('deposit', true)}
              disabled={loading !== null}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading === 'deposit' ? (
                <span className="flex items-center gap-2">
                  {t('sending')}
                </span>
              ) : (
                t('sendDepositSms')
              )}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => sendPaymentRequest('deposit', false)}
                disabled={loading !== null}
                className="flex-1 text-sm"
              >
                {t('linkOnly')}
              </Button>
              <Button
                variant="outline"
                onClick={() => recordCashPayment('deposit')}
                disabled={loading !== null}
                className="flex-1 text-sm"
              >
                {loading === 'cash-deposit' ? '...' : t('cash')}
              </Button>
            </div>
          </>
        )}

        {/* Balance buttons (deposit paid, balance pending) OR Full payment (alterations) */}
        {!depositRequired && !fullyPaid && (
          <>
            <Button
              onClick={() => sendPaymentRequest(isCustomOrder ? 'balance' : 'full', true)}
              disabled={loading !== null}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading === 'balance' || loading === 'full' ? (
                <span className="flex items-center gap-2">
                  {t('sending')}
                </span>
              ) : (
                t('sendPaymentLink', { amount: formatCurrency(isCustomOrder ? balanceDue : order.balance_due_cents || order.total_cents) })
              )}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => sendPaymentRequest(isCustomOrder ? 'balance' : 'full', false)}
                disabled={loading !== null}
                className="flex-1 text-sm"
              >
                {t('linkOnly')}
              </Button>
              <Button
                variant="outline"
                onClick={() => recordCashPayment(isCustomOrder ? 'balance' : 'full')}
                disabled={loading !== null}
                className="flex-1 text-sm"
              >
                {loading === 'cash-balance' || loading === 'cash-full' ? '...' : t('cash')}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Payment History Note */}
      {depositPaid && !fullyPaid && (
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            <span>{t('depositOf', { amount: formatCurrency(depositAmount), date: formatDate(order.deposit_paid_at!) })}</span>
            {order.deposit_payment_method && (
              <span className="text-muted-foreground/70">({order.deposit_payment_method})</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
