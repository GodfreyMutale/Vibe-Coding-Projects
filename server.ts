import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeEmailWithGemini } from './src/server/geminiAnalyzer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

app.post('/api/analyze-email', async (req, res) => {
  try {
    const result = await analyzeEmailWithGemini(req.body);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    res.status(500).json({ error: message });
  }
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {});
