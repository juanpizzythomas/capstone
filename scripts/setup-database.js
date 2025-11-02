
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = {
  host: 'localhost',
  port: 5432,
  database: 'postgres', // Connect to default database first
  user: 'postgres',
  password: 'password' // Change this to your PostgreSQL password
};

async function setupDatabase() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Create database if not exists
    try {
      await client.query('CREATE DATABASE attendance_system');
      console.log('Database "attendance_system" created');
    } catch (error) {
      if (error.code === '42P04') {
        console.log('Database "attendance_system" already exists');
      } else {
        throw error;
      }
    }

    await client.end();

    // Connect to the new database and run schema
    const dbClient = new Client({
      ...config,
      database: 'attendance_system'
    });

    await dbClient.connect();
    console.log('Connected to attendance_system database');

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await dbClient.query(schema);
    console.log('Schema executed successfully');

    // Read and execute sample data if exists
    const sampleDataPath = path.join(__dirname, '../database/sample_data.sql');
    if (fs.existsSync(sampleDataPath)) {
      const sampleData = fs.readFileSync(sampleDataPath, 'utf8');
      await dbClient.query(sampleData);
      console.log('Sample data inserted successfully');
    }

    await dbClient.end();
    console.log('Database setup completed!');

  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
