import type { Point } from './types'
import { fetchDurationMatrix, fetchRoute } from './osrm'

/**
 * Nearest Neighbor heuristic for TSP
 * Returns visit order starting from index 0 (origin)
 */
export function nearestNeighbor(matrix: number[][], start = 0): number[] {
  const n = matrix.length
  const visited = new Set([start])
  const order = [start]
  let current = start

  while (visited.size < n) {
    let best = -1
    let bestCost = Infinity

    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && matrix[current][i] < bestCost) {
        bestCost = matrix[current][i]
        best = i
      }
    }

    order.push(best)
    visited.add(best)
    current = best
  }

  return order
}

/**
 * Calculate total cost of a route order
 */
export function routeCost(order: number[], matrix: number[][]): number {
  let total = 0
  for (let i = 0; i < order.length - 1; i++) {
    total += matrix[order[i]][order[i + 1]]
  }
  return total
}

/**
 * 2-opt local search improvement
 * Keeps index 0 (origin) fixed
 */
export function twoOpt(order: number[], matrix: number[][]): number[] {
  let best = [...order]
  let improved = true

  while (improved) {
    improved = false
    for (let i = 1; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ]
        if (routeCost(candidate, matrix) < routeCost(best, matrix)) {
          best = candidate
          improved = true
        }
      }
    }
  }

  return best
}

/**
 * Full optimization pipeline:
 * 1. Fetch duration matrix from OSRM
 * 2. Apply Nearest Neighbor heuristic
 * 3. Improve with 2-opt
 * 4. Fetch final route geometry
 */
export async function optimizeRoute(origem: Point, clientes: Point[]) {
  const points = [origem, ...clientes]
  const matrix = await fetchDurationMatrix(points)
  const initial = nearestNeighbor(matrix, 0)
  const optimized = twoOpt(initial, matrix)

  // Get the ordered points for the route
  const orderedPoints = optimized.map(idx => points[idx])

  // Fetch the actual route geometry
  const routeResult = await fetchRoute(orderedPoints)

  return {
    clienteIdsOrdenados: optimized.slice(1).map(idx => clientes[idx - 1].id),
    duracaoTotalSegundos: routeResult.duration,
    distanciaTotalMetros: routeResult.distance,
    polyline: routeResult.geometry,
  }
}
