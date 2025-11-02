export type JsonSchema = Record<string, unknown>;

let cachedSchema: JsonSchema | null = null;
let schemaFilePath: string | null = null;

/**
 * 设置 Schema 文件路径
 */
export function setSchemaFilePath(path: string) {
  schemaFilePath = path;
  // 路径变化时清除缓存，强制重新加载
  cachedSchema = null;
}

/**
 * 加载 Schema
 */
export async function loadSchema(customPath?: string): Promise<JsonSchema> {
  // 使用传入的路径，或使用设置的路径，或使用默认路径
  const path = customPath || schemaFilePath || '/schema.json';
  
  if (cachedSchema && !customPath && schemaFilePath === path) {
    return cachedSchema;
  }
  
  // 在前端静态资源中查找占位 schema；后续可替换为正式大版本
  const resp = await fetch(path, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`加载 schema 失败: ${resp.status}`);
  cachedSchema = (await resp.json()) as JsonSchema;
  
  // 更新路径
  if (customPath || !schemaFilePath) {
    schemaFilePath = path;
  }
  
  return cachedSchema;
}

export function setSchemaForTest(schema: JsonSchema) {
  cachedSchema = schema;
}
