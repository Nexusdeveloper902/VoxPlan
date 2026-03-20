import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import tasksRouter from './routes/tasks';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Update CORS for production (consider restricting to your frontend URL)
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Ensure uploads folder exists (standard local path, can be overridden by env)
const UPLOADS_DIR = process.env.UPLOADS_DIR || 'uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/tasks', tasksRouter);

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
