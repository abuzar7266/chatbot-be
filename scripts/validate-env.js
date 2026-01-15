/**
 * Pre-build environment variable validation script
 * Run this before building to catch missing environment variables early
 */

const fs = require('fs');
const path = require('path');

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_DB_URL',
];

const optionalEnvVars = {
  NODE_ENV: 'development',
  PORT: '3000',
  THROTTLE_TTL: '60',
  THROTTLE_LIMIT: '10',
  CACHE_TTL: '300',
  CACHE_MAX: '100',
  JWT_SECRET: '',
  JWT_EXPIRES_IN: '1d',
};

function validateEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  
  let envVars = {};
  
  // Load .env.local first (higher priority)
  if (fs.existsSync(envLocalPath)) {
    const envLocalContent = fs.readFileSync(envLocalPath, 'utf8');
    envLocalContent.split('\n').forEach((line) => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    });
  }
  
  // Load .env (lower priority)
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        if (!envVars[key]) {
          envVars[key] = match[2].trim();
        }
      }
    });
  }
  
  // Check process.env for any missing values
  requiredEnvVars.forEach((varName) => {
    if (!envVars[varName] && !process.env[varName]) {
      throw new Error(
        `❌ Missing required environment variable: ${varName}\n` +
        `Please set ${varName} in your .env file or environment variables.\n` +
        `See env.example for reference.`
      );
    }
  });
  
  console.log('✅ Environment variables validation passed');
  return true;
}

try {
  validateEnv();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

