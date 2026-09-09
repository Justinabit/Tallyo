// =============================================================================
// TALLYO — AI Configuration
// =============================================================================
// Centralized place describing how the frontend talks to AI features.
// The frontend NEVER calls the AI provider directly and NEVER holds an AI
// API key — that key lives only on the server (Cloudflare Worker secret
// AI_API_KEY) and is used inside src/index.tsx's /api/ai/insights route.
//
// This file only defines the endpoint the frontend is allowed to call.
// =============================================================================

export const AI_CONFIG = {
  insightsEndpoint: '/api/ai/insights'
};
