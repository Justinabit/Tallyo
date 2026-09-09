// =============================================================================
// TALLYO — Chart helpers (thin wrapper around Chart.js, loaded via CDN)
// =============================================================================
// All numeric values passed here are ALREADY calculated (see utils/calculations.js).
// Charts only visualize data — they never compute it.
// =============================================================================
import { formatMoney } from '../utils/currency.js';

const registry = new Map();

function destroyIfExists(canvas) {
  const existing = registry.get(canvas);
  if (existing) { existing.destroy(); registry.delete(canvas); }
}

// Pages replace their content wholesale on every reload/period-change
// (content.innerHTML = ''), which throws away the old <canvas> elements.
// Because the registry above is keyed by canvas identity, a brand-new
// canvas never matches the old one, so the old Chart.js instance (and its
// internal animation loop + window resize listener) was never destroyed —
// it just kept running in the background forever. Over a long session this
// piles up dozens of "zombie" charts, which is what caused the dashboard/
// reports animations to visibly glitch the longer the tab stayed open.
//
// Call this on any container BEFORE wiping its innerHTML, so every chart
// still actually in the DOM at that moment gets destroyed first.
export function destroyChartsIn(container) {
  if (!container) return;
  container.querySelectorAll('canvas').forEach((canvas) => destroyIfExists(canvas));
}

export function drawDonut(canvas, rows) {
  destroyIfExists(canvas);
  if (!rows.length) return null;
  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: rows.map((r) => r.name),
      datasets: [{ data: rows.map((r) => r.amount), backgroundColor: rows.map((r) => r.color), borderWidth: 0 }]
    },
    options: {
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatMoney(ctx.raw)}` } }
      }
    }
  });
  registry.set(canvas, chart);
  return chart;
}

export function drawBar(canvas, { labels, income, expense }) {
  destroyIfExists(canvas);
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Income', data: income, backgroundColor: '#16A34A', borderRadius: 6, maxBarThickness: 22 },
        { label: 'Expense', data: expense, backgroundColor: '#E11D2E', borderRadius: 6, maxBarThickness: 22 }
      ]
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle' } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(150,150,150,0.12)' }, ticks: { callback: (v) => formatMoney(v).replace('.00', '') } }
      }
    }
  });
  registry.set(canvas, chart);
  return chart;
}

export function drawLine(canvas, { labels, series }) {
  destroyIfExists(canvas);
  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: series.map((s) => ({
        label: s.label, data: s.data, borderColor: s.color, backgroundColor: s.color + '22',
        fill: true, tension: 0.35, pointRadius: 3, pointBackgroundColor: s.color
      }))
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle' } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(150,150,150,0.12)' }, ticks: { callback: (v) => formatMoney(v).replace('.00', '') } }
      }
    }
  });
  registry.set(canvas, chart);
  return chart;
}
