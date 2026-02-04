export interface PricingItem {
  garment_id: string;
  service_id: string;
  quantity: number;
  custom_price_cents: number | null;
  final_price_cents: number | null;
  base_price_cents: number;
}

export interface PricingCalculation {
  subtotal_cents: number;
  rush_fee_cents: number;
  tax_cents: number; // Total tax (TPS + TVQ) for backward compatibility
  tps_cents: number; // TPS (GST) - 5% on subtotal + rush fee
  tvq_cents: number; // TVQ (QST) - 9.975% on subtotal + rush fee
  total_cents: number;
  breakdown: {
    items: Array<{
      garment_id: string;
      service_id: string;
      quantity: number;
      unit_price_cents: number;
      total_price_cents: number;
      is_custom: boolean;
      price_source: 'final' | 'custom' | 'base';
      is_final: boolean;
    }>;
    rush_applied: boolean;
    tax_rate_bps: number;
  };
}

export interface PricingConfig {
  rush_fee_small_cents: number;
  rush_fee_large_cents: number;
  gst_pst_rate_bps: number;
}

export interface OrderPricing {
  order_id: string;
  is_rush: boolean;
  items: PricingItem[];
  config: PricingConfig;
}

export type RushFeeTier = 'small' | 'large';

export interface RushFeeConfig {
  small_cents: number;
  large_cents: number;
  threshold_cents?: number; // Optional threshold for large vs small rush fee
}

// Price update types for Phase 2: Item-Level Pricing
export interface PriceUpdateRequest {
  garment_service_id: string;
  new_price_cents: number;
  changed_by: string;
  reason?: string;
}

export interface PriceUpdateResponse {
  success: boolean;
  garment_service: {
    id: string;
    final_price_cents: number;
  };
  order: {
    id: string;
    subtotal_cents: number;
    tax_cents: number;
    total_cents: number;
  };
  audit_log_id: string | null;
}
