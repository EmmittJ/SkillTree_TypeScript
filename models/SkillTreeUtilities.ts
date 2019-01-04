import { SkillTreeData } from "./SkillTreeData";
import { SkillNode } from "./SkillNode";
import { SkillTreeEvents } from "./SkillTreeEvents";
import * as PIXI from "pixi.js";

export class SkillTreeUtilities {
    private drag_start: PIXI.PointLike;
    private drag_end: PIXI.PointLike;
    private DRAG_THRESHOLD_SQUARED = 5 * 5;
    private LONG_PRESS_THRESHOLD = 100;
    skillTreeData: SkillTreeData;
    constructor(context: SkillTreeData) {
        this.skillTreeData = context;
        SkillTreeEvents.on("node", "click", this.click, false);
        SkillTreeEvents.on("node", "tap", this.click, false);
        SkillTreeEvents.on("node", "mouseover", this.mouseover, false);
        SkillTreeEvents.on("node", "mouseout", this.mouseout, false);
        SkillTreeEvents.on("node", "touchstart", this.touchstart, false);
        SkillTreeEvents.on("node", "touchend", this.touchend, true);
        SkillTreeEvents.on("node", "touchcancel", this.touchend, true);

        this.drag_start = new PIXI.Point(0, 0);
        this.drag_end = new PIXI.Point(0, 0);
        SkillTreeEvents.on("viewport", "drag-start", (point: PIXI.PointLike) => this.drag_start = JSON.parse(JSON.stringify(point)), false);
        SkillTreeEvents.on("viewport", "drag-end", (point: PIXI.PointLike) => this.drag_end = JSON.parse(JSON.stringify(point)), false);
        SkillTreeEvents.on("viewport", "mouseup", () => setTimeout(() => this.drag_start = JSON.parse(JSON.stringify(this.drag_end)), 250), false);
        SkillTreeEvents.on("viewport", "touchend", () => setTimeout(() => this.drag_start = JSON.parse(JSON.stringify(this.drag_end)), 250), true);
        SkillTreeEvents.on("viewport", "touchcancel", () => setTimeout(() => this.drag_start = JSON.parse(JSON.stringify(this.drag_end)), 250), true);
    }

    private click = (node: SkillNode) => {
        if ((this.drag_start.x - this.drag_end.x) * (this.drag_start.x - this.drag_end.x) > this.DRAG_THRESHOLD_SQUARED
            || (this.drag_start.y - this.drag_end.y) * (this.drag_start.y - this.drag_end.y) > this.DRAG_THRESHOLD_SQUARED) {
            return;
        }
        if (node.spc.length > 0 || node.m) {
            return;
        }

        let refund = this.getRefundNodes(node);
        let shortest = this.getShortestPath(node);

        if (shortest.length > 0 || node.isActive) {
            for (let i of refund) {
                if (i.spc.length > 0) {
                    continue;
                }
                i.isActive = false;
            }
        }

        for (let i of shortest) {
            if (!i.isActive && refund.indexOf(i) < 0) {
                i.isActive = true;
            }
        }
        this.clearPathNodes();
    }

    private touchTimeout: number | null = null;
    private touchstart = (node: SkillNode) => {
        this.touchTimeout = setTimeout(() => this.drag_end.x = this.drag_start.x + this.DRAG_THRESHOLD_SQUARED * this.DRAG_THRESHOLD_SQUARED, this.LONG_PRESS_THRESHOLD);
        this.mouseover(node);
    }

    private touchend = (node: SkillNode) => {
        if (this.touchTimeout !== null) {
            clearTimeout(this.touchTimeout);
        }
        this.mouseout(node);
    }

    private mouseover = (node: SkillNode) => {
        this.clearHoveredNodes();

        if (node.spc.length === 0) {
            node.isHovered = true;
        }
        let shortest = this.getShortestPath(node);
        for (let i of shortest) {
            if (!i.isPath && !i.isActive) {
                i.isPath = true;
            }
        }
        node.hoverText = shortest.length.toString();

        if (shortest.length > 0 || node.isActive) {
            let refund = this.getRefundNodes(node);
            for (let i of refund) {
                i.isPath = true;
            }
            if (refund.length > 0) {
                node.hoverText = refund.length.toString();
            }
        }
    }

    private mouseout = (node: SkillNode) => {
        node.destroyTooltip();
        this.clearHoveredNodes();
    }

    private clearHoveredNodes = () => {
        for (let id in this.skillTreeData.getHoveredNodes()) {
            this.skillTreeData.nodes[id].isHovered = false;
            this.skillTreeData.nodes[id].isPath = false;
            this.skillTreeData.nodes[id].hoverText = null;
        }
    }

    private clearPathNodes = () => {
        for (let id in this.skillTreeData.getHoveredNodes()) {
            this.skillTreeData.nodes[id].isPath = false;
        }
    }

    private getShortestPath = (target: SkillNode): Array<SkillNode> => {
        let skilled = this.skillTreeData.getSkilledNodes();
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
            if (out.ascendancyName !== "" && source.ascendancyName !== "" && out.ascendancyName !== source.ascendancyName) {
                continue;
            }
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
                    if (out.isMultipleChoiceOption && source.isMultipleChoiceOption) {
                        let outchoice = out.in.find(id => this.skillTreeData.nodes[id].isMultipleChoice);
                        if (outchoice !== undefined && outchoice === source.in.find(id => this.skillTreeData.nodes[id].isMultipleChoice)) {
                            continue;
                        }
                    }
                    if (out.ascendancyName !== "" && source.ascendancyName !== "" && out.ascendancyName !== source.ascendancyName) {
                        continue;
                    }
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
        let skilledNodes = this.skillTreeData.getSkilledNodes();
        for (let id in skilledNodes) {
            if (reachable[id] === undefined) {
                unreachable.push(this.skillTreeData.nodes[id]);
            }
        }
        return unreachable;
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