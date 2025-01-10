interface Env {
  OPENAI_API_KEY: string;
}

export const env: Env = {
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
};