import { getDb } from "@/lib/mongodb";

/**
 * Database optimization script for 100k concurrent users
 * Run this once to create proper indexes for optimal performance
 */
export async function optimizeDatabase() {
  try {
    console.log('🚀 Starting database optimization...');
    const db = await getDb();
    const collection = db.collection("places");

    // 1. Primary compound index for main queries
    console.log('📊 Creating primary compound index...');
    await collection.createIndex(
      { userEmail: 1, createdAt: -1, id: -1 },
      {
        name: "user_email_created_id",
        background: true,
        unique: false
      }
    );

    // 2. Unique index for place IDs
    console.log('📊 Creating unique ID index...');
    await collection.createIndex(
      { id: 1 },
      {
        name: "unique_place_id",
        unique: true,
        background: true
      }
    );

    // 3. Text search index for place names and tags
    console.log('📊 Creating text search index...');
    await collection.createIndex(
      {
        "tags.name": "text",
        "tags.description": "text",
        "area": "text"
      },
      {
        name: "places_text_search",
        background: true,
        weights: {
          "tags.name": 10,
          "area": 5,
          "tags.description": 3
        }
      }
    );

    // 4. Geospatial index for location-based queries
    console.log('📊 Creating geospatial index...');
    await collection.createIndex(
      { location: "2dsphere" },
      {
        name: "places_location_2dsphere",
        background: true
      }
    );

    // 5. Created date index for sorting
    console.log('📊 Creating date sorting index...');
    await collection.createIndex(
      { createdAt: -1 },
      {
        name: "created_at_desc",
        background: true
      }
    );

    // 6. User email index for filtering
    console.log('📊 Creating user email index...');
    await collection.createIndex(
      { userEmail: 1 },
      {
        name: "user_email_index",
        background: true,
        sparse: true
      }
    );

    // 7. Compound index for pagination
    console.log('📊 Creating pagination compound index...');
    await collection.createIndex(
      { createdAt: -1, id: -1 },
      {
        name: "pagination_compound",
        background: true
      }
    );

    // Get index statistics
    const indexes = await collection.indexes();
    console.log('✅ Database optimization completed!');
    console.log('📊 Created indexes:', indexes.length);
    console.log('📋 Index details:');
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });

    return {
      success: true,
      indexes: indexes.length,
      message: 'Database optimized for 100k concurrent users'
    };

  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    throw error;
  }
}

/**
 * Performance monitoring for database queries
 */
export async function monitorDatabasePerformance() {
  try {
    const db = await getDb();
    const admin = db.admin();

    // Get database stats
    const dbStats = await admin.serverStatus();

    // Get collection stats using aggregation
    const collectionStats = await db.collection("places").aggregate([
      { $collStats: { latencyStats: { histograms: true } } }
    ]).toArray();

    const stats = collectionStats[0] || {};

    return {
      databaseStats: {
        connections: dbStats.connections?.current || 0,
        memoryUsage: dbStats.mem?.resident || 0,
        operations: dbStats.opcounters || {},
        uptime: dbStats.uptime || 0
      },
      collectionStats: {
        count: stats.count || 0,
        size: stats.size || 0,
        avgObjSize: stats.avgObjSize || 0,
        indexes: stats.nindexes || 0,
        indexSize: stats.totalIndexSize || 0
      }
    };
  } catch (error) {
    console.error('Database monitoring error:', error);
    return null;
  }
}
