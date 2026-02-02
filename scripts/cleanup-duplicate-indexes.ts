// scripts/cleanup-duplicate-indexes.ts
import { cleanupDuplicateIndexes, checkAndFixCommonDuplicates } from '@/lib/database/cleanupIndexes'

async function main() {
  console.log('🚀 Starting duplicate index cleanup...\n')
  
  try {
    // Run both cleanup functions
    await cleanupDuplicateIndexes()
    console.log('\n---\n')
    await checkAndFixCommonDuplicates()
    
    console.log('\n✅ Cleanup completed successfully!')
    console.log('🔄 Please restart your Next.js dev server.')
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  }
}

main()