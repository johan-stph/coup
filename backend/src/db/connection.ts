import mongoose from 'mongoose';
import { MONGO_URI } from '../constants/environmentVariables';
import logger from '../utils/logger/logger';

export async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}
