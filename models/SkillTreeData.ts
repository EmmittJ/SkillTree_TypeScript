import { SkillNode, SkillNodeStates } from "./SkillNode";
import { Constants } from "./Constants";

export class SkillTreeData implements ISkillTreeData {
    tree: "Default" | "Royale" | "Atlas" | undefined;
    patch: string;
    version: number;
    fullscreen: number;
    characterData: { [id: string]: ICharacter };
    classes: IAscendancyClasses[];
    groups: { [id: string]: IGroup };
    root: IRootNode;
    nodes: { [id: string]: SkillNode };
    extraImages: { [id: string]: IClassImage } | undefined;
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
    assets: { [id: string]: { [zoomLevel: string]: string } };
    imageRoot: string;
    imageZoomLevels: Array<number>;
    skillSprites: { [id: string]: Array<ISpriteSheet> };
    constants: Constants;
    circles: { [id: string]: ICircleOption[] };
    uiArtOptions: IUIArtOptions;
    points: IPoints;

    width: number;
    height: number;
    scale: number;
    classStartNodes: { [id: string]: SkillNode };
    ascedancyNodes: { [id: string]: SkillNode };
    nodesInState: { [state in SkillNodeStates]: Array<string> } = {
        [SkillNodeStates.None]: new Array<string>(),
        [SkillNodeStates.Active]: new Array<string>(),
        [SkillNodeStates.Hovered]: new Array<string>(),
        [SkillNodeStates.Pathing]: new Array<string>(),
        [SkillNodeStates.Highlighted]: new Array<string>(),
        [SkillNodeStates.Compared]: new Array<string>(),
        [SkillNodeStates.Moved]: new Array<string>(),
    }

    constructor(skillTree: ISkillTreeData, patch: string, options: ISkillTreeOptions | undefined) {
        this.tree = skillTree.tree || "Default"
        this.patch = patch || (options && options.version) || "test"
        this.version = 4; skillTree.version = this.version;
        this.fullscreen = skillTree.fullscreen = 0;
        //this.skillTreeOptions = options;
        this.characterData = skillTree.characterData;
        this.groups = skillTree.groups;
        this.root = skillTree.root || skillTree.nodes["root"];
        this.extraImages = skillTree.extraImages;
        this.min_x = skillTree.min_x;
        this.max_x = skillTree.max_x;
        this.min_y = skillTree.min_y;
        this.max_y = skillTree.max_y;
        this.assets = skillTree.assets;
        this.imageRoot = skillTree.imageRoot;
        this.imageZoomLevels = skillTree.imageZoomLevels;
        this.constants = new Constants(skillTree.constants);
        this.uiArtOptions = skillTree.uiArtOptions || { largeGroupUsesHalfImage: true };
        this.points = skillTree.points || { totalPoints: 121, ascendancyPoints: 8 };
        this.circles = (options && options.circles) || { "Small": [{ "level": 0.1246, "width": 199 }, { "level": 0.2109, "width": 337 }, { "level": 0.2972, "width": 476 }, { "level": 0.3835, "width": 614 }], "Medium": [{ "level": 0.1246, "width": 299 }, { "level": 0.2109, "width": 506 }, { "level": 0.2972, "width": 713 }, { "level": 0.3835, "width": 920 }], "Large": [{ "level": 0.1246, "width": 374 }, { "level": 0.2109, "width": 633 }, { "level": 0.2972, "width": 892 }, { "level": 0.3835, "width": 1151 }] };
        this.width = Math.abs(this.min_x) + Math.abs(this.max_x);
        this.height = Math.abs(this.min_y) + Math.abs(this.max_y);
        this.scale = skillTree.imageZoomLevels[skillTree.imageZoomLevels.length - 1];

        // #region Fix for old school style skill sprites 
        this.skillSprites = {};
        for (const i in skillTree.skillSprites) {
            const sprites = skillTree.skillSprites[i];
            if (i === "active" || i === "inactive") {
                const key = i.charAt(0).toUpperCase() + i.slice(1);
                const sheets: { [id: string]: ISpriteSheet[] } = {};
                sheets[`notable${key}`] = [];
                sheets[`keystone${key}`] = [];
                sheets[`normal${key}`] = [];

                for (const sheet of sprites) {
                    const old = sheet as ISpriteSheetOld;

                    const notableCoords = old.notableCoords === undefined ? old.coords : old.notableCoords;
                    const keystoneCoords = old.notableCoords === undefined ? old.coords : old.notableCoords;
                    const normalCoords = old.coords;

                    sheets[`notable${key}`].push({ filename: old.filename, coords: notableCoords });
                    sheets[`keystone${key}`].push({ filename: old.filename, coords: keystoneCoords });
                    sheets[`normal${key}`].push({ filename: old.filename, coords: normalCoords });
                }

                for (const j in sheets) {
                    this.skillSprites[j] = sheets[j];
                }
            } else {
                this.skillSprites[i] = sprites;
            }
        }
        // #endregion
        // #region Fix for old school style nodes
        const temp: { [id: string]: ISkillNode } = {};
        for (const i in skillTree.nodes) {
            if (i === "root") continue;
            const node = skillTree.nodes[i];
            if (node.out === undefined) node.out = [];
            if (node.in === undefined) node.in = [];
            if (node.classStartIndex === undefined) node.classStartIndex = (node.spc && node.spc.length > 0) ? node.spc[0] : undefined;

            temp[`${node.id || node.skill}`] = node;
        }
        skillTree.nodes = temp;
        // #endregion
        // #region Setup in/out properties correctly
        {
            this.root.in = this.root.in === undefined ? [] : this.root.in.map(x => +x);
            this.root.out = this.root.out.map(x => +x);

            for (const id in skillTree.nodes) {
                skillTree.nodes[id].in = skillTree.nodes[id].in.map(x => +x).filter(x => x !== +id);
                skillTree.nodes[id].out = skillTree.nodes[id].out.map(x => +x).filter(x => x !== +id);
            }

            for (const id in skillTree.nodes) {
                for (const outId of skillTree.nodes[id].out) {
                    if (skillTree.nodes[id].in.indexOf(outId) < 0) {
                        skillTree.nodes[id].in.push(outId);
                    }
                    if (!skillTree.nodes[outId].isMastery && skillTree.nodes[outId].out.indexOf(+id) < 0) {
                        skillTree.nodes[outId].out.push(+id);
                    }
                }

                for (const inId of skillTree.nodes[id].in) {
                    if (!skillTree.nodes[id].isMastery && skillTree.nodes[id].out.indexOf(inId) < 0) {
                        skillTree.nodes[id].out.push(inId);
                    }
                    if (skillTree.nodes[inId].in.indexOf(+id) < 0) {
                        skillTree.nodes[inId].in.push(+id);
                    }
                }
            }
        }
        // #endregion
        // #region Fix ascendancy groups
        if (skillTree.classes !== undefined) {
            this.classes = skillTree.classes;
        } else {
            this.classes = [];
            if (options && options.ascClasses) {
                for (const id in options.ascClasses) {
                    const character = options.ascClasses[id];
                    character.name = this.constants.classIdToName[+id];
                    if (character.ascendancies === undefined) character.ascendancies = character.classes;
                    this.classes[+id] = character;
                }
            }
        }

        const groupsCompleted: { [id: string]: boolean | undefined } = {};
        for (const id in skillTree.nodes) {
            const node = skillTree.nodes[id];
            const nodeGroupId = node.g || node.group || 0;
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
                        if (classes[i].name.toLowerCase().includes(node.ascendancyName.toLowerCase())) {
                            offset = +i - 1;
                            break;
                        }
                    }
                }

                const centerThreshold = 100;
                const offsetDistance = 1450;
                let baseX = 0;
                let baseY = 0;
                const startGroup = this.groups[startNode.g || startNode.group || 0];

                if ((startGroup.x > -centerThreshold && startGroup.x < centerThreshold) && (startGroup.y > -centerThreshold && startGroup.y < centerThreshold)) {
                    // Scion
                    baseX = this.min_x * .65;
                    baseY = this.max_y * .95;
                    if (this.patch >= '3.16.0') {
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
                    if (this.patch >= '3.16.0') {
                        baseX = startGroup.x < 0 ? this.min_x * 1.05 : this.max_x;
                    }
                }

                groupsCompleted[nodeGroupId] = true;
                for (const oid in skillTree.nodes) {
                    const other = skillTree.nodes[oid];
                    const otherGroupId = other.g || other.group || 0;
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
        // #endregion

        this.nodes = {};
        this.classStartNodes = {};
        this.ascedancyNodes = {};
        const orbitAngles = this.getOrbitAngles(skillTree.constants.skillsPerOrbit)
        for (const id in skillTree.nodes) {
            const groupId = skillTree.nodes[id].g || skillTree.nodes[id].group || 0;
            const node = new SkillNode(skillTree.nodes[id], skillTree.groups[groupId], skillTree.constants.orbitRadii, orbitAngles, this.scale);
            if (this.root.out.indexOf(+id) >= 0 && node.classStartIndex === undefined) {
                node.classStartIndex = this.root.out.indexOf(+id);
            }

            this.nodes[id] = node;

            if (node.classStartIndex === 3) {
                this.addState(node, SkillNodeStates.Active);
            }

            if (node.ascendancyName !== "") {
                this.ascedancyNodes[id] = node;
            }

            if (node.classStartIndex !== undefined) {
                this.classStartNodes[id] = node;
            }
        }
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
        for (const id in this.ascedancyNodes) {
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

    public getNodesInRange = (x: number, y: number, range: number) => {
        const _nodes: SkillNode[] = [];
        for (const id in this.nodes) {
            const n = this.nodes[id];
            if (n.isMastery) {
                continue;
            }

            const dx = Math.abs(n.x - x);
            const dy = Math.abs(n.y - y)
            if (dx * dx + dy * dy < range * range && Math.abs(n.y - y) < range) {
                _nodes.push(n);
            }
        }

        return _nodes;
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
}