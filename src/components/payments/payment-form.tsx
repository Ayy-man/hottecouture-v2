'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Banknote,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  PaymentMethod,
  PaymentProvider,
  PaymentSummary,
  calculatePaymentFees,
  formatPaymentAmount,
  getEnabledPaymentMethods,
  getEnabledPaymentProviders,
  DEFAULT_PAYMENT_CONFIG,
} from '@/lib/payments/payment-types';

interface PaymentFormProps {
  orderId: string;
  summary: PaymentSummary;
  onPaymentComplete: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  className?: string;
}

export function PaymentForm({
  orderId,
  summary,
  onPaymentComplete,
  onPaymentError,
  className = '',
}: PaymentFormProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(
    summary.depositAmount
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>(
    []
  );

  useEffect(() => {
    const methods = getEnabledPaymentMethods();
    const providers = getEnabledPaymentProviders();

    setPaymentMethods(methods);
    setPaymentProviders(providers);

    // Set default selections
    if (methods.length > 0 && methods[0]) {
      setSelectedMethod(methods[0].id);
    }
    if (providers.length > 0 && providers[0]) {
      setSelectedProvider(providers[0].id);
    }
  }, []);

  const selectedMethodData = paymentMethods.find(m => m.id === selectedMethod);
  const selectedProviderData = paymentProviders.find(
    p => p.id === selectedProvider
  );

  const paymentFees = selectedMethodData
    ? calculatePaymentFees(
        paymentAmount,
        selectedMethodData,
        DEFAULT_PAYMENT_CONFIG.taxRate
      )
    : null;

  const handlePayment = async () => {
    if (
      !selectedMethod ||
      !selectedProvider ||
      !selectedMethodData ||
      !selectedProviderData
    ) {
      setError('Please select a payment method and provider');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          amount: paymentAmount,
          paymentMethodId: selectedMethod,
          providerId: selectedProvider,
          metadata: {
            paymentType:
              paymentAmount === summary.totalAmount ? 'full' : 'deposit',
            originalAmount: summary.totalAmount,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment failed');
      }

      const { paymentIntentId } = await response.json();
      onPaymentComplete(paymentIntentId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      onPaymentError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        return <CreditCard className='w-5 h-5' />;
      case 'bank_transfer':
        return <Banknote className='w-5 h-5' />;
      case 'cash':
        return <Banknote className='w-5 h-5' />;
      case 'check':
        return <Check className='w-5 h-5' />;
      default:
        return <CreditCard className='w-5 h-5' />;
    }
  };

  const isPaymentMethodSupported = (method: PaymentMethod) => {
    if (!selectedProviderData) return false;
    return selectedProviderData.supportedMethods.includes(method.id);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
          <CardDescription>
            Review your order total and payment options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            <div className='flex justify-between'>
              <span>Subtotal:</span>
              <span>{formatPaymentAmount(summary.subtotal)}</span>
            </div>
            {summary.tax > 0 && (
              <div className='flex justify-between'>
                <span>Tax:</span>
                <span>{formatPaymentAmount(summary.tax)}</span>
              </div>
            )}
            {summary.rushFee > 0 && (
              <div className='flex justify-between text-accent-contrast'>
                <span>Rush Fee:</span>
                <span>{formatPaymentAmount(summary.rushFee)}</span>
              </div>
            )}
            <div className='border-t pt-2'>
              <div className='flex justify-between font-bold text-lg'>
                <span>Total:</span>
                <span>{formatPaymentAmount(summary.totalAmount)}</span>
              </div>
            </div>
            <div className='text-sm text-muted-foreground'>
              Deposit Required: {formatPaymentAmount(summary.depositAmount)} (
              {DEFAULT_PAYMENT_CONFIG.depositPercentage}%)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Provider</CardTitle>
          <CardDescription>
            Choose how you want to process the payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {paymentProviders.map(provider => (
              <div
                key={provider.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedProvider === provider.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
                onClick={() => setSelectedProvider(provider.id)}
              >
                <div className='flex items-center space-x-3'>
                  <div className='w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center'>
                    <CreditCard className='w-4 h-4 text-primary' />
                  </div>
                  <div>
                    <h3 className='font-medium'>{provider.name}</h3>
                    <p className='text-sm text-muted-foreground'>{provider.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>How would you like to pay?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {paymentMethods
              .filter(method => isPaymentMethodSupported(method))
              .map(method => (
                <div
                  key={method.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedMethod === method.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <div className='flex items-center space-x-3'>
                    {getPaymentMethodIcon(method)}
                    <div>
                      <h3 className='font-medium'>{method.name}</h3>
                      <p className='text-sm text-muted-foreground'>
                        {method.description}
                      </p>
                      {method.processingFee > 0 && (
                        <Badge variant='outline' className='text-xs'>
                          {method.processingFee}% fee
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Amount */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Amount</CardTitle>
          <CardDescription>Choose how much to pay now</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <Button
                variant={
                  paymentAmount === summary.depositAmount
                    ? 'default'
                    : 'outline'
                }
                onClick={() => setPaymentAmount(summary.depositAmount)}
                className='h-16'
              >
                <div className='text-center'>
                  <div className='font-bold'>Deposit Only</div>
                  <div className='text-sm'>
                    {formatPaymentAmount(summary.depositAmount)}
                  </div>
                </div>
              </Button>
              <Button
                variant={
                  paymentAmount === summary.totalAmount ? 'default' : 'outline'
                }
                onClick={() => setPaymentAmount(summary.totalAmount)}
                className='h-16'
              >
                <div className='text-center'>
                  <div className='font-bold'>Pay in Full</div>
                  <div className='text-sm'>
                    {formatPaymentAmount(summary.totalAmount)}
                  </div>
                </div>
              </Button>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='custom-amount'>Custom Amount</Label>
              <Input
                id='custom-amount'
                type='text'
                inputMode='decimal'
                pattern='[0-9]*\.?[0-9]*'
                defaultValue={paymentAmount / 100}
                onChange={e => {
                  // Allow natural typing without immediate formatting
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    setPaymentAmount(Math.round(value * 100));
                  }
                }}
                onBlur={e => {
                  // Format only on blur to allow natural typing
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    e.target.value = value.toFixed(2);
                    setPaymentAmount(Math.round(value * 100));
                  } else if (e.target.value.trim() === '') {
                    setPaymentAmount(0);
                  }
                }}
                onFocus={e => {
                  // Select all text on focus for easy replacement
                  e.target.select();
                }}
                placeholder='Enter amount'
                className='text-right'
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Fees */}
      {paymentFees && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              <div className='flex justify-between'>
                <span>Payment Amount:</span>
                <span>{formatPaymentAmount(paymentFees.subtotal)}</span>
              </div>
              <div className='flex justify-between'>
                <span>Tax:</span>
                <span>{formatPaymentAmount(paymentFees.tax)}</span>
              </div>
              {paymentFees.processingFee > 0 && (
                <div className='flex justify-between'>
                  <span>Processing Fee:</span>
                  <span>{formatPaymentAmount(paymentFees.processingFee)}</span>
                </div>
              )}
              <div className='border-t pt-2'>
                <div className='flex justify-between font-bold'>
                  <span>Total to Pay:</span>
                  <span>{formatPaymentAmount(paymentFees.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Payment Button */}
      <Button
        onClick={handlePayment}
        disabled={isProcessing || !selectedMethod || !selectedProvider}
        className='w-full h-12 text-lg'
      >
        {isProcessing ? (
          <div className='flex items-center space-x-2'>
            <Loader2 className='w-5 h-5 animate-spin' />
            <span>Processing Payment...</span>
          </div>
        ) : (
          `Pay ${formatPaymentAmount(paymentFees?.total || paymentAmount)}`
        )}
      </Button>
    </div>
  );
}
