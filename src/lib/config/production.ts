export const RACK_CONFIG = {
  positions: [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10',
    'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10',
  ],
  editableStatuses: ['ready', 'delivered'] as const,
  label: 'Position rack',
  placeholder: 'Ex: A3',
  otherOption: 'Autre',
};

export const PRINT_TASKS_CONFIG = {
  includedStatuses: ['pending', 'working'] as const,
  sortBy: 'due_date' as const,
  sortDirection: 'asc' as const,
  secondarySort: 'priority' as const,
  priorityOrder: { rush: 0, custom: 1, normal: 2 },
  maxNotesLength: 80,
  title: 'Hotte Couture — Tâches du',
};

export const LABEL_CONFIG = {
  copyCount: 2,
  showCopyIndicator: true,
  copyIndicatorFormat: (current: number, total: number) => `${current} de ${total}`,
  // Label printer paper size (4" x 2" is standard for most label printers)
  labelWidth: '4in',
  labelHeight: '2in',
};
