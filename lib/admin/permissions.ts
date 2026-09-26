// lib/admin/permissions.ts

// ─────────────────────────────────────────────────────────────
// Permissions enum
// ─────────────────────────────────────────────────────────────
export const PERMISSIONS = {
  VIEW_ATTENDEES:   'view:attendees',
  VIEW_ANALYTICS:   'view:analytics',
  VIEW_ANCHORS:     'view:anchors',
  VIEW_PAYMENTS:    'view:payments',
  RUN_ANCHOR:       'run:anchor',
  PAUSE_CONTRACT:   'contract:pause',
  UNPAUSE_CONTRACT: 'contract:unpause',
  UPDATE_OWNER:     'contract:update-owner',
  UPDATE_PROCESSOR: 'contract:update-processor',
  MANAGE_ADMINS:    'admins:manage',
  VIEW_AUDIT_LOG:   'audit:view',
  REINDEX_DB:       'db:reindex',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// ─────────────────────────────────────────────────────────────
// Super admin (hard-coded, non-revocable)
// ─────────────────────────────────────────────────────────────
export const SUPER_ADMIN_EMAIL = 'holyaustin@gmail.com'

// ─────────────────────────────────────────────────────────────
// All permissions (used to grant super admin full access)
// ─────────────────────────────────────────────────────────────
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS)

// ─────────────────────────────────────────────────────────────
// Friendly labels for the super-admin UI checkbox list
// ─────────────────────────────────────────────────────────────
export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.VIEW_ATTENDEES]:   'View event attendees',
  [PERMISSIONS.VIEW_ANALYTICS]:   'View analytics',
  [PERMISSIONS.VIEW_ANCHORS]:     'View anchors',
  [PERMISSIONS.VIEW_PAYMENTS]:    'View payment lookups',
  [PERMISSIONS.RUN_ANCHOR]:       'Run anchor batcher',
  [PERMISSIONS.PAUSE_CONTRACT]:   'Pause contract',
  [PERMISSIONS.UNPAUSE_CONTRACT]: 'Unpause contract',
  [PERMISSIONS.UPDATE_OWNER]:     'Update contract owner',
  [PERMISSIONS.UPDATE_PROCESSOR]: 'Update payment processor',
  [PERMISSIONS.MANAGE_ADMINS]:    'Manage admins',
  [PERMISSIONS.VIEW_AUDIT_LOG]:   'View audit log',
  [PERMISSIONS.REINDEX_DB]:       'Run DB housekeeping',
}

// ─────────────────────────────────────────────────────────────
// Optional: group permissions for the super-admin UI
// ─────────────────────────────────────────────────────────────
export const PERMISSION_GROUPS: Record<string, Permission[]> = {
  'Data Access': [
    PERMISSIONS.VIEW_ATTENDEES,
    PERMISSIONS.VIEW_PAYMENTS,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  'Anchors': [
    PERMISSIONS.VIEW_ANCHORS,
    PERMISSIONS.RUN_ANCHOR,
  ],
  'Contract Control': [
    PERMISSIONS.PAUSE_CONTRACT,
    PERMISSIONS.UNPAUSE_CONTRACT,
    PERMISSIONS.UPDATE_OWNER,
    PERMISSIONS.UPDATE_PROCESSOR,
  ],
  'Administration': [
    PERMISSIONS.MANAGE_ADMINS,
    PERMISSIONS.VIEW_AUDIT_LOG,
  ],
  'Database': [
    PERMISSIONS.REINDEX_DB,
  ],
}

// ─────────────────────────────────────────────────────────────
// Risk levels (for future UI use — colour-code dangerous ops)
// ─────────────────────────────────────────────────────────────
export const PERMISSION_RISK: Record<Permission, 'low' | 'medium' | 'high'> = {
  [PERMISSIONS.VIEW_ATTENDEES]:   'low',
  [PERMISSIONS.VIEW_ANALYTICS]:   'low',
  [PERMISSIONS.VIEW_ANCHORS]:     'low',
  [PERMISSIONS.VIEW_PAYMENTS]:    'medium',
  [PERMISSIONS.RUN_ANCHOR]:       'medium',
  [PERMISSIONS.PAUSE_CONTRACT]:   'high',
  [PERMISSIONS.UNPAUSE_CONTRACT]: 'high',
  [PERMISSIONS.UPDATE_OWNER]:     'high',
  [PERMISSIONS.UPDATE_PROCESSOR]: 'high',
  [PERMISSIONS.MANAGE_ADMINS]:    'high',
  [PERMISSIONS.VIEW_AUDIT_LOG]:   'low',
  [PERMISSIONS.REINDEX_DB]:       'low',
}