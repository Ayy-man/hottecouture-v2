import { createClient } from '@/lib/supabase/server';

export interface PricingItem {
  name: string;
  category: string;
  base_price_cents: number;
  description?: string;
  estimated_minutes?: number;
  is_custom?: boolean;
  icon?: string;
}

export interface PricingImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
}

/**
 * Import pricing data from Excel/CSV format
 * This function handles the standard pricing structure you mentioned
 */
export async function importPricingData(
  pricingData: PricingItem[],
  replaceExisting: boolean = false
): Promise<PricingImportResult> {
  const supabase = await createClient();
  const result: PricingImportResult = {
    success: true,
    imported: 0,
    errors: [],
    warnings: [],
  };

  try {
    // If replacing existing, clear current services
    if (replaceExisting) {
      const { error: deleteError } = await supabase
        .from('service')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        result.errors.push(
          `Failed to clear existing services: ${deleteError.message}`
        );
        result.success = false;
        return result;
      }
    }

    // Import new pricing data
    for (const item of pricingData) {
      try {
        const { error } = await (supabase as any).from('service').upsert(
          {
            name: item.name,
            category: item.category,
            base_price_cents: item.base_price_cents,
            description: item.description,
            estimated_minutes: item.estimated_minutes,
            is_custom: item.is_custom || false,
            icon: item.icon,
          },
          {
            onConflict: 'name,category',
          }
        );

        if (error) {
          result.errors.push(`Failed to import ${item.name}: ${error.message}`);
        } else {
          result.imported++;
        }
      } catch (itemError) {
        result.errors.push(`Error processing ${item.name}: ${itemError}`);
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Import failed: ${error}`);
  }

  return result;
}

/**
 * Get standard pricing categories based on your business
 */
export function getStandardPricingCategories(): Record<
  string,
  { name: string; icon: string; description: string }
> {
  return {
    hemming: {
      name: 'Hemming',
      icon: '📏',
      description: 'Adjust garment length - pants, skirts, dresses',
    },
    waist: {
      name: 'Waist Adjustments',
      icon: '👗',
      description: 'Take in or let out waist - pants, skirts, dresses',
    },
    sleeves: {
      name: 'Sleeves',
      icon: '👕',
      description: 'Adjust sleeve length or width - shirts, jackets, dresses',
    },
    repairs: {
      name: 'Repairs',
      icon: '🔧',
      description: 'Fix tears, zippers, buttons, seams',
    },
    custom: {
      name: 'Custom Work',
      icon: '✨',
      description: 'Special alterations and custom design work',
    },
    bridal: {
      name: 'Bridal',
      icon: '👰',
      description: 'Wedding dress alterations and fittings',
    },
    menswear: {
      name: 'Menswear',
      icon: '👔',
      description: 'Suit, shirt, and formal wear alterations',
    },
  };
}

/**
 * Generate sample pricing data based on common alterations
 * This can be replaced with your actual Excel import
 */
export function generateSamplePricingData(): PricingItem[] {
  return [
    // Hemming
    {
      name: 'Pants Hem',
      category: 'hemming',
      base_price_cents: 1500,
      description: 'Basic pants hemming',
      estimated_minutes: 15,
      icon: '👖',
    },
    {
      name: 'Skirt Hem',
      category: 'hemming',
      base_price_cents: 1200,
      description: 'Basic skirt hemming',
      estimated_minutes: 10,
      icon: '👗',
    },
    {
      name: 'Dress Hem',
      category: 'hemming',
      base_price_cents: 2000,
      description: 'Dress hemming (simple)',
      estimated_minutes: 20,
      icon: '👗',
    },
    {
      name: 'Formal Dress Hem',
      category: 'hemming',
      base_price_cents: 3500,
      description: 'Formal dress hemming',
      estimated_minutes: 45,
      icon: '👰',
    },

    // Waist Adjustments
    {
      name: 'Pants Waist In',
      category: 'waist',
      base_price_cents: 2500,
      description: 'Take in pants waist',
      estimated_minutes: 30,
      icon: '👖',
    },
    {
      name: 'Pants Waist Out',
      category: 'waist',
      base_price_cents: 2000,
      description: 'Let out pants waist',
      estimated_minutes: 25,
      icon: '👖',
    },
    {
      name: 'Skirt Waist In',
      category: 'waist',
      base_price_cents: 1800,
      description: 'Take in skirt waist',
      estimated_minutes: 20,
      icon: '👗',
    },
    {
      name: 'Dress Waist In',
      category: 'waist',
      base_price_cents: 3000,
      description: 'Take in dress waist',
      estimated_minutes: 35,
      icon: '👗',
    },

    // Sleeves
    {
      name: 'Sleeve Shorten',
      category: 'sleeves',
      base_price_cents: 1800,
      description: 'Shorten sleeves',
      estimated_minutes: 25,
      icon: '👕',
    },
    {
      name: 'Sleeve Lengthen',
      category: 'sleeves',
      base_price_cents: 2200,
      description: 'Lengthen sleeves',
      estimated_minutes: 30,
      icon: '👕',
    },
    {
      name: 'Sleeve Narrow',
      category: 'sleeves',
      base_price_cents: 2000,
      description: 'Narrow sleeves',
      estimated_minutes: 25,
      icon: '👕',
    },
    {
      name: 'Sleeve Widen',
      category: 'sleeves',
      base_price_cents: 1800,
      description: 'Widen sleeves',
      estimated_minutes: 20,
      icon: '👕',
    },

    // Repairs
    {
      name: 'Zipper Repair',
      category: 'repairs',
      base_price_cents: 2500,
      description: 'Replace or repair zipper',
      estimated_minutes: 45,
      icon: '🔧',
    },
    {
      name: 'Button Replacement',
      category: 'repairs',
      base_price_cents: 500,
      description: 'Replace buttons',
      estimated_minutes: 5,
      icon: '🔧',
    },
    {
      name: 'Seam Repair',
      category: 'repairs',
      base_price_cents: 800,
      description: 'Repair torn seams',
      estimated_minutes: 15,
      icon: '🔧',
    },
    {
      name: 'Lining Repair',
      category: 'repairs',
      base_price_cents: 1500,
      description: 'Repair garment lining',
      estimated_minutes: 30,
      icon: '🔧',
    },

    // Custom Work
    {
      name: 'Custom Design Consultation',
      category: 'custom',
      base_price_cents: 10000,
      description: 'Custom design consultation',
      estimated_minutes: 120,
      icon: '✨',
      is_custom: true,
    },
    {
      name: 'Custom Pattern Making',
      category: 'custom',
      base_price_cents: 15000,
      description: 'Create custom pattern',
      estimated_minutes: 180,
      icon: '✨',
      is_custom: true,
    },
    {
      name: 'Custom Garment Creation',
      category: 'custom',
      base_price_cents: 50000,
      description: 'Create custom garment from scratch',
      estimated_minutes: 600,
      icon: '✨',
      is_custom: true,
    },

    // Bridal
    {
      name: 'Wedding Dress Fitting',
      category: 'bridal',
      base_price_cents: 5000,
      description: 'Wedding dress fitting session',
      estimated_minutes: 60,
      icon: '👰',
    },
    {
      name: 'Wedding Dress Hem',
      category: 'bridal',
      base_price_cents: 8000,
      description: 'Wedding dress hemming',
      estimated_minutes: 90,
      icon: '👰',
    },
    {
      name: 'Wedding Dress Bustle',
      category: 'bridal',
      base_price_cents: 12000,
      description: 'Add bustle to wedding dress',
      estimated_minutes: 120,
      icon: '👰',
    },

    // Menswear
    {
      name: 'Suit Jacket Alteration',
      category: 'menswear',
      base_price_cents: 4000,
      description: 'Suit jacket alterations',
      estimated_minutes: 60,
      icon: '👔',
    },
    {
      name: 'Dress Shirt Alteration',
      category: 'menswear',
      base_price_cents: 2000,
      description: 'Dress shirt alterations',
      estimated_minutes: 30,
      icon: '👔',
    },
    {
      name: 'Trouser Alteration',
      category: 'menswear',
      base_price_cents: 3000,
      description: 'Trouser alterations',
      estimated_minutes: 45,
      icon: '👔',
    },
  ];
}

/**
 * Import pricing from CSV/Excel data
 * This function can be called from an API endpoint to import your Excel data
 */
export async function importPricingFromCSV(
  csvData: string,
  replaceExisting: boolean = false
): Promise<PricingImportResult> {
  const lines = csvData.split('\n').filter(line => line.trim());
  const pricingItems: PricingItem[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));

    if (columns.length >= 3 && columns[0] && columns[1] && columns[2]) {
      pricingItems.push({
        name: columns[0],
        category: columns[1],
        base_price_cents: Math.round(parseFloat(columns[2]) * 100), // Convert dollars to cents
        description: columns[3] || '',
        estimated_minutes: columns[4] ? parseInt(columns[4]) : 0,
        is_custom: columns[5] === 'true' || columns[5] === '1',
        icon: columns[6] || '',
      });
    }
  }

  return await importPricingData(pricingItems, replaceExisting);
}
