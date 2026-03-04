/**
 * 模型 → max_tokens 映射配置
 */

export const MODEL_MAX_TOKENS: Record<string, number> = {
  // OpenAI
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-4': 8192,
  'gpt-3.5-turbo': 16385,
  'o1': 200000,
  'o1-mini': 128000,
  'o1-preview': 128000,
  'o3-mini': 200000,
  // Claude
  'claude-3-opus': 4096,
  'claude-3-sonnet': 4096,
  'claude-3-haiku': 4096,
  'claude-3.5-sonnet': 8192,
  'claude-3.5-haiku': 8192,
  'claude-4-sonnet': 16384,
  'claude-4-opus': 32768,
  // DeepSeek
  'deepseek-chat': 65536,
  'deepseek-reasoner': 65536,
  'deepseek-v3': 65536,
  // Gemini
  'gemini-pro': 32768,
  'gemini-1.5-pro': 1048576,
  'gemini-1.5-flash': 1048576,
  'gemini-2.0-flash': 1048576,
  // Qwen
  'qwen-turbo': 131072,
  'qwen-plus': 131072,
  'qwen-max': 32768,
  // GLM
  'glm-4': 128000,
  'glm-4-flash': 128000,
};

/**
 * 根据模型 ID 获取最大 tokens 数，支持模糊前缀匹配。
 * 未知模型返回 4096。
 */
export function getModelMaxTokens(modelId: string): number {
  // 精确匹配
  if (MODEL_MAX_TOKENS[modelId]) return MODEL_MAX_TOKENS[modelId];

  // 前缀模糊匹配（按 key 长度降序，优先匹配更精确的前缀）
  const keys = Object.keys(MODEL_MAX_TOKENS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (modelId.startsWith(key)) return MODEL_MAX_TOKENS[key];
  }

  return 4096;
}
