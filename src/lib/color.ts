import { interpolateRgb } from 'd3-interpolate';
import { scaleLinear, scalePow } from 'd3-scale';

/** Fire Radiative Power → incandescent color (cold orange → white-hot). */
export const frpColor = scalePow<string>()
  .exponent(0.5)
  .domain([0, 5, 25, 100, 500])
  .range(['#ff6b1a', '#ff9933', '#ffcc00', '#ffe066', '#fff4a3'])
  .interpolate(interpolateRgb)
  .clamp(true);

/** Acres → marker radius in pixels (sqrt scale so big fires aren't absurd). */
export const acresToRadius = scalePow<number>()
  .exponent(0.5)
  .domain([0, 100, 10_000, 100_000, 500_000])
  .range([3, 6, 12, 20, 32])
  .clamp(true);

/** Containment % → ring opacity (less contained = more vivid). */
export const containmentOpacity = scaleLinear<number>()
  .domain([0, 100])
  .range([1, 0.25])
  .clamp(true);

/** Detection age (ms) → opacity. Fresh = bright, old = faded. */
export const ageOpacity = scaleLinear<number>()
  .domain([0, 6 * 60 * 60 * 1000, 24 * 60 * 60 * 1000])
  .range([1, 0.7, 0.12])
  .clamp(true);
