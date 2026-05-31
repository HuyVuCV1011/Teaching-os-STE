/**
 * Utility layout helpers for student lesson viewing dashboards.
 */
export const getGridColsClass = (layout: string) => {
  switch (layout) {
    case '1-col': return 'grid-cols-1'
    case '2-cols': return 'grid-cols-1 sm:grid-cols-2'
    case '3-cols': return 'grid-cols-1 md:grid-cols-3'
    default: return 'grid-cols-1'
  }
}
