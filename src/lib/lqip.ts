/**
 * LQIP（低质量图片占位）工具。
 *
 * Soft Ice 主题下占位统一用冰蓝 CSS 变量，不再按原图采样粉/棕/暖色，
 * 避免列表卡片、头图在加载前后闪出旧樱色块。
 */

/** 冰蓝占位渐变：跟随 light/dark 的 --placeholder / --muted / --accent */
const ICE_LQIP_GRADIENT = 'linear-gradient(135deg, hsl(var(--placeholder)) 0%, hsl(var(--muted)) 55%, hsl(var(--accent)) 100%)';

/**
 * 返回可直接写在 style 上的 background-image。
 */
export function getLqipStyle(_imagePath: string): string {
  return `background-image:${ICE_LQIP_GRADIENT}`;
}

/**
 * 组件用占位 props：冰蓝渐变 + fallback class（保证无渐变时也有底色）。
 */
export function getLqipProps(_imagePath: string): { style: string; class: string } {
  return { style: getLqipStyle(_imagePath), class: 'lqip-fallback' };
}
