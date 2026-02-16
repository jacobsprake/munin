/**
 * Frontend Performance Optimization
 * 
 * Utilities for optimizing frontend performance for large graphs and long histories.
 */

/**
 * Virtual scrolling for long lists
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
): {
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  totalHeight: number;
} {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = 0; // Would be calculated from scroll position
  const endIndex = Math.min(startIndex + visibleCount, items.length);
  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;

  return {
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
  };
}

/**
 * Debounce function for expensive operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for frequent events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoize expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Lazy load images
 */
export function lazyLoadImage(img: HTMLImageElement, src: string): void {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        img.src = src;
        observer.unobserve(img);
      }
    });
  });

  observer.observe(img);
}

/**
 * Optimize graph rendering for large graphs
 */
export interface GraphOptimizationOptions {
  maxNodes?: number;
  maxEdges?: number;
  levelOfDetail?: boolean; // Render fewer details when zoomed out
  clustering?: boolean; // Cluster nearby nodes
}

export function optimizeGraphRendering(
  nodes: any[],
  edges: any[],
  options: GraphOptimizationOptions = {}
): { nodes: any[]; edges: any[] } {
  const { maxNodes = 1000, maxEdges = 5000, levelOfDetail = true } = options;

  // If graph is small, return as-is
  if (nodes.length <= maxNodes && edges.length <= maxEdges) {
    return { nodes, edges };
  }

  // Filter to most important nodes/edges
  // In a real implementation, would use importance scores
  const importantNodes = nodes.slice(0, maxNodes);
  const nodeIds = new Set(importantNodes.map((n) => n.id));
  const importantEdges = edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .slice(0, maxEdges);

  return {
    nodes: importantNodes,
    edges: importantEdges,
  };
}

/**
 * Paginate long incident histories
 */
export function paginateIncidents<T>(
  incidents: T[],
  page: number,
  pageSize: number = 50
): {
  items: T[];
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
} {
  const totalPages = Math.ceil(incidents.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const items = incidents.slice(startIndex, endIndex);

  return {
    items,
    totalPages,
    currentPage: page,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}
