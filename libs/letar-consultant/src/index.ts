/**
 * @letar/letar-consultant — локальный MCP-консультант по монорепо letar.
 * Использует RAG (Qdrant + nomic-embed-text) + Ollama (qwen2.5-coder:14b).
 */

export {
  type ChatMessage,
  checkOllamaHealth,
  listOllamaModels,
  ollamaChat,
  type OllamaConfig,
  type OllamaResponse,
} from './llm.js'
export { buildMessages, type ConsultMode } from './prompt.js'
export { type CodeChunk, formatChunksForPrompt, retrieveChunks, type RetrieveConfig } from './retrieve.js'
export { createLetarConsultantServer, type LetarConsultantOptions } from './server.js'
