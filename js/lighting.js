(function (root) {
  'use strict';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  // Tanner Helland's approximation of black-body color in sRGB (1000–40000 K).
  function kelvinToRgb(kelvin) {
    const t = clamp(Number(kelvin), 2000, 7500) / 100;
    const warmGreen = clamp(99.4708025861 * Math.log(t) - 161.1195681661, 0, 255);
    const coolGreen = t > 60 ? clamp(288.1221695283 * Math.pow(t - 60, -0.0755148492), 0, 255) : warmGreen;
    // Blend the fitted green curves near their junction to remove a small discontinuity.
    const blend = clamp((t - 65) / 2, 0, 1);
    return [t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592),
      warmGreen * (1 - blend) + coolGreen * blend,
      t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307].map(v => Math.round(clamp(v, 0, 255)));
  }
  const validHex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  const hexToRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const baseRgb = s => s.mode === 'custom' ? hexToRgb(s.customColor) : kelvinToRgb(s.temperature);
  function displayColor(s) {
    return `rgb(${baseRgb(s).map(v => Math.round(v * clamp(s.intensity, 0, 100) / 100)).join(', ')})`;
  }
  root.Lighting = { clamp, kelvinToRgb, validHex, hexToRgb, baseRgb, displayColor };
})(globalThis);
