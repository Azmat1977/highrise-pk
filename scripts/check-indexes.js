//C:\dev\highrise-pk\scripts\check-indexes.js
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkIndexes() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL;
    if (!MONGODB_URI) {
  throw new Error('❌ MONGODB_URI not defined in environment variables');
}
    
    console.log('🔗 Connecting to MongoDB...\n');
    await mongoose.connect(MONGODB_URI);
    
    const collection = mongoose.connection.db.collection('blogs');
    const indexes = await collection.indexes();
    
    console.log('📋 All Indexes on blogs collection:\n');
    
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}`);
      
      // Show details for text index
      if (index.key && index.key._fts === 'text') {
        console.log('   Type: Text Search Index');
        if (index.weights) {
          console.log('   Weights:', JSON.stringify(index.weights, null, 6));
        }
        if (index.default_language) {
          console.log('   Language:', index.default_language);
        }
      }
      console.log('');
    });
    
    await mongoose.disconnect();
    console.log('✅ Done!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkIndexes();