// lib/admin/permissions.ts

export const PERMISSIONS = {
  // Anchor / registry
  VIEW_ANCHORS:      'view:anchors',
  RUN_ANCHOR:        'run:anchor',
  VIEW_PAYMENTS:     'view:payments',

  // Contract admin
  PAUSE_CONTRACT:    'contract:pause',
  UNPAUSE_CONTRACT:  'contract:unpause',

  // Admin management (super-admin only)
  MANAGE_ADMINS:     'admins:manage',
  VIEW_AUDIT_LOG:    'audit:view',

  // Housekeeping
  REINDEX_DB:        'db:reindex',
  PURGE_OLD_PAYMENTS:'db:purge',
  SEND_TEST_EMAIL:   'email:test',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

export const SUPER_ADMIN_EMAIL =
  (process.env.SUPER_ADMIN_EMAIL || 'holyaustin@gmail.com').toLowerCase()

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS)

// Labels + descriptions for the super-admin UI
export const PERMISSION_META: Record<Permission, { label: string; description: string; risk: 'low' | 'medium' | 'high' }> = {
  [PERMISSIONS.VIEW_ANCHORS]:       { label: 'View Anchors',       description: 'See anchored batches and proofs',                 risk: 'low' },
  [PERMISSIONS.RUN_ANCHOR]:         { label: 'Run Anchor',         description: 'Trigger the fiat anchor batcher manually',         risk: 'medium' },
  [PERMISSIONS.VIEW_PAYMENTS]:      { label: 'View Payments',      description: 'Browse all USDC and fiat payment records',         risk: 'medium' },
  [PERMISSIONS.PAUSE_CONTRACT]:     { label: 'Pause Contract',     description: 'Pause all writes to the registry contract',        risk: 'high' },
  [PERMISSIONS.UNPAUSE_CONTRACT]:   { label: 'Unpause Contract',   description: 'Resume writes to the registry contract',           risk: 'high' },
  [PERMISSIONS.MANAGE_ADMINS]:      { label: 'Manage Admins',      description: 'Grant/revoke admin roles and set permissions',     risk: 'high' },
  [PERMISSIONS.VIEW_AUDIT_LOG]:     { label: 'View Audit Log',     description: 'Read the admin action log',                        risk: 'low' },
  [PERMISSIONS.REINDEX_DB]:         { label: 'Reindex DB',         description: 'Ensure all MongoDB indexes exist',                 risk: 'low' },
  [PERMISSIONS.PURGE_OLD_PAYMENTS]: { label: 'Purge Old Payments', description: 'Delete payments older than a threshold',           risk: 'high' },
  [PERMISSIONS.SEND_TEST_EMAIL]:    { label: 'Send Test Email',    description: 'Trigger a test email via the configured provider', risk: 'low' },
}