import { MovementAction, LocationType } from '@prisma/client';

// Allowed (from, to) location types for each action
const LOCATION_RULES: Record<
  MovementAction,
  { from: LocationType[] | null; to: LocationType[] | null }
> = {
  RECEIVE: {
    from: null, // no from (vendor is external)
    to: ['STORAGE'],
  },
  PUT_ON_SHELF: {
    from: ['STORAGE'],
    to: ['SHELF'],
  },
  TAKE_OFF_SHELF: {
    from: ['SHELF'],
    to: ['STORAGE', 'TRUCK'],
  },
  DELIVER_TO_STORE: {
    from: ['STORAGE', 'SHELF', 'TRUCK'],
    to: ['STORE'],
  },
  RETURN_FROM_STORE: {
    from: ['STORE'],
    to: ['STORAGE', 'TRUCK'],
  },
  CONVERT_BOX_TO_PACKS: {
    from: ['STORAGE', 'SHELF'], // box removed from here
    to: ['STORAGE', 'SHELF'],   // packs added here (same location)
  },
  SALE_RETAIL_PACK: {
    from: ['SHELF', 'STORAGE'],
    to: null, // leaves system
  },
  SALE_RETAIL_BOX: {
    from: ['SHELF', 'STORAGE'],
    to: null, // leaves system
  },
  ADJUSTMENT: {
    from: ['STORAGE', 'SHELF', 'TRUCK', 'STORE'], // any
    to: ['STORAGE', 'SHELF', 'TRUCK', 'STORE'],   // any
  },
};

export function validateLocationTypes(
  action: MovementAction,
  fromType: LocationType | null,
  toType: LocationType | null
): { valid: boolean; error?: string } {
  const rules = LOCATION_RULES[action];

  // Check "from" location
  if (rules.from === null) {
    // from should not be provided
    if (fromType !== null) {
      return { valid: false, error: `${action} should not have a source location` };
    }
  } else {
    if (fromType === null) {
      return { valid: false, error: `${action} requires a source location` };
    }
    if (!rules.from.includes(fromType)) {
      return {
        valid: false,
        error: `${action}: source must be ${rules.from.join(' or ')}, got ${fromType}`,
      };
    }
  }

  // Check "to" location
  if (rules.to === null) {
    if (toType !== null) {
      return { valid: false, error: `${action} should not have a destination location` };
    }
  } else {
    if (toType === null) {
      return { valid: false, error: `${action} requires a destination location` };
    }
    if (!rules.to.includes(toType)) {
      return {
        valid: false,
        error: `${action}: destination must be ${rules.to.join(' or ')}, got ${toType}`,
      };
    }
  }

  return { valid: true };
}

// Human-readable action labels for UI
export const ACTION_LABELS: Record<MovementAction, string> = {
  RECEIVE: 'Receive from Vendor',
  PUT_ON_SHELF: 'Put on Shelf',
  TAKE_OFF_SHELF: 'Take off Shelf',
  DELIVER_TO_STORE: 'Deliver to Store',
  RETURN_FROM_STORE: 'Return from Store',
  CONVERT_BOX_TO_PACKS: 'Convert Box → Packs',
  SALE_RETAIL_PACK: 'Sell Packs (Retail)',
  SALE_RETAIL_BOX: 'Sell Box (Retail)',
  ADJUSTMENT: 'Adjustment',
};

// Which actions are available based on scanned unit type
export function getActionsForUnit(unitType: 'BOX' | 'PACK'): MovementAction[] {
  if (unitType === 'BOX') {
    return [
      'PUT_ON_SHELF',
      'TAKE_OFF_SHELF',
      'DELIVER_TO_STORE',
      'RETURN_FROM_STORE',
      'CONVERT_BOX_TO_PACKS',
      'SALE_RETAIL_BOX',
      'RECEIVE',
    ];
  }
  // PACK
  return [
    'PUT_ON_SHELF',
    'TAKE_OFF_SHELF',
    'SALE_RETAIL_PACK',
  ];
}
