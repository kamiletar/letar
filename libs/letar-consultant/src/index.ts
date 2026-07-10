/**
 * @letar/letar-consultant — локальный MCP-консультант по монорепо letar.
 * Использует RAG (Qdrant + nomic-embed-text) + Ollama (qwen2.5-coder:14b).
 */

export {
  checkOllamaHealth,
  listOllamaModels,
  ollamaChat,
  type ChatMessage,
  type OllamaConfig,
  type OllamaResponse,
} from './llm.js'
export { buildMessages, type ConsultMode } from './prompt.js'
export { formatChunksForPrompt, retrieveChunks, type CodeChunk, type RetrieveConfig } from './retrieve.js'
export { createLetarConsultantServer, type LetarConsultantOptions } from './server.js'
