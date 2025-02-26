import OpenAI from 'openai';
import { env } from '../config/env';

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, you should use a backend proxy
});