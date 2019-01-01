import { SkillTreeData } from "./SkillTreeData";
import { SkillNode } from "./SkillNode";
import { SkillTreeEvents } from "./SkillTreeEvents";

export class SkillTreeUtilities {
    skillTreeData: SkillTreeData;
    constructor(context: SkillTreeData) {
        this.skillTreeData = context;
        SkillTreeEvents.on("node", "click", this.click, false);
        SkillTreeEvents.on("node", "tap", this.click, false);
        SkillTreeEvents.on("node", "mouseover", this.mouseover, false);
        SkillTreeEvents.on("node", "mouseout", this.mouseout, true);
    }

    private click = (node: SkillNode) => {
        if (node.spc.length > 0 || node.m) {
            return;
        }
        if (node.isActive) {
            for (let i of this.getRefundNodes(node)) {
                if (i.spc.length > 0) {
                    continue;
                }
                i.isActive = false;
            }
        } else {
            for (let i of this.getShortestPath(node)) {
                if (!i.isActive) {
                    i.isActive = true;
                }
            }
        }
        for (let id in this.getHoveredNodes()) {
            this.skillTreeData.nodes[id].isHovered = false;
            this.skillTreeData.nodes[id].isPath = false;
        }
    }

    private mouseover = (node: SkillNode) => {
        for (let i of this.getShortestPath(node)) {
            if (!i.isPath && !i.isActive) {
                i.isPath = true;
            }
        }
        node.isHovered = true;

        for (let i of this.getRefundNodes(node)) {
            i.isPath = true;
        }
    }

    private mouseout = (node: SkillNode) => {
        for (let id in this.getHoveredNodes()) {
            this.skillTreeData.nodes[id].isHovered = false;
            this.skillTreeData.nodes[id].isPath = false;
        }
    }

    private getShortestPath = (target: SkillNode): Array<SkillNode> => {
        let skilled = this.getSkilledNodes();
        if (skilled[target.id]) {
            return new Array<SkillNode>();
        }

        let frontier: Array<SkillNode> = [];
        let distance: { [id: string]: number } = {};
        let adjacent = this.getAdjacentNodes(skilled);
        for (let id in adjacent) {
            if (id === target.id.toString()) {
                let path = new Array<SkillNode>();
                path.push(target);
                return path;
            }
            frontier.push(adjacent[id]);
            distance[id] = 1;
        }

        let explored = skilled;
        let prev: { [id: string]: SkillNode } = {};
        while (frontier.length > 0) {
            let current = frontier.shift();
            if (current === undefined) {
                continue;
            }

            explored[current.id] = current;
            let dist = distance[current.id];
            for (let id of current.out) {
                let out = this.skillTreeData.nodes[id];
                if ((current.ascendancyName === "" && out.ascendancyName !== "" && !out.isActive)
                    || (current.ascendancyName !== "" && out.ascendancyName === "" && !current.isActive)) {
                    continue;
                }
                if (explored[id] || distance[id]) {
                    continue;
                }
                if (out.m) {
                    continue;
                }
                if (out.isAscendancyStart && !out.isActive) {
                    continue;
                }
                if (out.spc.length > 0 && !out.isActive) {
                    continue;
                }

                distance[id] = dist + 1;
                prev[id] = current;
                frontier.push(out);
                if (out.id === target.id) {
                    frontier.length = 0;
                }
            }
        }

        if (distance[target.id.toString()] === undefined) {
            return new Array<SkillNode>();
        }

        let current: SkillNode | undefined = target;
        let path = new Array<SkillNode>();
        while (current !== undefined) {
            path.push(current);
            current = prev[current.id];
        }
        return path.reverse();
    }

    private getRefundNodes = (source: SkillNode): Array<SkillNode> => {
        if (!source.isActive) {
            return new Array<SkillNode>();
        }

        let characterStartNode: SkillNode | undefined = undefined;
        for (let id in this.skillTreeData.nodes) {
            let node = this.skillTreeData.nodes[id];
            if (node.isActive && node.spc.length > 0) {
                characterStartNode = node;
            }
        }
        if (characterStartNode === undefined) {
            return new Array<SkillNode>();
        }

        let frontier = new Array<SkillNode>();
        let reachable: { [id: string]: SkillNode } = {};
        for (let id of characterStartNode.out) {
            let out = this.skillTreeData.nodes[id];
            if (out.isActive && out.id !== source.id) {
                frontier.push(out);
                reachable[id] = out;
            }
        }

        while (frontier.length > 0) {
            let nextFrontier = new Array<SkillNode>();
            for (let node of frontier) {
                for (let id of node.out) {
                    let out = this.skillTreeData.nodes[id];
                    if (out.id === source.id || reachable[id] || !out.isActive) {
                        continue;
                    }

                    nextFrontier.push(out);
                    reachable[id] = out;
                }
            }

            frontier = nextFrontier;
        }

        let unreachable = new Array<SkillNode>();
        let skilledNodes = this.getSkilledNodes();
        for (let id in skilledNodes) {
            if (reachable[id] === undefined) {
                unreachable.push(this.skillTreeData.nodes[id]);
            }
        }
        return unreachable;
    }

    public getSkilledNodes = (): { [id: string]: SkillNode } => {
        let skilled: { [id: string]: SkillNode } = {};
        for (let id in this.skillTreeData.nodes) {
            let node = this.skillTreeData.nodes[id];
            if (node.isActive) {
                skilled[id] = node;
            }
        }
        return skilled;
    }

    public getHoveredNodes = (): { [id: string]: SkillNode } => {
        let hovered: { [id: string]: SkillNode } = {};
        for (let id in this.skillTreeData.nodes) {
            let node = this.skillTreeData.nodes[id];
            if (node.isHovered || node.isPath) {
                hovered[id] = node;
            }
        }
        return hovered;
    }

    private getAdjacentNodes = (start: { [id: string]: SkillNode }): { [id: string]: SkillNode } => {
        let adjacentNodes: { [id: string]: SkillNode } = {};
        for (let parent in start) {
            for (let id of start[parent].out) {
                let out = this.skillTreeData.nodes[id];
                if (out.spc.length > 0 && !out.isActive) {
                    continue;
                }
                adjacentNodes[id] = out;
            }
        }
        return adjacentNodes;
    }

    public isAnyActive = (nodes: Array<number>): boolean => {
        for (let id in nodes) {
            if (this.skillTreeData.nodes[id] && this.skillTreeData.nodes[id].isActive) {
                return true;
            }
        }

        return false;
    }
}