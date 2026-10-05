import { createApp } from './app.js';
import { config } from './config/env.js';

import { db } from './db/database.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 VAANI™ AI Interview & Assessment Backend Running!`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`🧠 AI Provider: ${config.aiProvider.toUpperCase()}`);
  console.log(
    `🐘 Database:    ${db.getEngineType() === 'neon' ? 'Neon Serverless PostgreSQL 🟢' : 'Local JSON File Store (Fallback) 🟡'}`
  );
  console.log(
    `🔑 Gemini Key:  ${config.geminiApiKey ? 'Configured ✅' : 'Mock/Fallback Active 🟡'}`
  );
  console.log(
    `🔑 Groq Key:    ${config.groqApiKey ? 'Configured ✅' : 'Not Set'}`
  );
  console.log(`=======================================================`);
});
