import type { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk-api.js";
import type { DiagramSpec, DiagramEdge } from "../spec/schema.js";
import {
  GROUP_PADDING,
  GROUP_CHIP_MARGIN,
  estimateNodeSize,
  estimateEdgeLabelSize,
  estimateGroupChipWidth,
} from "./geometry.js";
import { resolveDirection } from "./direction.js";

interface GroupNode {
  id: string;
  childGroupIds: string[];
  nodeIds: string[];
}

function buildGroupTree(spec: DiagramSpec): Map<string, GroupNode> {
  const tree = new Map<string, GroupNode>();
  for (const group of spec.groups) {
    tree.set(group.id, { id: group.id, childGroupIds: [], nodeIds: [] });
  }
  for (const group of spec.groups) {
    if (group.parent) tree.get(group.parent)!.childGroupIds.push(group.id);
  }
  for (const node of spec.nodes) {
    if (node.group) tree.get(node.group)!.nodeIds.push(node.id);
  }
  return tree;
}

/** container path (from root to immediate parent) for each node/group, used to find an edge's common ancestor */
function buildContainmentPaths(spec: DiagramSpec): Map<string, string[]> {
  const paths = new Map<string, string[]>();
  const groupParent = new Map(spec.groups.map((g) => [g.id, g.parent]));

  function pathForGroup(groupId: string): string[] {
    const parent = groupParent.get(groupId);
    return parent ? [...pathForGroup(parent), parent] : [];
  }

  for (const group of spec.groups) {
    paths.set(group.id, pathForGroup(group.id));
  }
  for (const node of spec.nodes) {
    paths.set(node.id, node.group ? [...pathForGroup(node.group), node.group] : []);
  }
  return paths;
}

function commonPrefixContainer(pathA: string[], pathB: string[]): string | undefined {
  let i = 0;
  while (i < pathA.length && i < pathB.length && pathA[i] === pathB[i]) i++;
  return i > 0 ? pathA[i - 1] : undefined;
}

export interface BuiltGraph {
  elkGraph: ElkNode;
  direction: "right" | "down";
}

export function buildElkGraph(spec: DiagramSpec): BuiltGraph {
  const direction = resolveDirection(spec);
  const groupTree = buildGroupTree(spec);
  const containment = buildContainmentPaths(spec);
  const nodesById = new Map(spec.nodes.map((n) => [n.id, n]));
  const groupsById = new Map(spec.groups.map((g) => [g.id, g]));

  const edgesByContainer = new Map<string | undefined, { edge: DiagramEdge; specIndex: number }[]>();
  spec.edges.forEach((edge, specIndex) => {
    const container = commonPrefixContainer(containment.get(edge.from) ?? [], containment.get(edge.to) ?? []);
    const list = edgesByContainer.get(container) ?? [];
    list.push({ edge, specIndex });
    edgesByContainer.set(container, list);
  });

  function toElkEdge({ edge, specIndex }: { edge: DiagramEdge; specIndex: number }): ElkExtendedEdge {
    // Giving the label a width/height is what makes ELK reserve space between
    // parallel edges during routing -- without it, the pills drawn in the
    // final composition collide, because ELK didn't know it had to space the
    // edges apart.
    const labelSize = edge.label ? estimateEdgeLabelSize(edge.label) : null;
    return {
      // stable id = index of the edge in spec.edges, used to reconnect computed routes back to the original spec at render time
      id: `edge_${specIndex}`,
      sources: [edge.from],
      targets: [edge.to],
      labels:
        edge.label && labelSize ? [{ text: edge.label, width: labelSize.width, height: labelSize.height }] : undefined,
    };
  }

  function buildContainerChildren(groupId: string | undefined): ElkNode[] {
    const children: ElkNode[] = [];
    const nodeIds = groupId
      ? groupTree.get(groupId)!.nodeIds
      : spec.nodes.filter((n) => !n.group).map((n) => n.id);
    for (const nodeId of nodeIds) {
      const node = nodesById.get(nodeId)!;
      const size = estimateNodeSize(node);
      children.push({ id: node.id, width: size.width, height: size.height });
    }

    const childGroupIds = groupId
      ? groupTree.get(groupId)!.childGroupIds
      : spec.groups.filter((g) => !g.parent).map((g) => g.id);
    for (const childGroupId of childGroupIds) {
      children.push(buildGroupContainer(childGroupId));
    }
    return children;
  }

  function buildGroupContainer(groupId: string): ElkNode {
    const edges = (edgesByContainer.get(groupId) ?? []).map(toElkEdge);
    // The title chip sits on top of the container's left edge -- if the
    // container ends up narrower than the chip (e.g. a group with few/small
    // children but a long label), the chip would spill past the box's own
    // border. Giving ELK a minimum width matching the chip keeps the box
    // itself growing to fit its title instead of just clipping/truncating it.
    const chipWidth = estimateGroupChipWidth(groupsById.get(groupId)!.label);
    const minWidth = chipWidth + GROUP_CHIP_MARGIN * 2;
    // elkjs's layered algorithm computes DOWN layouts by rotating the graph
    // 90°, laying it out as if it were RIGHT, then rotating back -- but
    // "elk.nodeSize.minimum" is read *before* the un-rotation, so for DOWN
    // graphs the (width, height) pair has to be given pre-swapped or the
    // minimum lands on the wrong axis. Confirmed with a minimal elkjs repro.
    const minimumSize = direction === "down" ? `(0, ${minWidth})` : `(${minWidth}, 0)`;
    return {
      id: groupId,
      layoutOptions: {
        "elk.padding": `[top=${GROUP_PADDING.top},left=${GROUP_PADDING.left},bottom=${GROUP_PADDING.bottom},right=${GROUP_PADDING.right}]`,
        "elk.nodeSize.constraints": "MINIMUM_SIZE",
        "elk.nodeSize.minimum": minimumSize,
      },
      children: buildContainerChildren(groupId),
      edges: edges.length > 0 ? edges : undefined,
    };
  }

  const rootEdges = (edgesByContainer.get(undefined) ?? []).map(toElkEdge);

  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction === "down" ? "DOWN" : "RIGHT",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.spacing.nodeNode": "48",
      "elk.layered.spacing.nodeNodeBetweenLayers": "96",
      "elk.spacing.edgeNode": "32",
      "elk.layered.spacing.edgeNodeBetweenLayers": "32",
      "elk.spacing.edgeLabel": "12",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.padding": "[top=24,left=24,bottom=24,right=24]",
    },
    children: buildContainerChildren(undefined),
    edges: rootEdges.length > 0 ? rootEdges : undefined,
  };

  return { elkGraph, direction };
}
