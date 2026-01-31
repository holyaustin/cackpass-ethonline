import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectDB } from '@/lib/database/connection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, userId } = body;

    if (!eventId || !userId) {
      return NextResponse.json(
        { error: 'Missing event ID or user ID' },
        { status: 400 }
      );
    }

    // Connect to database
    const { db } = await connectDB();

    // Check if event exists
    const event = await db.collection('events').findOne({
      _id: new ObjectId(eventId)
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if already favorited
    const existing = await db.collection('favorites').findOne({
      userId,
      eventId: new ObjectId(eventId)
    });

    let isFavorite;
    let action;

    if (existing) {
      // Remove favorite
      await db.collection('favorites').deleteOne({
        _id: existing._id
      });
      isFavorite = false;
      action = 'removed';
    } else {
      // Add favorite
      await db.collection('favorites').insertOne({
        userId,
        eventId: new ObjectId(eventId),
        addedAt: new Date()
      });
      isFavorite = true;
      action = 'added';
    }

    return NextResponse.json({
      success: true,
      isFavorite,
      action,
      event: {
        id: eventId,
        title: event.title
      }
    });

  } catch (error: any) {
    console.error('Favorite error:', error);
    return NextResponse.json(
      { error: 'Failed to update favorite' },
      { status: 500 }
    );
  }
}