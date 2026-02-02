// lib/database/cleanupIndexes.ts
import mongoose from 'mongoose'
import { connectDB } from './connection'

interface DuplicateIndex {
  name?: string
  key: { [key: string]: mongoose.mongo.IndexDirection }
}

export async function cleanupDuplicateIndexes() {
  try {
    await connectDB()
    
    // Check if connection is established
    if (!mongoose.connection.db) {
      console.error('MongoDB connection not established')
      return
    }
    
    console.log('=== Starting duplicate index cleanup ===')
    
    // List of collections to check
    const collections = [
      'users', 'events', 'payments', 'mytickets', 'wallettransactions',
      'gaslessapprovals', 'backendsigners', 'orders', 'tickettypes'
    ]
    
    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName)
        const indexes = await collection.indexes()
        
        console.log(`\n=== Indexes for ${collectionName} ===`)
        console.log(`Total indexes: ${indexes.length}`)
        
        const indexMap = new Map<string, string | undefined>()
        const duplicates: DuplicateIndex[] = []
        
        for (const index of indexes) {
          const key = JSON.stringify(index.key)
          if (indexMap.has(key)) {
            duplicates.push({ name: index.name, key: index.key })
          } else {
            indexMap.set(key, index.name)
          }
        }
        
        if (duplicates.length > 0) {
          console.log(`Found ${duplicates.length} duplicate indexes:`)
          for (const dup of duplicates) {
            console.log(`  - ${dup.name || 'unnamed'}: ${JSON.stringify(dup.key)}`)
            
            // Drop duplicate indexes (keep only one)
            if (dup.name && dup.name !== '_id_' && !dup.name.startsWith('_')) {
              console.log(`    Dropping duplicate index: ${dup.name}`)
              try {
                await collection.dropIndex(dup.name)
                console.log(`    ✓ Successfully dropped ${dup.name}`)
              } catch (dropError: any) {
                console.log(`    ✗ Failed to drop ${dup.name}: ${dropError.message}`)
              }
            } else if (!dup.name) {
              console.log(`    Skipping unnamed index`)
            }
          }
        } else {
          console.log('No duplicate indexes found.')
        }
      } catch (error: any) {
        // Collection might not exist yet
        if (error.code === 26 || error.message.includes('not found')) {
          console.log(`Collection ${collectionName} doesn't exist yet, skipping...`)
        } else {
          console.log(`Error processing ${collectionName}: ${error.message}`)
        }
      }
    }
    
    console.log('\n=== Duplicate index cleanup complete ===')
    
  } catch (error: any) {
    console.error('Error cleaning up indexes:', error)
  }
}

// Helper function to check and fix specific duplicate indexes
export async function checkAndFixCommonDuplicates() {
  if (!mongoose.connection.db) {
    console.error('MongoDB connection not established')
    return
  }
  
  const commonDuplicatePatterns = [
    { collection: 'events', field: 'onChainId' },
    { collection: 'payments', field: 'paymentReference' },
    { collection: 'mytickets', field: 'ticketNumber' },
    { collection: 'payments', field: 'transactionHash' },
    { collection: 'payments', field: 'approvalId' },
    { collection: 'backendsigners', field: 'address' },
    { collection: 'users', field: 'privyId' },
  ]
  
  for (const pattern of commonDuplicatePatterns) {
    try {
      const collection = mongoose.connection.db.collection(pattern.collection)
      const indexes = await collection.indexes()
      
      // Find indexes on this field
      const fieldIndexes = indexes.filter(index => 
        index.name && 
        index.name !== '_id_' && 
        Object.keys(index.key).includes(pattern.field)
      )
      
      if (fieldIndexes.length > 1) {
        console.log(`Found ${fieldIndexes.length} indexes on ${pattern.collection}.${pattern.field}:`)
        
        // Keep the first one, drop the rest
        for (let i = 1; i < fieldIndexes.length; i++) {
          const index = fieldIndexes[i]
          if (index.name) {
            console.log(`  Dropping duplicate: ${index.name}`)
            try {
              await collection.dropIndex(index.name)
              console.log(`  ✓ Dropped ${index.name}`)
            } catch (error: any) {
              console.log(`  ✗ Failed to drop ${index.name}: ${error.message}`)
            }
          }
        }
      }
    } catch (error: any) {
      if (error.code !== 26) { // Not "Namespace not found"
        console.log(`Error checking ${pattern.collection}: ${error.message}`)
      }
    }
  }
}

// Run cleanup from command line
if (require.main === module) {
  (async () => {
    await cleanupDuplicateIndexes()
    await checkAndFixCommonDuplicates()
    console.log('\n✅ All cleanup operations completed!')
    process.exit(0)
  })().catch(error => {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  })
}