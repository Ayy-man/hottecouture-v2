import {
  PaymentIntent,
  PaymentTransaction,
  calculatePaymentFees,
  validatePaymentAmount,
  getPaymentMethodById,
  getPaymentProviderById,
} from './payment-types';
import { createClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/api/error-handler';

export class PaymentService {
  private supabase: any;

  constructor() {
    this.supabase = null;
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  async createPaymentIntent(
    orderId: string,
    amount: number,
    paymentMethodId: string,
    providerId: string,
    metadata: Record<string, any> = {}
  ): Promise<PaymentIntent> {
    const supabase = await this.getSupabase();

    const paymentMethod = getPaymentMethodById(paymentMethodId);
    if (!paymentMethod) {
      throw new Error('Invalid payment method');
    }

    const provider = getPaymentProviderById(providerId);
    if (!provider) {
      throw new Error('Invalid payment provider');
    }

    const validation = validatePaymentAmount(amount, paymentMethod);
    if (!validation.isValid) {
      throw new Error(
        `Payment validation failed: ${validation.errors.join(', ')}`
      );
    }

    const paymentIntent: Omit<PaymentIntent, 'id' | 'createdAt' | 'updatedAt'> =
      {
        orderId,
        amount,
        currency: 'CAD',
        status: 'pending',
        paymentMethod: paymentMethodId,
        provider: providerId,
        metadata: {
          ...metadata,
          orderId,
          paymentMethod: paymentMethod.name,
          provider: provider.name,
        },
      };

    const { data, error } = await supabase
      .from('payment_intents')
      .insert({
        ...paymentIntent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }

    await logEvent('payment', data.id, 'intent_created', {
      orderId,
      amount,
      paymentMethod: paymentMethodId,
      provider: providerId,
    });

    return {
      ...data,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async updatePaymentIntentStatus(
    paymentIntentId: string,
    status: PaymentIntent['status'],
    clientSecret?: string
  ): Promise<PaymentIntent> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('payment_intents')
      .update({
        status,
        client_secret: clientSecret,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentIntentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update payment intent: ${error.message}`);
    }

    await logEvent('payment', paymentIntentId, 'status_updated', {
      status,
      clientSecret: !!clientSecret,
    });

    return {
      ...data,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async createTransaction(
    paymentIntentId: string,
    amount: number,
    type: PaymentTransaction['type'],
    providerTransactionId?: string
  ): Promise<PaymentTransaction> {
    const supabase = await this.getSupabase();

    // Get payment intent to calculate fees
    const { data: paymentIntent } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('id', paymentIntentId)
      .single();

    if (!paymentIntent) {
      throw new Error('Payment intent not found');
    }

    const paymentMethod = getPaymentMethodById(paymentIntent.payment_method);
    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    const fees = calculatePaymentFees(amount, paymentMethod);
    const processingFee = fees.processingFee;
    const platformFee = Math.round(amount * 0.01); // 1% platform fee
    const totalFees = processingFee + platformFee;

    const transaction: Omit<PaymentTransaction, 'id' | 'createdAt'> = {
      paymentIntentId,
      amount,
      type,
      status: 'pending',
      providerTransactionId: providerTransactionId ?? '',
      fees: {
        processing: processingFee,
        platform: platformFee,
        total: totalFees,
      },
    };

    const { data, error } = await supabase
      .from('payment_transactions')
      .insert({
        ...transaction,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }

    await logEvent('payment', data.id, 'transaction_created', {
      paymentIntentId,
      amount,
      type,
      fees: totalFees,
    });

    return {
      ...data,
      createdAt: new Date(data.created_at),
    };
  }

  async updateTransactionStatus(
    transactionId: string,
    status: PaymentTransaction['status'],
    providerTransactionId?: string
  ): Promise<PaymentTransaction> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('payment_transactions')
      .update({
        status,
        provider_transaction_id: providerTransactionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update transaction: ${error.message}`);
    }

    await logEvent('payment', transactionId, 'transaction_updated', {
      status,
      providerTransactionId,
    });

    return {
      ...data,
      createdAt: new Date(data.created_at),
    };
  }

  async getPaymentIntent(
    paymentIntentId: string
  ): Promise<PaymentIntent | null> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('id', paymentIntentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get payment intent: ${error.message}`);
    }

    return {
      ...data,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async getPaymentIntentsByOrder(orderId: string): Promise<PaymentIntent[]> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get payment intents: ${error.message}`);
    }

    return data.map((intent: any) => ({
      ...intent,
      createdAt: new Date(intent.created_at),
      updatedAt: new Date(intent.updated_at),
    }));
  }

  async getTransactionsByPaymentIntent(
    paymentIntentId: string
  ): Promise<PaymentTransaction[]> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('payment_intent_id', paymentIntentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get transactions: ${error.message}`);
    }

    return data.map((transaction: any) => ({
      ...transaction,
      createdAt: new Date(transaction.created_at),
    }));
  }

  async processRefund(
    paymentIntentId: string,
    amount: number,
    reason: string
  ): Promise<PaymentTransaction> {
    // Get the original payment intent
    const paymentIntent = await this.getPaymentIntent(paymentIntentId);
    if (!paymentIntent) {
      throw new Error('Payment intent not found');
    }

    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Can only refund succeeded payments');
    }

    // Create refund transaction
    const refundTransaction = await this.createTransaction(
      paymentIntentId,
      amount,
      'refund'
    );

    // Update payment intent status if fully refunded
    const totalRefunded = await this.getTotalRefunded(paymentIntentId);
    if (totalRefunded + amount >= paymentIntent.amount) {
      await this.updatePaymentIntentStatus(paymentIntentId, 'refunded');
    }

    await logEvent('payment', paymentIntentId, 'refund_processed', {
      amount,
      reason,
      transactionId: refundTransaction.id,
    });

    return refundTransaction;
  }

  async getTotalRefunded(paymentIntentId: string): Promise<number> {
    const transactions =
      await this.getTransactionsByPaymentIntent(paymentIntentId);
    return transactions
      .filter(t => t.type === 'refund' && t.status === 'succeeded')
      .reduce((total, t) => total + t.amount, 0);
  }

  async getPaymentSummary(orderId: string): Promise<{
    totalAmount: number;
    paidAmount: number;
    refundedAmount: number;
    remainingAmount: number;
    status: 'pending' | 'partial' | 'paid' | 'refunded';
  }> {
    const paymentIntents = await this.getPaymentIntentsByOrder(orderId);

    let totalAmount = 0;
    let paidAmount = 0;
    let refundedAmount = 0;

    for (const intent of paymentIntents) {
      totalAmount += intent.amount;

      if (intent.status === 'succeeded') {
        paidAmount += intent.amount;
      }

      if (intent.status === 'refunded') {
        refundedAmount += intent.amount;
      }
    }

    const remainingAmount = totalAmount - paidAmount + refundedAmount;

    let status: 'pending' | 'partial' | 'paid' | 'refunded';
    if (paidAmount === 0) {
      status = 'pending';
    } else if (paidAmount < totalAmount) {
      status = 'partial';
    } else if (refundedAmount > 0) {
      status = 'refunded';
    } else {
      status = 'paid';
    }

    return {
      totalAmount,
      paidAmount,
      refundedAmount,
      remainingAmount,
      status,
    };
  }
}

export const paymentService = new PaymentService();
