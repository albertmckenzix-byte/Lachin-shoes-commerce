export const sizeTable = [
  { us: 3.5, eu: 35.5, cm: 22 },
  { us: 4, eu: 36, cm: 22.5 },
  { us: 4.5, eu: 36.5, cm: 23 },
  { us: 5, eu: 37.5, cm: 23.5 },
  { us: 5.5, eu: 38, cm: 24 },
  { us: 6, eu: 38.5, cm: 24.5 },
  { us: 6.5, eu: 39, cm: 25 },
  { us: 7, eu: 40, cm: 25.5 },
  { us: 7.5, eu: 40.5, cm: 26 },
  { us: 8, eu: 41, cm: 26.5 },
  { us: 8.5, eu: 42, cm: 27 },
  { us: 9, eu: 42.5, cm: 27.5 },
  { us: 9.5, eu: 43, cm: 28 },
  { us: 10, eu: 44, cm: 28.5 },
  { us: 10.5, eu: 44.5, cm: 29 },
  { us: 11, eu: 45, cm: 29.5 },
  { us: 11.5, eu: 45.5, cm: 30 },
  { us: 12, eu: 46, cm: 30.5 },
  { us: 12.5, eu: 47, cm: 31 },
  { us: 13, eu: 47.5, cm: 31.5 },
  { us: 14, eu: 48.5, cm: 32 },
]

export const usSizes = sizeTable.map(s => s.us)
export const euSizes = sizeTable.map(s => s.eu)
export const cmSizes = sizeTable.map(s => s.cm)

export function getEuSize(us) {
  const entry = sizeTable.find(s => s.us === us)
  return entry ? entry.eu : null
}

export function getCmSize(us) {
  const entry = sizeTable.find(s => s.us === us)
  return entry ? entry.cm : null
}

export function getUsSize(eu) {
  const entry = sizeTable.find(s => s.eu === eu)
  return entry ? entry.us : null
}

export function formatSize(size) {
  if (Number.isInteger(size)) return size.toString()
  return size.toString()
}