import { SkillTreeData } from "./SkillTreeData";
import { SkillNode, SkillNodeStates } from "./SkillNode";
import { SkillTreeEvents } from "./SkillTreeEvents";
import * as PIXI from "pixi.js";
import { SkillTreeCodec } from "./SkillTreeCodec";
import * as lzstring from "lz-string";
import { SkillTreeAlternate } from "./SkillTreeAlternate";

export class SkillTreeUtilities {
    private dragStart: PIXI.Point;
    private dragEnd: PIXI.Point;
    private DRAG_THRESHOLD_SQUARED = 5 * 5;
    private LONG_PRESS_THRESHOLD = 100;
    skillTreeData: SkillTreeData;
    skillTreeCodec: SkillTreeCodec;
    skillTreeAlternate!: SkillTreeAlternate;

    constructor(context: SkillTreeData, skillTreeAlternate: SkillTreeAlternate) {
        this.skillTreeData = context;
        this.skillTreeAlternate = skillTreeAlternate;
        this.skillTreeCodec = new SkillTreeCodec();

        SkillTreeEvents.on("node", "click", this.click);
        SkillTreeEvents.on("node", "tap", this.click);
        SkillTreeEvents.on("node", "mouseover", this.mouseover);
        SkillTreeEvents.on("node", "mouseout", this.mouseout);
        SkillTreeEvents.on("node", "touchstart", this.touchstart);
        SkillTreeEvents.on("node", "touchend", this.touchend);
        SkillTreeEvents.on("node", "touchcancel", this.touchend);

        this.dragStart = new PIXI.Point(0, 0);
        this.dragEnd = new PIXI.Point(0, 0);
        SkillTreeEvents.on("viewport", "drag-start", (point: PIXI.IPoint) => this.dragStart = JSON.parse(JSON.stringify(point)));
        SkillTreeEvents.on("viewport", "drag-end", (point: PIXI.IPoint) => this.dragEnd = JSON.parse(JSON.stringify(point)));
        SkillTreeEvents.on("viewport", "mouseup", () => setTimeout(() => this.dragStart = JSON.parse(JSON.stringify(this.dragEnd)), 250));
        SkillTreeEvents.on("viewport", "touchend", () => setTimeout(() => this.dragStart = JSON.parse(JSON.stringify(this.dragEnd)), 250));
        SkillTreeEvents.on("viewport", "touchcancel", () => setTimeout(() => this.dragStart = JSON.parse(JSON.stringify(this.dragEnd)), 250));

        SkillTreeEvents.on("controls", "class-change", this.changeStartClass);
        SkillTreeEvents.on("controls", "ascendancy-class-change", this.changeAscendancyClass);
        SkillTreeEvents.on("controls", "search-change", this.searchChange);

        SkillTreeEvents.on("skilltree", "encode-url", this.encodeURL);
    }

    private lastHash = "";
    public decodeURL = () => {
        if (this.lastHash === window.location.hash) {
            return;
        }
        this.lastHash = window.location.hash;

        try {
            const data = lzstring.decompressFromEncodedURIComponent(window.location.hash.replace("#", ""));
            if (data === null) {
                window.location.hash = "";
                return;
            }

            this.skillTreeData.Build = JSON.parse(data);
            for (const id in this.skillTreeData.Build.NodeAlternateIdMap) {
                this.skillTreeData.nodes[id].alternateIds = this.skillTreeData.Build.NodeAlternateIdMap[id];
            }
            const def = this.skillTreeCodec.decodeURL(this.skillTreeData.Build.TreeHash, this.skillTreeData);
            this.skillTreeData.version = def.Version;
            this.skillTreeData.fullscreen = def.Fullscreen;
            this.changeStartClass(def.Class, false);
            this.changeAscendancyClass(def.Ascendancy, false);
            for (const node of def.Nodes) {
                this.skillTreeData.nodes[(node.id || node.skill)].add(SkillNodeStates.Active);
            }

            for (const id in this.skillTreeData.classStartNodes) {
                if (this.skillTreeData.nodes[id].is(SkillNodeStates.Active)) {
                    const refund = this.getRefundNodes(this.skillTreeData.nodes[id]);
                    for (const i of refund) {
                        i.remove(SkillNodeStates.Active);
                    }
                }
            }

            SkillTreeEvents.fire("skilltree", "jewel-click-end", undefined);
            this.encodeURL();
        }
        catch (ex) {
            window.location.hash = "";
            console.log(ex);
        }
    }

    private encodeURL = () => {
        this.skillTreeData.Build.TreeHash = `${this.skillTreeCodec.encodeURL(this.skillTreeData)}`;
        this.skillTreeData.Build.NodeAlternateIdMap = {};
        for (const id in this.skillTreeData.nodes) {
            const node = this.skillTreeData.nodes[id];
            if (node.alternateIds !== undefined
                && (node.isRegular2 || node.isNotable)
                && node.alternateIds.filter(x => this.skillTreeAlternate.nodesByPassiveType[node.GetPassiveType()].filter(y => y.faction === this.skillTreeAlternate.nodes[typeof x === "string" ? x : x.id].faction).length > 1).length > 0) {
                this.skillTreeData.Build.NodeAlternateIdMap[node.id] = node.alternateIds;
            }
        }
        window.location.hash = `#${lzstring.compressToEncodedURIComponent(JSON.stringify(this.skillTreeData.Build, (key, value) => key === "extra_data" ? undefined : value))}`;
        SkillTreeEvents.fire("skilltree", "active-nodes-update");
        this.broadcastSkillCounts();
    }

    private broadcastSkillCounts = () => {
        //need to add bandits here
        let maximumNormalPoints = 121;
        const maximumAscendancyPoints = 8;
        let normalNodes = 0;
        let ascNodes = 0;
        for (const id in this.skillTreeData.nodes) {
            const node = this.skillTreeData.nodes[id];
            if (node.is(SkillNodeStates.Active) && node.classStartIndex === undefined && !node.isAscendancyStart && !node.isMastery) {
                if (node.ascendancyName === "") {
                    normalNodes++;
                } else {
                    ascNodes++;
                }
                maximumNormalPoints += node.passivePointsGranted;
            }
        }

        SkillTreeEvents.fire("skilltree", "normal-node-count", normalNodes);
        SkillTreeEvents.fire("skilltree", "normal-node-count-maximum", maximumNormalPoints);
        SkillTreeEvents.fire("skilltree", "ascendancy-node-count", ascNodes);
        SkillTreeEvents.fire("skilltree", "ascendancy-node-count-maximum", maximumAscendancyPoints);
    }

    public changeStartClass = (start: number, encode = true) => {
        for (const id in this.skillTreeData.classStartNodes) {
            const node = this.skillTreeData.nodes[id];
            if (node.classStartIndex === undefined) {
                continue;
            }

            if (node.classStartIndex !== start) {
                node.remove(SkillNodeStates.Active);
                continue;;
            }

            node.add(SkillNodeStates.Active);
            SkillTreeEvents.fire("skilltree", "class-change", node);
            for (const i of this.getRefundNodes(node)) {
                i.remove(SkillNodeStates.Active);
            }
        }

        this.changeAscendancyClass(0, false);

        if (encode) {
            this.encodeURL();
        }
    }

    public changeAscendancyClass = (start: number, encode = true) => {
        if (this.skillTreeData.classes.length === 0) {
            return;
        }

        const ascClasses = this.skillTreeData.classes[this.skillTreeData.getStartClass()].ascendancies;
        if (ascClasses === undefined) {
            return;
        }

        const ascClass = ascClasses[start];
        const name = ascClass !== undefined ? ascClass.name : undefined;

        for (const id in this.skillTreeData.ascedancyNodes) {
            const node = this.skillTreeData.nodes[id];
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
        this.skillTreeData.clearState(SkillNodeStates.Highlighted);

        if (str !== undefined && str.length !== 0) {
            const regex = new RegExp(str, "gi");
            for (const id in this.skillTreeData.nodes) {
                const node = this.skillTreeData.nodes[id];
                if (node.isAscendancyStart || node.classStartIndex !== undefined) {
                    continue;
                }
                if (node.name.match(regex) !== null || node.stats.find(stat => stat.match(regex) !== null) !== undefined) {
                    node.add(SkillNodeStates.Highlighted);
                }
            }
        }

        SkillTreeEvents.fire("skilltree", "highlighted-nodes-update");
    }

    private click = (node: SkillNode) => {
        if ((this.dragStart.x - this.dragEnd.x) * (this.dragStart.x - this.dragEnd.x) > this.DRAG_THRESHOLD_SQUARED
            || (this.dragStart.y - this.dragEnd.y) * (this.dragStart.y - this.dragEnd.y) > this.DRAG_THRESHOLD_SQUARED) {
            return;
        }
        if (node.classStartIndex !== undefined || node.isAscendancyStart) {
            return;
        }

        const refund = this.getRefundNodes(node);
        const shortest = this.getShortestPath(node);

        if (shortest.length > 0 || node.is(SkillNodeStates.Active)) {
            for (const i of refund) {
                if (i.classStartIndex !== undefined) {
                    continue;
                }
                i.remove(SkillNodeStates.Active);
            }
        }

        for (const i of shortest) {
            if (!i.is(SkillNodeStates.Active) && refund.indexOf(i) < 0) {
                i.add(SkillNodeStates.Active);
            }
        }

        this.skillTreeData.clearState(SkillNodeStates.Hovered);
        this.skillTreeData.clearState(SkillNodeStates.Pathing);
        this.encodeURL();
    }

    private touchTimeout: NodeJS.Timeout | null = null;
    private touchstart = (node: SkillNode) => {
        this.touchTimeout = setTimeout(() => this.dragEnd.x = this.dragStart.x + this.DRAG_THRESHOLD_SQUARED * this.DRAG_THRESHOLD_SQUARED, this.LONG_PRESS_THRESHOLD);
        this.mouseover(node);
    }

    private touchend = (node: SkillNode) => {
        if (this.touchTimeout !== null) {
            clearTimeout(this.touchTimeout);
        }
        this.mouseout(node);
    }

    private mouseover = (node: SkillNode) => {
        this.skillTreeData.clearState(SkillNodeStates.Hovered);
        this.skillTreeData.clearState(SkillNodeStates.Pathing);

        if (node.classStartIndex === undefined) {
            node.add(SkillNodeStates.Hovered);
        }
        const shortest = this.getShortestPath(node);
        for (const i of shortest) {
            if (!i.is(SkillNodeStates.Pathing) && !i.is(SkillNodeStates.Active)) {
                i.add(SkillNodeStates.Pathing);
            }
        }
        node.hoverText = shortest.length.toString();

        if (shortest.length > 0 || node.is(SkillNodeStates.Active)) {
            const refund = this.getRefundNodes(node);
            for (const i of refund) {
                i.add(SkillNodeStates.Pathing);
            }
            if (refund.length > 0) {
                node.hoverText = refund.length.toString();
            }
        }

        SkillTreeEvents.fire("skilltree", "hovered-nodes-start", node);
    }

    private mouseout = (node: SkillNode) => {
        this.skillTreeData.clearState(SkillNodeStates.Hovered);
        this.skillTreeData.clearState(SkillNodeStates.Pathing);
        SkillTreeEvents.fire("skilltree", "hovered-nodes-end", node);
    }

    private getShortestPath = (target: SkillNode): Array<SkillNode> => {
        const skilled = this.skillTreeData.getSkilledNodes();
        if (skilled[target.id]) {
            return new Array<SkillNode>();
        }

        const frontier: Array<SkillNode> = [];
        const distance: { [id: string]: number } = {};
        const adjacent = this.getAdjacentNodes(skilled);
        for (const id in adjacent) {
            if (id === target.id.toString()) {
                const path = new Array<SkillNode>();
                path.push(target);
                return path;
            }
            const node = this.skillTreeData.nodes[id];
            if (node.isAscendancyStart && !node.is(SkillNodeStates.Active)) {
                continue;
            }
            frontier.push(adjacent[id]);
            distance[id] = 1;
        }

        const explored = skilled;
        const prev: { [id: string]: SkillNode } = {};
        while (frontier.length > 0) {
            const current = frontier.shift();
            if (current === undefined) {
                continue;
            }

            explored[current.id] = current;
            const dist = distance[current.id];
            for (const id of current.out) {
                const out = this.skillTreeData.nodes[id];
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
                if (out.classStartIndex !== undefined && !out.is(SkillNodeStates.Active)) {
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
        const path = new Array<SkillNode>();
        while (current !== undefined) {
            path.push(current);
            current = prev[current.id];
        }
        return path.reverse();
    }

    private getRefundNodes = (source: SkillNode): Array<SkillNode> => {
        let characterStartNode: SkillNode | undefined = undefined;
        for (const id in this.skillTreeData.classStartNodes) {
            const node = this.skillTreeData.nodes[id];
            if (node.is(SkillNodeStates.Active) && node.classStartIndex !== undefined) {
                characterStartNode = node;
            }
        }
        if (characterStartNode === undefined) {
            return new Array<SkillNode>();
        }

        let frontier = new Array<SkillNode>();
        const reachable: { [id: string]: SkillNode } = {};
        for (const id of characterStartNode.out) {
            const out = this.skillTreeData.nodes[id];
            if (out.ascendancyName !== "" && source.ascendancyName !== "" && out.ascendancyName !== source.ascendancyName) {
                continue;
            }
            if (out.is(SkillNodeStates.Active) && out.id !== source.id) {
                frontier.push(out);
                reachable[id] = out;
            }
        }
        while (frontier.length > 0) {
            const nextFrontier = new Array<SkillNode>();
            for (const node of frontier) {
                for (const id of node.out) {
                    const out = this.skillTreeData.nodes[id];
                    if (out.isMultipleChoiceOption && source.isMultipleChoiceOption) {
                        const outchoice = out.in.find(id => this.skillTreeData.nodes[id].isMultipleChoice);
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

        const unreachable = new Array<SkillNode>();
        const skilledNodes = this.skillTreeData.getSkilledNodes();
        for (const id in skilledNodes) {
            if (reachable[id] === undefined && this.skillTreeData.nodes[id].classStartIndex === undefined) {
                unreachable.push(this.skillTreeData.nodes[id]);
            }
        }
        return unreachable;
    }

    private getAdjacentNodes = (start: { [id: string]: SkillNode }): { [id: string]: SkillNode } => {
        const adjacentNodes: { [id: string]: SkillNode } = {};
        for (const parent in start) {
            for (const id of start[parent].out) {
                const out = this.skillTreeData.nodes[id];
                if (out.classStartIndex !== undefined && !out.is(SkillNodeStates.Active)) {
                    continue;
                }
                adjacentNodes[id] = out;
            }
        }
        return adjacentNodes;
    }

    public isAnyActive = (nodes: Array<number>): boolean => {
        for (const id in nodes) {
            if (this.skillTreeData.nodes[id] && this.skillTreeData.nodes[id].is(SkillNodeStates.Active)) {
                return true;
            }
        }

        return false;
    }
}