import app from './app';
import { env } from './config/environment';
import { sequelize } from './models';

async function bootstrap() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Sync models (creates tables if they don't exist)
    await sequelize.sync({ alter: env.nodeEnv === 'development' });
    console.log('Database synced.');

    // Seed default members if none exist
    const { Member } = await import('./models');
    const memberCount = await Member.count();
    if (memberCount === 0) {
      await Member.bulkCreate([
        { name: 'Alwin Kunjachan', email: 'alwin@example.com' },
        { name: 'Jane Smith', email: 'jane@example.com' },
        { name: 'Bob Johnson', email: 'bob@example.com' },
      ]);
      console.log('Default members seeded.');
    }

    // Check for expired cycles on startup
    const { cycleService } = await import('./services/cycle.service');
    const expired = await cycleService.checkExpiredCycles();
    if (expired > 0) console.log(`Auto-completed ${expired} expired cycle(s).`);

    // Check every hour
    setInterval(async () => {
      const count = await cycleService.checkExpiredCycles();
      if (count > 0) console.log(`Auto-completed ${count} expired cycle(s).`);
    }, 60 * 60 * 1000);

    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
