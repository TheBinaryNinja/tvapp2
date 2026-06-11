import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface AppConfig {
  mongoUri: string;
  port: number;
  logLevel: string;
}

const VALID_SCHEMES = /^mongodb(\+srv)?:\/\//;

function resolveConfigPath(): string {
  const envPath = process.env.TVAPP2_CONFIG;
  if (envPath) {
    if (!existsSync(envPath)) {
      throw new Error(`TVAPP2_CONFIG points to "${envPath}" but the file does not exist.`);
    }
    return envPath;
  }
  const localPath = resolve(process.cwd(), 'config.local.json');
  if (existsSync(localPath)) return localPath;

  throw new Error(
    'No config file found. Set TVAPP2_CONFIG to the mounted config path, ' +
      'or create ./config.local.json for development.',
  );
}

export function loadConfig(): AppConfig {
  const path = resolveConfigPath();
  const raw = readFileSync(path, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Config file at "${path}" is not valid JSON: ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Config file at "${path}" must be a JSON object.`);
  }
  const obj = parsed as Record<string, unknown>;

  const mongoUri = obj.mongoUri;
  if (typeof mongoUri !== 'string' || !VALID_SCHEMES.test(mongoUri)) {
    throw new Error(
      `Config "mongoUri" must be a string starting with mongodb:// or mongodb+srv:// (got ${JSON.stringify(mongoUri)}).`,
    );
  }

  const port = typeof obj.port === 'number' ? obj.port : 3000;
  const logLevel = typeof obj.logLevel === 'string' ? obj.logLevel : 'info';

  return { mongoUri, port, logLevel };
}
