import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createServiceRoleClient();

    const { data: garmentTypes, error } = await supabase
      .from('garment_type')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('is_common', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching garment types:', error);
      return NextResponse.json(
        { error: 'Failed to fetch garment types' },
        { status: 500 }
      );
    }

    // Sort garment types manually
    const sortedGarmentTypes =
      garmentTypes?.sort((a: any, b: any) => {
        // First by category
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        // Then by is_common (true first)
        if (a.is_common !== b.is_common) {
          return b.is_common - a.is_common;
        }
        // Finally by name
        return a.name.localeCompare(b.name);
      }) || [];

    // Group by category
    const groupedTypes: Record<string, any[]> = {};
    if (sortedGarmentTypes) {
      sortedGarmentTypes.forEach((type: any) => {
        if (type.category) {
          if (!groupedTypes[type.category]) {
            groupedTypes[type.category] = [];
          }
          groupedTypes[type.category]!.push(type);
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        garmentTypes: sortedGarmentTypes,
        groupedTypes,
        categories: {
          womens: "Women's Clothing",
          mens: "Men's Clothing",
          outerwear: 'Outerwear',
          formal: 'Formal Wear',
          activewear: 'Activewear',
          home: 'Home Textiles',
          outdoor: 'Outdoor Gear',
          other: 'Other',
        },
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error in garment types API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
