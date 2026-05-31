import { Node, Edge, MarkerType } from 'reactflow'
import dagre from 'dagre'

/**
 * Checks for circular reference loops in process flow diagrams.
 */
export function hasCycle(nodes: any[], edges: any[]): boolean {
  const adj: Record<string, string[]> = {}
  for (const node of nodes) {
    adj[node.id] = []
  }
  for (const edge of edges) {
    if (adj[edge.source]) {
      adj[edge.source].push(edge.target)
    }
  }

  const visited: Record<string, boolean> = {}
  const recStack: Record<string, boolean> = {}

  function dfs(nodeId: string): boolean {
    if (!visited[nodeId]) {
      visited[nodeId] = true
      recStack[nodeId] = true

      const neighbors = adj[nodeId] || []
      for (const neighbor of neighbors) {
        if (!visited[neighbor] && dfs(neighbor)) {
          return true
        } else if (recStack[neighbor]) {
          return true
        }
      }
    }
    recStack[nodeId] = false
    return false
  }

  for (const node of nodes) {
    if (!visited[node.id] && dfs(node.id)) {
      return true
    }
  }
  return false
}

/**
 * Computes standard Dagre hierarchy layouts for nodes and edges.
 */
export function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 200, ranksep: 100 })

  nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 200, height: 60 }))
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target))
  dagre.layout(dagreGraph)

  return {
    nodes: nodes.map((node) => {
      const { x, y } = dagreGraph.node(node.id)
      return { ...node, position: { x, y } }
    }),
    edges: edges.map((edge) => ({
      ...edge,
      style: { strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed },
    })),
  }
}
