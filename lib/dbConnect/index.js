import { MongoClient } from "mongodb";

// Global variable to store the database connection
let cachedDb = null;

export async function connectToDatabase(uri) {
  // Check if we have a cached connection available
  if (cachedDb) {
    // Use the cached connection
    return cachedDb;
  }

  // If no cached connection, create a new one
  const client = new MongoClient(uri, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  });

  // Connect to MongoDB
  await client.connect();

  // Select the database using the URI
  const dbName = new URL(uri).pathname.substr(1);
  const db = client.db(dbName);

  // Cache the database connection for future reuse and return it
  cachedDb = db;
  return db;
}
