// =============================================================================
// TALLYO — Small shared icon/color helpers for category & wallet chips
// =============================================================================

export function iconBadge(icon, color, size = 38) {
  const wrap = document.createElement('div');
  wrap.className = 'list-icon';
  wrap.style.width = size + 'px';
  wrap.style.height = size + 'px';
  wrap.style.background = hexToSoft(color);
  wrap.style.color = color;
  wrap.innerHTML = `<i class="fas ${icon || 'fa-circle'}"></i>`;
  return wrap;
}

export function hexToSoft(hex) {
  if (!hex) return 'rgba(107,114,128,0.12)';
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  return `rgba(${r},${g},${b},0.14)`;
}

export const WALLET_ICONS = { cash: 'fa-money-bill-wave', bank: 'fa-building-columns', ewallet: 'fa-wallet', savings: 'fa-piggy-bank', other: 'fa-layer-group' };
