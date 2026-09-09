// =============================================================================
// TALLYO — AI Insights Service
// =============================================================================
// Modular wrapper around the backend AI proxy (see AI_CONFIG.insightsEndpoint
// and src/index.tsx). This is the ONLY function that talks to the AI feature.
// If it fails or AI isn't configured, callers get a graceful fallback array —
// the rest of the app must keep working normally either way.
// =============================================================================
import { AI_CONFIG } from '../config/ai.js';

export async function getAiInsights({ summary, categories, period, comparisons }) {
  try {
    const res = await fetch(AI_CONFIG.insightsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary, categories, period, comparisons })
    });
    const data = await res.json();
    if (data.ok && Array.isArray(data.insights)) {
      return { available: true, insights: data.insights };
    }
    return { available: false, insights: [], message: data.message };
  } catch (err) {
    return {
      available: false,
      insights: [],
      message: 'AI insights are temporarily unavailable. Your financial calculations and tracking are still working normally.'
    };
  }
}
