export interface MeasurementPoint {
  id: string;
  name: string;
  description: string;
  category:
    | 'bust'
    | 'waist'
    | 'hip'
    | 'length'
    | 'sleeve'
    | 'shoulder'
    | 'other';
  unit: 'inches' | 'centimeters';
  value?: number;
  notes?: string;
  isRequired: boolean;
  order: number;
}

export interface MeasurementSet {
  id: string;
  name: string;
  description: string;
  garmentType: string;
  points: MeasurementPoint[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MeasurementTemplate {
  id: string;
  name: string;
  description: string;
  garmentTypes: string[];
  points: Omit<MeasurementPoint, 'value' | 'notes'>[];
  isDefault: boolean;
}

export interface MeasurementSession {
  id: string;
  orderId: string;
  garmentId: string;
  clientId: string;
  measurements: MeasurementSet;
  takenBy: string;
  takenAt: Date;
  notes?: string;
  photos?: string[];
}

// Standard measurement templates for different garment types
export const MEASUREMENT_TEMPLATES: Record<string, MeasurementTemplate> = {
  dress: {
    id: 'dress',
    name: 'Dress Measurements',
    description: 'Standard measurements for dresses',
    garmentTypes: ['dress', 'gown', 'evening_dress'],
    isDefault: true,
    points: [
      {
        id: 'bust',
        name: 'Bust',
        description: 'Fullest part of the bust',
        category: 'bust',
        unit: 'inches',
        isRequired: true,
        order: 1,
      },
      {
        id: 'waist',
        name: 'Waist',
        description: 'Natural waistline',
        category: 'waist',
        unit: 'inches',
        isRequired: true,
        order: 2,
      },
      {
        id: 'hip',
        name: 'Hip',
        description: 'Fullest part of the hip',
        category: 'hip',
        unit: 'inches',
        isRequired: true,
        order: 3,
      },
      {
        id: 'length',
        name: 'Length',
        description: 'From shoulder to hem',
        category: 'length',
        unit: 'inches',
        isRequired: true,
        order: 4,
      },
      {
        id: 'shoulder_width',
        name: 'Shoulder Width',
        description: 'From shoulder point to shoulder point',
        category: 'shoulder',
        unit: 'inches',
        isRequired: true,
        order: 5,
      },
      {
        id: 'sleeve_length',
        name: 'Sleeve Length',
        description: 'From shoulder to wrist',
        category: 'sleeve',
        unit: 'inches',
        isRequired: false,
        order: 6,
      },
    ],
  },
  pants: {
    id: 'pants',
    name: 'Pants Measurements',
    description: 'Standard measurements for pants',
    garmentTypes: ['pants', 'trousers', 'jeans'],
    isDefault: true,
    points: [
      {
        id: 'waist',
        name: 'Waist',
        description: 'Natural waistline',
        category: 'waist',
        unit: 'inches',
        isRequired: true,
        order: 1,
      },
      {
        id: 'hip',
        name: 'Hip',
        description: 'Fullest part of the hip',
        category: 'hip',
        unit: 'inches',
        isRequired: true,
        order: 2,
      },
      {
        id: 'inseam',
        name: 'Inseam',
        description: 'From crotch to ankle',
        category: 'length',
        unit: 'inches',
        isRequired: true,
        order: 3,
      },
      {
        id: 'outseam',
        name: 'Outseam',
        description: 'From waist to ankle',
        category: 'length',
        unit: 'inches',
        isRequired: true,
        order: 4,
      },
      {
        id: 'thigh',
        name: 'Thigh',
        description: 'Around the fullest part of the thigh',
        category: 'other',
        unit: 'inches',
        isRequired: false,
        order: 5,
      },
      {
        id: 'knee',
        name: 'Knee',
        description: 'Around the knee',
        category: 'other',
        unit: 'inches',
        isRequired: false,
        order: 6,
      },
    ],
  },
  shirt: {
    id: 'shirt',
    name: 'Shirt Measurements',
    description: 'Standard measurements for shirts and blouses',
    garmentTypes: ['shirt', 'blouse', 'top'],
    isDefault: true,
    points: [
      {
        id: 'chest',
        name: 'Chest',
        description: 'Around the fullest part of the chest',
        category: 'bust',
        unit: 'inches',
        isRequired: true,
        order: 1,
      },
      {
        id: 'waist',
        name: 'Waist',
        description: 'Natural waistline',
        category: 'waist',
        unit: 'inches',
        isRequired: true,
        order: 2,
      },
      {
        id: 'length',
        name: 'Length',
        description: 'From shoulder to hem',
        category: 'length',
        unit: 'inches',
        isRequired: true,
        order: 3,
      },
      {
        id: 'shoulder_width',
        name: 'Shoulder Width',
        description: 'From shoulder point to shoulder point',
        category: 'shoulder',
        unit: 'inches',
        isRequired: true,
        order: 4,
      },
      {
        id: 'sleeve_length',
        name: 'Sleeve Length',
        description: 'From shoulder to wrist',
        category: 'sleeve',
        unit: 'inches',
        isRequired: true,
        order: 5,
      },
      {
        id: 'sleeve_width',
        name: 'Sleeve Width',
        description: 'Around the fullest part of the upper arm',
        category: 'sleeve',
        unit: 'inches',
        isRequired: false,
        order: 6,
      },
    ],
  },
  skirt: {
    id: 'skirt',
    name: 'Skirt Measurements',
    description: 'Standard measurements for skirts',
    garmentTypes: ['skirt', 'mini_skirt', 'maxi_skirt'],
    isDefault: true,
    points: [
      {
        id: 'waist',
        name: 'Waist',
        description: 'Natural waistline',
        category: 'waist',
        unit: 'inches',
        isRequired: true,
        order: 1,
      },
      {
        id: 'hip',
        name: 'Hip',
        description: 'Fullest part of the hip',
        category: 'hip',
        unit: 'inches',
        isRequired: true,
        order: 2,
      },
      {
        id: 'length',
        name: 'Length',
        description: 'From waist to hem',
        category: 'length',
        unit: 'inches',
        isRequired: true,
        order: 3,
      },
      {
        id: 'hem_width',
        name: 'Hem Width',
        description: 'Width at the bottom of the skirt',
        category: 'other',
        unit: 'inches',
        isRequired: false,
        order: 4,
      },
    ],
  },
};

export function getMeasurementTemplate(
  garmentType: string
): MeasurementTemplate {
  // Find the best matching template
  const template = Object.values(MEASUREMENT_TEMPLATES).find(t =>
    t.garmentTypes.includes(garmentType.toLowerCase())
  );

  if (template) {
    return template;
  }

  // Default to dress template if no match found
  return MEASUREMENT_TEMPLATES.dress!;
}

export function createMeasurementSet(
  garmentType: string,
  measurements: Record<string, number>,
  notes?: Record<string, string>
): MeasurementSet {
  const template = getMeasurementTemplate(garmentType);

  const points: MeasurementPoint[] = template.points.map(templatePoint => ({
    ...templatePoint,
    value: measurements[templatePoint.id] ?? 0,
    notes: notes?.[templatePoint.id] ?? '',
  }));

  return {
    id: crypto.randomUUID(),
    name: `${garmentType} Measurements`,
    description: `Measurements for ${garmentType}`,
    garmentType,
    points,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function validateMeasurements(measurementSet: MeasurementSet): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  measurementSet.points.forEach(point => {
    if (point.isRequired && (point.value === undefined || point.value <= 0)) {
      errors.push(`${point.name} is required`);
    }

    if (point.value !== undefined && point.value < 0) {
      errors.push(`${point.name} cannot be negative`);
    }

    if (point.value !== undefined && point.value > 100) {
      errors.push(
        `${point.name} seems unusually large (${point.value} ${point.unit})`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function convertMeasurements(
  measurementSet: MeasurementSet,
  targetUnit: 'inches' | 'centimeters'
): MeasurementSet {
  if (measurementSet.points.every(point => point.unit === targetUnit)) {
    return measurementSet;
  }

  const conversionFactor = targetUnit === 'inches' ? 0.393701 : 2.54;

  const convertedPoints = measurementSet.points.map(point => ({
    ...point,
    unit: targetUnit,
    value: point.value ? point.value * conversionFactor : 0,
  }));

  return {
    ...measurementSet,
    points: convertedPoints,
    updatedAt: new Date(),
  };
}
