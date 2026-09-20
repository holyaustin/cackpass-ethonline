// lib/admin/permissions.ts

export const PERMISSIONS = {
  VIEW_ANCHORS:      'view:anchors',
  RUN_ANCHOR:        'run:anchor',
  VIEW_PAYMENTS:     'view:payments',
  PAUSE_CONTRACT:    'contract:pause',
  UNPAUSE_CONTRACT:  'contract:unpause',
  UPDATE_OWNER:      'contract:update-owner',       // ✅ NEW
  UPDATE_PROCESSOR:  'contract:update-processor',   // ✅ NEW
  MANAGE_ADMINS:     'admins:manage',
  VIEW_AUDIT_LOG:    'audit:view',
  REINDEX_DB:        'db:reindex',
  PURGE_OLD_PAYMENTS:'db:purge',
  VIEW_ANALYTICS:    'view:analytics',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

export const SUPER_ADMIN_EMAIL =
  (process.env.SUPER_ADMIN_EMAIL || 'holyaustin@gmail.com').toLowerCase()

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS)