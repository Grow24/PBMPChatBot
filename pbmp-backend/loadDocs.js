const { DataAPIClient } = require('@datastax/astra-db-ts');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const {
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  PBMP_ASTRA_DB_COLLECTION,
  GEMINI_API_KEY
} = process.env;

// Validate required environment variables
if (!ASTRA_DB_API_ENDPOINT || !ASTRA_DB_APPLICATION_TOKEN || !PBMP_ASTRA_DB_COLLECTION || !GEMINI_API_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('Required: ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN, PBMP_ASTRA_DB_COLLECTION, GEMINI_API_KEY');
  process.exit(1);
}

// Initialize Gemini Embeddings (768 dimensions)
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: GEMINI_API_KEY,
  modelName: "embedding-001",
});

// Initialize AstraDB client
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT);

// Text splitter for chunking documents
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 768,      // Increase from 512 for more context per chunk
  chunkOverlap: 150,   // Increase overlap for better continuity
  separators: ['\n\n', '\n', '. ', ' ', '']  // Better splitting strategy
});

// Read HBMP Knowledge Base from file
function loadHBMPKnowledgeBase() {
  try {
    const filePath = path.join(__dirname, 'hbmpKB.txt');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Split content by major sections (numbered headings)
    const sections = content.split(/(?=^\d+\.\s)/gm).filter(s => s.trim().length > 0);

    return sections.map((section, index) => {
      const lines = section.trim().split('\n');
      const title = lines[0].replace(/^\d+\.\s*/, '').trim();
      const sectionContent = lines.slice(1).join('\n').trim();

      return {
        title: title || `HBMP Knowledge Section ${index + 1}`,
        content: section.trim()
      };
    });
  } catch (error) {
    console.error('Error reading knowledge base file:', error.message);
    return [];
  }
}

async function loadDocuments() {
  try {
    console.log('🚀 Starting PBMP document loading...\n');

    // Load knowledge base from file
    console.log('📖 Reading HBMP Knowledge Base from hbmpKB.txt...');
    const kbDocs = loadHBMPKnowledgeBase();

    if (kbDocs.length === 0) {
      console.error('❌ No documents found in knowledge base file!');
      process.exit(1);
    }

    console.log(`✅ Loaded ${kbDocs.length} sections from knowledge base\n`);

    // Get collection
    console.log(`📚 Connecting to collection: ${PBMP_ASTRA_DB_COLLECTION}`);
    const collection = await db.collection(PBMP_ASTRA_DB_COLLECTION);

    let totalChunks = 0;
    let successCount = 0;

    for (const doc of kbDocs) {
      console.log(`\n📄 Processing: ${doc.title}`);

      // Combine title and content
      const fullText = `${doc.title}\n\n${doc.content}`;

      // Split into chunks
      const chunks = await splitter.createDocuments([fullText]);
      console.log(`   ✂️  Split into ${chunks.length} chunks`);

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        totalChunks++;

        try {
          // Generate embedding
          const embedding = await embeddings.embedQuery(chunk.pageContent);

          // Insert into AstraDB
          await collection.insertOne({
            text: chunk.pageContent,
            source: doc.title,
            $vector: embedding,
            metadata: {
              title: doc.title,
              chunkIndex: i,
              totalChunks: chunks.length,
              createdAt: new Date().toISOString()
            }
          });

          successCount++;
          console.log(`   ✅ Chunk ${i + 1}/${chunks.length} inserted`);

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`   ❌ Error inserting chunk ${i + 1}:`, error.message);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Document loading complete!');
    console.log(`📊 Total chunks processed: ${totalChunks}`);
    console.log(`✅ Successfully inserted: ${successCount}`);
    console.log(`❌ Failed: ${totalChunks - successCount}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error loading documents:', error);
    process.exit(1);
  }
}

// Run the loading script
loadDocuments();
