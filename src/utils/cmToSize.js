import { sizeChart } from '../data/sizeChart.js'

export const SIZE_FOOT_LENGTH_PADDING_CM = 0.5

export function cmToSize(footLengthCm) {
  if (!Number.isFinite(footLengthCm) || footLengthCm <= 0) {
    throw new RangeError('footLengthCm must be a positive number')
  }

  const target = footLengthCm + SIZE_FOOT_LENGTH_PADDING_CM

  // Below or equal to minimum size (including exact match at min)
  if (target <= sizeChart[0].footLengthCm) {
    const first = sizeChart[0]
    return { eu: first.eu, us: first.us, cm: first.cm, isBetweenSizes: false }
  }

  // Above or equal to maximum size (including exact match at max)
  if (target >= sizeChart[sizeChart.length - 1].footLengthCm) {
    const last = sizeChart[sizeChart.length - 1]
    return { eu: last.eu, us: last.us, cm: last.cm, isBetweenSizes: false }
  }

  // Find the index of the first entry >= target
  const index = sizeChart.findIndex(e => e.footLengthCm >= target)
  
  // If exact match with an entry, return it
  if (Math.abs(sizeChart[index].footLengthCm - target) < 1e-9) {
    return { ...sizeChart[index], isBetweenSizes: false }
  }

  // Between two sizes: index is the upper bound, index-1 is the lower bound
  const upper = sizeChart[index]
  const lower = sizeChart[index - 1]
  
  const lowerDist = target - lower.footLengthCm
  const upperDist = upper.footLengthCm - target

  // If equidistant (within floating point tolerance), prefer upper (larger size)
  if (Math.abs(lowerDist - upperDist) < 1e-9) {
    return { ...upper, isBetweenSizes: true }
  }

  // Return the closer size
  if (upperDist < lowerDist) {
    return { ...upper, isBetweenSizes: false }
  }

  return { ...lower, isBetweenSizes: false }
}