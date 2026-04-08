import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from './config/passport';
import { env } from './config/environment';
import routes from './routes';
import { errorHandler } from './middleware/error-handler';

const app = express();

// Middleware
app.use(cors({
  origin: env.clientUrl,
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: env.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: env.nodeEnv === 'production' },
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/v1', routes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
