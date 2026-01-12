// lib/database/connection.ts
import mongoose, { Mongoose } from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI environment variable')
}

// Define the cache type
interface MongooseCache {
  conn: Mongoose | null
  promise: Promise<Mongoose> | null
}

// Extend the global object type
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined
}

// Initialize cache
const cached: MongooseCache = global.mongoose || { conn: null, promise: null }

// Store cache globally only in development to prevent hot reload issues
if (process.env.NODE_ENV !== 'production') {
  global.mongoose = cached
}

export async function connectDB(): Promise<Mongoose> {
  // Return cached connection if available
  if (cached.conn) {
    return cached.conn
  }

  // Create new connection promise if not exists
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    // TypeScript now knows MONGODB_URI is a string because of the earlier check
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}