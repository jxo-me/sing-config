import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { loadSchema } from './schema';

let ajvInstance: Ajv | null = null;

async function getAjv(): Promise<Ajv> {
  if (ajvInstance) return ajvInstance;
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = await loadSchema();
  ajv.addSchema(schema, 'sing-box');
  ajvInstance = ajv;
  return ajvInstance;
}

export type ValidationResult = {
  valid: boolean;
  errors: { path: string; message: string }[];
};

export async function validateConfig(config: unknown): Promise<ValidationResult> {
  const ajv = await getAjv();
  const validate = ajv.getSchema('sing-box') || ajv.compile(await loadSchema());
  const valid = validate(config) as boolean;
  const errors = (validate.errors || []).map(formatError);
  return { valid, errors };
}

function formatError(err: ErrorObject): { path: string; message: string } {
  const path = err.instancePath || (err.params && (err.params as any).missingProperty) || '';
  return { path: String(path), message: err.message || 'Invalid' };
}
