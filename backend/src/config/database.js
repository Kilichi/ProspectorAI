import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { Company } from '../models/Company.js';
import { Search } from '../models/Search.js';

export async function connectDatabase() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([Company.init(), Search.init()]);
  logger.info('Conexión con MongoDB establecida');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export function databaseStatus() {
  return mongoose.connection.readyState === 1 ? 'conectada' : 'desconectada';
}
