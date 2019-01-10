import { SkillTreeData } from "./SkillTreeData";
import { SkillNode, SkillNodeStates } from "./SkillNode";
import { SkillTreeEvents } from "./SkillTreeEvents";
import * as PIXI from "pixi.js";
import { SkillTreeCodec } from "./SkillTreeCodec";

export class SkillTreeUtilities {
    private drag_start: PIXI.PointLike;
    private drag_end: PIXI.PointLike;
    private DRAG_THRESHOLD_SQUARED = 5 * 5;
    private LONG_PRESS_THRESHOLD = 100;
    skillTreeData: SkillTreeData;
    skillTreeCodec: SkillTreeCodec;

    constructor(context: SkillTreeData) {
        this.skillTreeData = context;
        this.skillTreeCodec = new SkillTreeCodec();

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

        SkillTreeEvents.on("controls", "class-change", this.changeStartClass, false);
        SkillTreeEvents.on("controls", "ascendancy-class-change", this.changeAscendancyClass, false);
        SkillTreeEvents.on("controls", "search-change", this.searchChange, true)
        window.onhashchange = this.decodeURL;
    }

    private lastHash = "";
    public decodeURL = () => {
        if (this.lastHash === window.location.hash) {
            return;
        }
        this.lastHash = window.location.hash;

        let def = this.skillTreeCodec.decodeURL(window.location.hash.replace("#", ""), this.skillTreeData);
        this.skillTreeData.version = def.Version;
        this.skillTreeData.fullscreen = def.Fullscreen;
        this.changeStartClass(def.Class, false);
        this.changeAscendancyClass(def.Ascendancy, false);
        for (let node of def.Nodes) {
            this.skillTreeData.nodes[node.id].add(SkillNodeStates.Active);
        }

        for (let id in this.skillTreeData.classStartNodes) {
            if (this.skillTreeData.nodes[id].is(SkillNodeStates.Active)) {
                let refund = this.getRefundNodes(this.skillTreeData.nodes[id], true);
                for (let i of refund) {
                    i.remove(SkillNodeStates.Active);
                }
            }
        }

        this.encodeURL();
    }

    private encodeURL = () => {
        window.location.hash = `#${this.skillTreeCodec.encodeURL(this.skillTreeData)}`;
        SkillTreeEvents.fire("skilltree", "active-nodes-update");
    }

    public changeStartClass = (start: number, encode: boolean = true) => {
        for (let id in this.skillTreeData.classStartNodes) {
            let node = this.skillTreeData.nodes[id];
            if (node.spc.length === 0) {
                continue;
            }
            if (node.spc.indexOf(start) < 0) {
                node.remove(SkillNodeStates.Active);
                continue;;
            }

            node.add(SkillNodeStates.Active);
            SkillTreeEvents.fire("skilltree", "class-change", node);
            for (let i of this.getRefundNodes(node)) {
                i.remove(SkillNodeStates.Active);
            }
        }

        this.changeAscendancyClass(0, false);

        if (encode) {
            this.encodeURL();
        }
    }

    public changeAscendancyClass = (start: number, encode: boolean = true) => {
        let ascClasses = this.skillTreeData.skillTreeOtions.ascClasses[this.skillTreeData.getStartClass()];
        let ascClass = ascClasses.classes[start];
        let name = ascClass !== undefined ? ascClass.name : undefined;

        for (let id in this.skillTreeData.ascedancyNodes) {
            let node = this.skillTreeData.nodes[id];
            if (node.ascendancyName !== name) {
                node.remove(SkillNodeStates.Active);
                continue;
            }
            if (node.isAscendancyStart) {
                node.add(SkillNodeStates.Active);
                SkillTreeEvents.fire("skilltree", "ascendancy-class-change", node);
            }
        }

        if (encode) {
            this.encodeURL();
        }
    }

    public searchChange = (str: string | undefined = undefined) => {
        this.clearState(SkillNodeStates.Highlighted);
        if (str === undefined || str.length === 0) {
            return;
        }
        let regex = new RegExp(str, "gi");
        for (let id in this.skillTreeData.nodes) {
            let node = this.skillTreeData.nodes[id];
            if (node.isAscendancyStart || node.spc.length > 0) {
                continue;
            }
            if (node.dn.match(regex) !== null || node.sd.find(stat => stat.match(regex) !== null) !== undefined) {
                node.add(SkillNodeStates.Highlighted);
            }
        }

        SkillTreeEvents.fire("skilltree", "highlighted-nodes-update");
    }

    private click = (node: SkillNode) => {
        if ((this.drag_start.x - this.drag_end.x) * (this.drag_start.x - this.drag_end.x) > this.DRAG_THRESHOLD_SQUARED
            || (this.drag_start.y - this.drag_end.y) * (this.drag_start.y - this.drag_end.y) > this.DRAG_THRESHOLD_SQUARED) {
            return;
        }
        if (node.spc.length > 0 || node.m || node.isAscendancyStart) {
            return;
        }

        let refund = this.getRefundNodes(node);
        let shortest = this.getShortestPath(node);

        if (shortest.length > 0 || node.is(SkillNodeStates.Active)) {
            for (let i of refund) {
                if (i.spc.length > 0) {
                    continue;
                }
                i.remove(SkillNodeStates.Active);
            }
        }

        for (let i of shortest) {
            if (!i.is(SkillNodeStates.Active) && refund.indexOf(i) < 0) {
                i.add(SkillNodeStates.Active);
            }
        }

        this.clearState(SkillNodeStates.Hovered);
        this.clearState(SkillNodeStates.Pathing);
        this.encodeURL();
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
        this.clearState(SkillNodeStates.Hovered);
        this.clearState(SkillNodeStates.Pathing);

        if (node.spc.length === 0) {
            node.add(SkillNodeStates.Hovered);
        }
        let shortest = this.getShortestPath(node);
        for (let i of shortest) {
            if (!i.is(SkillNodeStates.Pathing) && !i.is(SkillNodeStates.Active)) {
                i.add(SkillNodeStates.Pathing);
            }
        }
        node.hoverText = shortest.length.toString();

        if (shortest.length > 0 || node.is(SkillNodeStates.Active)) {
            let refund = this.getRefundNodes(node);
            for (let i of refund) {
                i.add(SkillNodeStates.Pathing);
            }
            if (refund.length > 0) {
                node.hoverText = refund.length.toString();
            }
        }

        SkillTreeEvents.fire("skilltree", "hovered-nodes-start", node);
    }

    private mouseout = (node: SkillNode) => {
        node.destroyTooltip();
        this.clearState(SkillNodeStates.Hovered);
        this.clearState(SkillNodeStates.Pathing);
        SkillTreeEvents.fire("skilltree", "hovered-nodes-end", node);
    }

    private clearState = (state: SkillNodeStates) => {
        for (let id in this.skillTreeData.getNodes(state)) {
            this.skillTreeData.nodes[id].remove(state);

            if (state === SkillNodeStates.Hovered) {
                this.skillTreeData.nodes[id].hoverText = null;
            }
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
            let node = this.skillTreeData.nodes[id];
            if (node.isAscendancyStart && !node.is(SkillNodeStates.Active)) {
                continue;
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
                if ((current.ascendancyName === "" && out.ascendancyName !== "" && !out.is(SkillNodeStates.Active))
                    || (current.ascendancyName !== "" && out.ascendancyName === "" && !current.is(SkillNodeStates.Active))) {
                    continue;
                }
                if (explored[id] || distance[id]) {
                    continue;
                }
                if (out.isAscendancyStart && !out.is(SkillNodeStates.Active)) {
                    continue;
                }
                if (out.m) {
                    continue;
                }
                if (out.spc.length > 0 && !out.is(SkillNodeStates.Active)) {
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

    private getRefundNodes = (source: SkillNode, log: boolean = false): Array<SkillNode> => {
        let characterStartNode: SkillNode | undefined = undefined;
        for (let id in this.skillTreeData.classStartNodes) {
            let node = this.skillTreeData.nodes[id];
            if (node.is(SkillNodeStates.Active) && node.spc.length > 0) {
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
            if (out.is(SkillNodeStates.Active) && out.id !== source.id) {
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
                    if (out.id === source.id || reachable[id] || !out.is(SkillNodeStates.Active)) {
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
            if (reachable[id] === undefined && this.skillTreeData.nodes[id].spc.length === 0) {
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
                if (out.spc.length > 0 && !out.is(SkillNodeStates.Active)) {
                    continue;
                }
                adjacentNodes[id] = out;
            }
        }
        return adjacentNodes;
    }

    public isAnyActive = (nodes: Array<number>): boolean => {
        for (let id in nodes) {
            if (this.skillTreeData.nodes[id] && this.skillTreeData.nodes[id].is(SkillNodeStates.Active)) {
                return true;
            }
        }

        return false;
    }
}