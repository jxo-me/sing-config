export type JsonSchema = Record<string, unknown>;

let cachedSchema: JsonSchema | null = null;

export async function loadSchema(): Promise<JsonSchema> {
  if (cachedSchema) return cachedSchema;
  // 在前端静态资源中查找占位 schema；后续可替换为正式大版本
  const resp = await fetch('/schema.json', { cache: 'no-store' });
  if (!resp.ok) throw new Error(`加载 schema 失败: ${resp.status}`);
  cachedSchema = (await resp.json()) as JsonSchema;
  return cachedSchema;
}

export function setSchemaForTest(schema: JsonSchema) {
  cachedSchema = schema;
}
