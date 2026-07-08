/**
 * Centralized configuration for server-side environments.
 * This file handles parsing and providing default values for environment variables.
 */

export const serverConfig = {
  get apiUrl() {
    return (
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:4000/api"
    );
  },

  get apiKey() {
    return (
      process.env.API_KEY ||
      process.env.NEXT_PUBLIC_API_KEY ||
      "YOUR_SECURE_API_KEY_HERE"
    );
  },

  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
