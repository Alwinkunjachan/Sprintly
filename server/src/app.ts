import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/error-handler';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1', routes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
