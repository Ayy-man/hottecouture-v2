import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import QRCode from 'qrcode';
import {
  upsertGHLContact,
  formatClientForGHL,
} from '@/lib/webhooks/ghl-webhook';
import {
  calculateOrderPricing,
  getPricingConfig,
} from '@/lib/pricing/calcTotal';

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  console.log('🚀 Intake API: New order creation request', { correlationId });

  try {
    const supabase = await createClient();

    // Parse request body
    const body = await request.json();
    console.log('📝 Intake API: Request body received', {
      correlationId,
      hasClient: !!body.client,
      hasOrder: !!body.order,
      hasGarments: !!body.garments,
      garmentsCount: body.garments?.length || 0,
      clientName: body.client?.first_name,
      orderType: body.order?.type,
    });

    // Basic validation
    if (!body.client || !body.order || !body.garments) {
      console.error('❌ Intake API: Missing required fields', {
        correlationId,
        hasClient: !!body.client,
        hasOrder: !!body.order,
        hasGarments: !!body.garments,
      });
      return NextResponse.json(
        {
          error: 'Missing required fields: client, order, garments',
        },
        { status: 400 }
      );
    }

    const { client, order, garments, notes } = body;

    // 1. Create or find client
    let clientId: string;

    // Try to find existing client by email or phone
    let existingClient = null;

    if (client.email) {
      // First try by email
      const { data: emailClient } = await supabase
        .from('client')
        .select('id')
        .eq('email', client.email)
        .single();

      if (emailClient) {
        existingClient = emailClient;
        console.log('Found existing client by email:', (emailClient as any).id);
      }
    }

    // If not found by email, try by phone
    if (!existingClient && client.phone) {
      const { data: phoneClient } = await supabase
        .from('client')
        .select('id')
        .eq('phone', client.phone)
        .single();

      if (phoneClient) {
        existingClient = phoneClient;
        console.log('Found existing client by phone:', (phoneClient as any).id);
      }
    }

    if (existingClient) {
      clientId = (existingClient as any).id;
    } else {
      // Create new client
      const { data: newClient, error: clientError } = await supabase
        .from('client')
        .insert({
          first_name: client.first_name,
          last_name: client.last_name,
          email: client.email,
          phone: client.phone,
          language: client.language || 'fr',
        } as any)
        .select('id')
        .single();

      if (clientError) {
        console.error('Client creation error:', clientError);
        return NextResponse.json(
          {
            error: `Failed to create client: ${clientError.message}`,
          },
          { status: 500 }
        );
      }

      clientId = (newClient as any).id;
      console.log('Created new client:', clientId);

      // Send new client to GHL webhook with nurture sequence enrollment
      let ghlContactId = null;
      try {
        const ghlContactData = formatClientForGHL(
          {
            first_name: client.first_name,
            last_name: client.last_name,
            email: client.email,
            phone: client.phone,
          },
          { isNewClient: true, enrollInNurture: true }
        );

        const ghlResult = await upsertGHLContact(ghlContactData);
        if (ghlResult.success) {
          ghlContactId = ghlResult.contactId;
          console.log(
            '✅ GHL contact created successfully for client:',
            clientId,
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
        // Don't fail the order creation if GHL webhook fails
      }

      // Update client with GHL contact ID if we got one
      if (ghlContactId) {
        try {
          await (supabase as any)
            .from('client')
            .update({ ghl_contact_id: ghlContactId })
            .eq('id', clientId);
          console.log('✅ Updated client with GHL contact ID:', ghlContactId);
        } catch (updateError) {
          console.warn(
            '⚠️ Failed to update client with GHL contact ID (non-blocking):',
            updateError
          );
        }
      }
    }

    // 2. Calculate pricing using proper pricing function
    console.log('🔍 Intake API: garments data:', garments);

    // Convert garments to pricing items
    const pricingItems = [];
    for (const garment of garments) {
      console.log(`🔍 Intake API: processing garment: ${garment.type}`);
      for (const service of garment.services) {
        console.log(
          `🔍 Intake API: processing service: ${service.serviceId}, qty: ${service.qty}, customPrice: ${service.customPriceCents}`
        );

        // Get base price from service table
        const { data: serviceData } = await supabase
          .from('service')
          .select('base_price_cents')
          .eq('id', service.serviceId)
          .single();

        console.log(`🔍 Intake API: serviceData from DB:`, serviceData);

        const basePrice = (serviceData as any)?.base_price_cents || 5000;
        const servicePrice = service.customPriceCents || basePrice;

        console.log(
          `🔍 Intake API: basePrice: ${basePrice}, servicePrice: ${servicePrice}, qty: ${service.qty}`
        );

        pricingItems.push({
          garment_id: garment.garment_type_id || 'unknown',
          service_id: service.serviceId,
          quantity: service.qty,
          base_price_cents: basePrice,
          custom_price_cents: service.customPriceCents || null,
        });
      }
    }

    // Use proper pricing calculation
    const config = getPricingConfig();
    const pricingCalculation = calculateOrderPricing({
      order_id: 'temp', // Will be replaced with actual order ID
      is_rush: order.rush || false,
      items: pricingItems,
      config,
    });

    const {
      subtotal_cents,
      rush_fee_cents,
      tax_cents,
      tps_cents,
      tvq_cents,
      total_cents,
    } = pricingCalculation;

    console.log('🔍 Intake API: Calculated pricing:', {
      subtotal_cents,
      rush_fee_cents,
      tax_cents,
      tps_cents,
      tvq_cents,
      total_cents,
    });

    // Calculate due date if not provided (10 days for alteration, 28 days for custom)
    let dueDate = order.due_date;
    if (!dueDate) {
      const today = new Date();
      const orderType = order.type || 'alteration';
      const daysToAdd = orderType === 'custom' ? 28 : 10;
      const calculatedDueDate = new Date(today);
      calculatedDueDate.setDate(today.getDate() + daysToAdd);
      dueDate = calculatedDueDate.toISOString().split('T')[0];
      console.log(`📅 Intake API: Auto-calculated due date for ${orderType} order: ${dueDate} (+${daysToAdd} days)`);
    }

    // 3. Create order
    console.log('📝 Intake API: Creating order', {
      correlationId,
      clientId,
      orderType: order.type || 'alteration',
      dueDate: dueDate,
      rush: order.rush || false,
      subtotalCents: subtotal_cents,
      totalCents: total_cents,
    });

    const { data: newOrder, error: orderError } = await supabase
      .from('order')
      .insert({
        client_id: clientId,
        type: order.type || 'alteration',
        priority: order.priority || 'normal',
        due_date: dueDate,
        rush: order.rush || false,
        subtotal_cents: subtotal_cents,
        tax_cents: tax_cents,
        tps_cents: tps_cents,
        tvq_cents: tvq_cents,
        total_cents: total_cents,
        rush_fee_cents: rush_fee_cents,
        notes: JSON.stringify(notes || {}),
        assigned_to: order.assigned_to || null,
      } as any)
      .select('id, order_number')
      .single();

    if (orderError) {
      console.error('❌ Intake API: Order creation error', {
        correlationId,
        error: orderError,
        orderData: {
          client_id: clientId,
          type: order.type || 'alteration',
          due_date: order.due_date,
          rush: order.rush || false,
        },
      });
      return NextResponse.json(
        {
          error: `Failed to create order: ${orderError.message}`,
        },
        { status: 500 }
      );
    }

    console.log('✅ Intake API: Order created in database', {
      correlationId,
      orderId: (newOrder as any).id,
      orderNumber: (newOrder as any).order_number,
    });

    console.log('Order created successfully:', newOrder);

    // 3. Create garments and related records
    const garmentIds = [];
    for (const garment of garments) {
      // Create garment
      const { data: newGarment, error: garmentError } = await supabase
        .from('garment')
        .insert({
          order_id: (newOrder as any).id,
          garment_type_id: garment.garment_type_id, // Use the ID instead of type
          type: garment.type, // Keep for backward compatibility
          color: garment.color || 'Unknown',
          brand: garment.brand || 'Unknown',
          notes: garment.notes || '',
          photo_path: garment.photo_path || null,
          position_notes: garment.position_notes || null,
          label_code: `GARM-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        } as any)
        .select('id')
        .single();

      if (garmentError) {
        console.error('Garment creation error:', garmentError);
        return NextResponse.json(
          {
            error: `Failed to create garment: ${garmentError.message}`,
          },
          { status: 500 }
        );
      }

      garmentIds.push((newGarment as any).id);

      // Create garment_services
      if (garment.services && garment.services.length > 0) {
        for (const service of garment.services) {
          // Check if this is a custom service
          const isCustomService = service.serviceId.startsWith('custom-');
          const serviceId = service.serviceId;

          if (isCustomService) {
            // For custom services, create them as regular services in the service table
            console.log(
              '🔧 Intake API: Creating custom service:',
              service.serviceId,
              'with name:',
              service.customServiceName
            );

            try {
              // First, create the custom service in the service table
              const { data: newCustomService, error: customServiceError } =
                await supabase
                  .from('service')
                  .insert({
                    code: `CUSTOM-${Date.now()}`,
                    name: service.customServiceName,
                    base_price_cents: service.customPriceCents || 0,
                    category: 'Custom',
                    is_custom: true,
                    pricing_model: 'fixed',
                    base_unit: 'piece',
                    min_quantity: 1,
                    time_increment_minutes: 5,
                    display_order: 0,
                    is_active: true,
                  } as any)
                  .select('id')
                  .single();

              if (customServiceError) {
                console.error(
                  '❌ Intake API: Error creating custom service:',
                  customServiceError
                );
                throw new Error(
                  `Failed to create custom service: ${customServiceError.message}`
                );
              }

              // Now create the garment_service link with the new custom service ID
              const { error: garmentServiceError } = await supabase
                .from('garment_service')
                .insert({
                  garment_id: (newGarment as any).id,
                  service_id: (newCustomService as any).id,
                  quantity: service.qty || 1,
                  custom_price_cents: service.customPriceCents || null,
                  notes: service.notes || null,
                } as any);

              if (garmentServiceError) {
                console.error(
                  '❌ Intake API: Error linking custom service to garment:',
                  garmentServiceError
                );
                throw new Error(
                  `Failed to link custom service: ${garmentServiceError.message}`
                );
              }

              console.log(
                '✅ Intake API: Custom service created and linked successfully'
              );
              continue;
            } catch (error: any) {
              console.error(
                '❌ Intake API: Custom service creation error:',
                error
              );
              throw error;
            }
          } else {
            // For regular services, ensure the service exists in the database
            const { data: existingService, error: serviceCheckError } =
              await supabase
                .from('service')
                .select('id')
                .eq('id', service.serviceId)
                .single();

            if (serviceCheckError || !existingService) {
              console.error(
                '❌ Intake API: Service not found in database:',
                service.serviceId
              );
              console.error(
                '❌ Intake API: This indicates the intake form is not working correctly'
              );
              return NextResponse.json(
                {
                  error: `Service not found: ${service.serviceId}. Please refresh the page and try again.`,
                },
                { status: 400 }
              );
            }

            // Insert regular service
            const { error: garmentServiceError } = await supabase
              .from('garment_service')
              .insert({
                garment_id: (newGarment as any).id,
                service_id: serviceId,
                quantity: service.qty || 1,
                custom_price_cents: service.customPriceCents || null,
                notes: service.notes || null,
              } as any);

            if (garmentServiceError) {
              console.error(
                'Garment service creation error:',
                garmentServiceError
              );
              return NextResponse.json(
                {
                  error: `Failed to create garment service: ${garmentServiceError.message}`,
                },
                { status: 500 }
              );
            }
          }
        }
      }

      // Tasks removed - garments with services provide all necessary work information
    }

    // Generate QR code as data URL
    const qrText = `ORD-${(newOrder as any).order_number}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrText, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    console.log('✅ Intake API: Order created successfully', {
      correlationId,
      orderId: (newOrder as any).id,
      orderNumber: (newOrder as any).order_number,
      clientName: client.first_name,
      totalCents: total_cents,
    });

    return NextResponse.json({
      orderId: (newOrder as any).id,
      orderNumber: (newOrder as any).order_number,
      totals: {
        subtotal_cents: subtotal_cents,
        tax_cents: tax_cents,
        tps_cents: tps_cents,
        tvq_cents: tvq_cents,
        total_cents: total_cents,
        rush_fee_cents: rush_fee_cents,
      },
      qrcode: qrCodeDataUrl, // Actual QR code image as data URL
    });
  } catch (error) {
    console.error('❌ Intake API error:', error);
    console.error(
      '❌ Error stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    );
    console.error('❌ Request body that caused error: Check request body');
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        correlationId: correlationId,
      },
      { status: 500 }
    );
  }
}
