import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI1;
if (!uri) {
  throw new Error("MONGODB_URI1 is not set. Add it to your .env.local");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Enhanced MongoDB connection options for high concurrency
const mongoOptions = {
  maxPoolSize: 100, // Maximum 100 concurrent connections
  minPoolSize: 10,  // Minimum 10 connections
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // 5 second timeout
  socketTimeoutMS: 45000, // 45 second socket timeout
  retryWrites: true,
  retryReads: true,
  readPreference: 'secondaryPreferred' as const,
  compressors: ['zlib'] as ('zlib' | 'none' | 'snappy' | 'zstd')[],
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
};

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, mongoOptions);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise!;
} else {
  client = new MongoClient(uri, mongoOptions);
  clientPromise = client.connect();
}

export async function getDb(dbName?: string): Promise<Db> {
  try {
    const client = await clientPromise;
    const name = dbName || process.env.MONGODB_DB || "manchitra";
    return client.db(name);
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw new Error("Database connection failed");
  }
}

// Health check function for load balancer
export async function checkDbHealth(): Promise<boolean> {
  try {
    const db = await getDb();
    await db.admin().ping();
    return true;
  } catch {
    return false;
  }
}
