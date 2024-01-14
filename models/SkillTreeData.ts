import { SkillNode, SkillNodeStates } from "./SkillNode";
import { Constants } from "./Constants";
import { SemVer } from "semver";
import { versions } from "./versions/verions";
import { ISkillTreeData } from "./types/ISkillTreeData";
import { SpatialHash } from "./spatial-hash/SpatialHash";

export class SkillTreeData implements ISkillTreeData {
    tree: "Default" | "Royale" | "Atlas";
    patch: SemVer;
    version: number;
    masteryEffects: { [id: number]: number }
    classes: IAscendancyClasses[];
    alternate_ascendancies: IAscendancyClassV7[];
    groups: { [id: string]: IGroup };
    root: ISkillNode;
    nodes: { [id: string]: SkillNode };
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
    imageZoomLevels: Array<number>;
    sprites: { [id: string]: { [zoomLevel: string]: ISpriteSheet } };
    constants: Constants;
    points: IPoints;
    jewelSlots: Array<number>;
    extraImages: { [id: string]: IClassImage; };

    width: number;
    height: number;
    maxZoomLevel: number;
    scale: number;
    classStartNodes: { [id: string]: SkillNode };
    ascendancyNodes: { [id: string]: SkillNode };
    nodesInState: { [state in SkillNodeStates]: Array<string> } = {
        [SkillNodeStates.None]: new Array<string>(),
        [SkillNodeStates.Active]: new Array<string>(),
        [SkillNodeStates.Hovered]: new Array<string>(),
        [SkillNodeStates.Pathing]: new Array<string>(),
        [SkillNodeStates.Highlighted]: new Array<string>(),
        [SkillNodeStates.Compared]: new Array<string>(),
        [SkillNodeStates.Moved]: new Array<string>(),
    }
    grid: SpatialHash

    constructor(skillTree: ISkillTreeData, patch: SemVer) {
        this.tree = skillTree.tree || "Default";
        this.patch = patch;
        this.version = 4; skillTree.version = this.version;
        this.masteryEffects = [];
        this.jewelSlots = skillTree.jewelSlots;
        this.extraImages = skillTree.extraImages;
        this.groups = skillTree.groups as { [id: string]: IGroup };;
        this.root = skillTree.nodes["root"];
        this.extraImages = skillTree.extraImages;
        this.min_x = skillTree.min_x;
        this.max_x = skillTree.max_x;
        this.min_y = skillTree.min_y;
        this.max_y = skillTree.max_y;
        this.imageZoomLevels = skillTree.imageZoomLevels;
        this.constants = new Constants(skillTree.constants);
        this.points = skillTree.points || { totalPoints: 121, ascendancyPoints: 8 };
        this.width = Math.abs(this.min_x) + Math.abs(this.max_x);
        this.height = Math.abs(this.min_y) + Math.abs(this.max_y);
        this.maxZoomLevel = skillTree.imageZoomLevels.length - 1
        this.scale = skillTree.imageZoomLevels[this.maxZoomLevel];
        this.sprites = skillTree.sprites;
        this.classes = skillTree.classes || [];
        this.alternate_ascendancies = skillTree.alternate_ascendancies || [];

        this.root.id = 'root';
        delete skillTree.nodes["root"];

        // #region Fix ascendancy groups
        if (this.classes.length > 0) {
            const groupsCompleted: { [id: string]: boolean | undefined } = {};
            for (const id in skillTree.nodes) {
                const node = skillTree.nodes[id];
                const nodeGroupId = `${node.group || 0}`;
                if (node.isAscendancyStart && groupsCompleted[nodeGroupId] === undefined) {
                    let startNode: ISkillNode | undefined = undefined;
                    for (const o of node.out) {
                        if (skillTree.nodes[o].classStartIndex !== undefined) {
                            startNode = skillTree.nodes[o];
                        }
                    }

                    for (const o of node.in) {
                        if (skillTree.nodes[o].classStartIndex !== undefined) {
                            startNode = skillTree.nodes[o];
                        }
                    }

                    if (startNode === undefined) {
                        continue;
                    }

                    let offset = 0;
                    if (startNode.classStartIndex !== undefined) {
                        const classes = this.classes[startNode.classStartIndex].ascendancies;
                        for (const i in classes) {
                            if (node.ascendancyName && classes[i].name.toLowerCase().includes(node.ascendancyName.toLowerCase())) {
                                offset = +i - 1;
                                break;
                            }
                        }
                    }

                    const centerThreshold = 100;
                    const offsetDistance = 1450;
                    let baseX = 0;
                    let baseY = 0;
                    const startGroup = this.groups[startNode.group || 0];

                    if ((startGroup.x > -centerThreshold && startGroup.x < centerThreshold) && (startGroup.y > -centerThreshold && startGroup.y < centerThreshold)) {
                        // Scion
                        baseX = this.min_x * .65;
                        baseY = this.max_y * .95;
                        if (this.patch.compare(versions.v3_16_0) >= 0) {
                            baseX = this.min_x * .85;
                            baseY = this.max_y * .85;
                        }
                    } else if (startGroup.x > -centerThreshold && startGroup.x < centerThreshold) {
                        // Witch, Duelist
                        baseX = startGroup.x + (Math.sign(startGroup.x) * offset * offsetDistance);
                        baseY = Math.sign(startGroup.y) > 0 ? this.max_y * 1.05 : this.min_y;
                    } else {
                        // Templar, Marauder, Ranger, Shadow 
                        baseX = startGroup.x < 0 ? this.min_x * .80 : this.max_x;
                        baseY = startGroup.y + (Math.sign(startGroup.y) * (offset + 1) * offsetDistance);
                        if (this.patch.compare(versions.v3_16_0) >= 0) {
                            baseX = startGroup.x < 0 ? this.min_x * 1.05 : this.max_x;
                        }
                    }

                    groupsCompleted[nodeGroupId] = true;
                    for (const oid in skillTree.nodes) {
                        const other = skillTree.nodes[oid];
                        const otherGroupId = `${other.group || 0}`;
                        if (groupsCompleted[otherGroupId] === undefined && other.ascendancyName === node.ascendancyName) {
                            const diffX = this.groups[nodeGroupId].x - this.groups[otherGroupId].x;
                            const diffY = this.groups[nodeGroupId].y - this.groups[otherGroupId].y;
                            this.groups[otherGroupId].x = baseX - diffX;
                            this.groups[otherGroupId].y = baseY - diffY;
                            groupsCompleted[otherGroupId] = true;
                        }
                    }

                    this.groups[nodeGroupId].x = baseX;
                    this.groups[nodeGroupId].y = baseY;
                }
            }
        }
        // #endregion
        this.grid = new SpatialHash([[this.min_x, this.min_y], [this.max_x, this.max_y]], [100, 100]);
        this.nodes = {};
        this.classStartNodes = {};
        this.ascendancyNodes = {};
        const orbitAngles = this.getOrbitAngles(skillTree.constants.skillsPerOrbit)
        for (const id in skillTree.nodes) {
            const groupId = skillTree.nodes[id].group || 0;
            const node = new SkillNode(id, skillTree.nodes[id], this.groups[groupId], skillTree.constants.orbitRadii, orbitAngles, this.scale, this.patch);
            if (this.root.out.indexOf(id) >= 0) {
                if (node.classStartIndex === undefined && node.ascendancyName === "") {
                    node.classStartIndex = this.root.out.indexOf(id);
                }
                if (node.ascendancyName !== "") {
                    node.isAscendancyStart = true;
                }
            }

            this.nodes[id] = node;

            if (node.classStartIndex === 3) {
                this.addState(node, SkillNodeStates.Active);
            }

            if (node.ascendancyName !== "") {
                this.ascendancyNodes[id] = node;
            }

            if (node.classStartIndex !== undefined) {
                this.classStartNodes[id] = node;
            }

            if (this.shouldAddToGrid(node)) {
                this.grid.add(node.id, { x: node.x, y: node.y }, node.targetSize)
            }
        }
    }

    private shouldAddToGrid = (node: SkillNode): boolean => {
        return node.group !== undefined && node.classStartIndex === undefined;
    }

    private getOrbitAngles = (skillsPerOrbit: Array<number>): { [orbit: number]: Array<number> } => {
        const degrees: { [orbit: number]: Array<number> } = {};

        for (const orbit in skillsPerOrbit) {
            const skills = skillsPerOrbit[orbit];
            degrees[orbit] = [];

            if (skills === 16) {
                degrees[orbit] = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]
            } else if (skills === 40) {
                degrees[orbit] = [0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170, 180, 190, 200, 210, 220, 225, 230, 240, 250, 260, 270, 280, 290, 300, 310, 315, 320, 330, 340, 350]
            } else {
                for (let i = 0; i < skills; i++) {
                    degrees[orbit].push(360 * i / skills);
                }
            }
        }

        const radians: { [orbit: number]: Array<number> } = {};
        const conversion = Math.PI / 180;
        for (const orbit in degrees) {
            const angles = degrees[orbit];
            radians[orbit] = [];
            for (const angle of angles) {
                radians[orbit].push(angle * conversion);
            }
        }

        return radians;
    }

    public getStartClass = (): number => {
        for (const id in this.classStartNodes) {
            if (this.nodes[id].is(SkillNodeStates.Active)) {
                return this.nodes[id].classStartIndex || 0;
            }
        }

        for (const id in this.classStartNodes) {
            this.addState(this.nodes[id], SkillNodeStates.Active);
            return this.nodes[id].classStartIndex || 0;
        }

        return 0;
    }

    public getAscendancyClass = (): number => {
        for (const id in this.ascendancyNodes) {
            if (this.nodes[id].isAscendancyStart && this.nodes[id].is(SkillNodeStates.Active)) {
                if (this.classes === undefined) {
                    continue;
                }

                for (const classid in this.classes) {
                    const ascendancies = this.classes[classid].ascendancies;
                    if (ascendancies === undefined) {
                        continue;
                    }

                    for (const ascid in ascendancies) {
                        const asc = ascendancies[ascid];
                        if (asc.name === this.nodes[id].name) {
                            return +ascid;
                        }
                    }
                }
            }
        }

        return 0;
    }

    public isAzmeriAscendancyClass = (node: SkillNode): boolean => {
        if (node.ascendancyName === "") {
            return false;
        }

        for (const ascendancy of this.alternate_ascendancies) {
            if (node.ascendancyName === ascendancy.id) {
                return true;
            }
        }

        return false;
    }

    public getMasteryForGroup = (group: IGroup | undefined): SkillNode | null => {
        if (group === undefined || group.nodes === undefined) {
            return null;
        }

        for (const id of group.nodes) {
            const out = this.nodes[id];
            if (!out.isMastery) {
                continue;
            }

            return out;
        }

        return null;
    }

    public getSkilledNodes = (): { [id: string]: SkillNode } => this.getNodes(SkillNodeStates.Active);

    public getHoveredNodes = (): { [id: string]: SkillNode } => {
        const hovered: { [id: string]: SkillNode } = {};

        for (const id in this.getNodes(SkillNodeStates.Hovered)) {
            hovered[id] = this.nodes[id];
        }

        for (const id in this.getNodes(SkillNodeStates.Pathing)) {
            hovered[id] = this.nodes[id];
        }

        return hovered;
    }

    public getNodes = (state: SkillNodeStates): { [id: string]: SkillNode } => {
        const n: { [id: string]: SkillNode } = {};

        for (const id of this.nodesInState[state]) {
            if (this.nodes[id].is(state)) {
                n[id] = this.nodes[id];
            }
        }

        return n;
    }

    public getNodeAtPoint = (point: IPoint): SkillNode | null => {
        const ids = this.grid.find(point, { width: 0, height: 0 });
        if (ids.length === 0) {
            return null;
        }

        let minNode: SkillNode | null = null;
        let minDistance: number | null = null;
        for (const id of ids) {
            const node = this.nodes[id];
            const distance = this.inRange(node, point);
            if (distance === null) {
                continue;
            }
            if (minDistance === null || distance < minDistance) {
                minNode = node;
                minDistance = distance;
            }
        }
        return minNode;
    }

    private inRange = (node: SkillNode, point: IPoint): number | null => {
        const size = node.targetSize;
        const range = size.width * size.height * this.scale;
        const distance = this.getDistance(node, point);
        return distance < range ? distance : null;
    }

    private getDistance = (node: SkillNode, point: IPoint): number => {
        const diff = { x: node.x - point.x, y: node.y - point.y }
        return diff.x * diff.x + diff.y * diff.y;
    }

    public addState = (node: SkillNode, state: SkillNodeStates) => this.addStateById(node.GetId(), state);
    public addStateById = (id: string, state: SkillNodeStates) => {
        if (this.nodes[id] === undefined) {
            return;
        }

        if (this.nodes[id].is(state)) {
            return;
        }

        this.nodes[id]._add(state);
        this.nodesInState[state].push(id);
    }

    public removeState = (node: SkillNode, state: SkillNodeStates) => this.removeStateById(node.GetId(), state);
    public removeStateById = (id: string, state: SkillNodeStates) => {
        if (this.nodes[id] === undefined) {
            return;
        }

        if (!this.nodes[id].is(state)) {
            return;
        }

        this.nodes[id]._remove(state);
        this.nodesInState[state].splice(this.nodesInState[state].indexOf(id), 1);
    }

    public clearState = (state: SkillNodeStates) => {
        for (const id in this.getNodes(state)) {
            this.nodes[id]._remove(state);

            if (state === SkillNodeStates.Hovered) {
                this.nodes[id].hoverText = null;
            }
        }

        this.nodesInState[state] = new Array<string>();
    }

    public hasSprite = (sheet: SpriteSheetKey, icon: string): boolean => {
        return this.sprites[sheet] &&
            ((this.sprites[sheet][this.scale.toString()] && this.sprites[sheet][this.scale.toString()].coords[icon] !== undefined)
                || (this.sprites[sheet]["1"] && this.sprites[sheet]["1"].coords[icon] !== undefined))
    }
}