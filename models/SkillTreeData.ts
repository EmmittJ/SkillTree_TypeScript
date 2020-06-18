import { SkillNode, SkillNodeStates } from "./SkillNode";
import { Constants } from "./Constants";

export class SkillTreeData implements ISkillTreeData {
    patch: string;
    version: number;
    fullscreen: number;
    characterData: { [id: string]: ICharacter };
    classes: IAscendancyClasses[];
    groups: { [id: string]: IGroup };
    root: IRootNode;
    nodes: { [id: string]: SkillNode };
    extraImages: { [id: string]: IClassImage };
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

    width: number;
    height: number;
    scale: number;
    classStartNodes: { [id: string]: SkillNode };
    ascedancyNodes: { [id: string]: SkillNode };
    Build: ISkillTreeBuild;

    constructor(skillTree: ISkillTreeData, patch: string, options: ISkillTreeOptions | undefined) {
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
        this.skillSprites = skillTree.skillSprites;
        this.constants = new Constants(skillTree.constants);
        this.circles = (options && options.circles) || { "Small": [{ "level": 0.1246, "width": 199 }, { "level": 0.2109, "width": 337 }, { "level": 0.2972, "width": 476 }, { "level": 0.3835, "width": 614 }], "Medium": [{ "level": 0.1246, "width": 299 }, { "level": 0.2109, "width": 506 }, { "level": 0.2972, "width": 713 }, { "level": 0.3835, "width": 920 }], "Large": [{ "level": 0.1246, "width": 374 }, { "level": 0.2109, "width": 633 }, { "level": 0.2972, "width": 892 }, { "level": 0.3835, "width": 1151 }] };
        this.width = Math.abs(this.min_x) + Math.abs(this.max_x);
        this.height = Math.abs(this.min_y) + Math.abs(this.max_y);
        this.scale = skillTree.imageZoomLevels[skillTree.imageZoomLevels.length - 1];
        this.Build = { JewelSettings: {}, TreeHash: '' } as ISkillTreeBuild;

        // #region Fix for old school style nodes
        const temp: { [id: string]: ISkillNode } = {};
        for (const i in skillTree.nodes) {
            if (i === "root") continue;
            const node = skillTree.nodes[i];
            if (node.out === undefined) node.out = [];
            if (node.in === undefined) node.in = [];
            if (node.classStartIndex === undefined) node.classStartIndex = (node.spc && node.spc.length > 0) ? node.spc[0] : undefined;

            temp[node.id || node.skill] = node;
        }
        skillTree.nodes = temp;
        // #endregion
        // #region Setup in/out properties correctly
        {
            for (const id in skillTree.nodes) {
                skillTree.nodes[id].in = [];
            }
            for (const id in skillTree.nodes) {
                if (skillTree.nodes[id].isMastery) {
                    continue;
                }

                for (const outId of skillTree.nodes[id].out) {
                    if (skillTree.nodes[id].in.indexOf(outId) < 0) {
                        skillTree.nodes[id].in.push(outId);
                    }
                    if (skillTree.nodes[outId].out.indexOf(+id) < 0) {
                        skillTree.nodes[outId].out.push(+id);
                    }
                }

                for (const inId of skillTree.nodes[id].in) {
                    if (skillTree.nodes[id].out.indexOf(inId) < 0) {
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
                } else if (startGroup.x > -centerThreshold && startGroup.x < centerThreshold) {
                    // Witch, Duelist
                    baseX = startGroup.x + (Math.sign(startGroup.x) * offset * offsetDistance);
                    baseY = Math.sign(startGroup.y) > 0 ? this.max_y * 1.05 : this.min_y;
                } else {
                    // Templar, Marauder, Ranger, Shadow 
                    baseX = startGroup.x < 0 ? this.min_x * .80 : this.max_x;
                    baseY = startGroup.y + (Math.sign(startGroup.y) * (offset + 1) * offsetDistance);
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
        for (const id in skillTree.nodes) {
            const groupId = skillTree.nodes[id].g || skillTree.nodes[id].group || 0;
            const node = new SkillNode(skillTree.nodes[id], skillTree.groups[groupId], skillTree.constants.orbitRadii, skillTree.constants.skillsPerOrbit, this.scale);
            if (node.classStartIndex === 3) {
                node.add(SkillNodeStates.Active);
            }

            this.nodes[id] = node;
            if (node.ascendancyName !== "") {
                this.ascedancyNodes[id] = node;
            }
            if (node.classStartIndex !== undefined) {
                this.classStartNodes[id] = node;
            }
        }
    }

    public getStartClass = (): number => {
        for (const id in this.classStartNodes) {
            if (this.nodes[id].is(SkillNodeStates.Active)) {
                return this.nodes[id].classStartIndex || 0;
            }
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

    public getSkilledNodes = (): { [id: string]: SkillNode } => {
        const skilled: { [id: string]: SkillNode } = {};
        for (const id in this.nodes) {
            const node = this.nodes[id];
            if (node.is(SkillNodeStates.Active)) {
                skilled[id] = node;
            }
        }
        return skilled;
    }

    public getHoveredNodes = (): { [id: string]: SkillNode } => {
        const hovered: { [id: string]: SkillNode } = {};
        for (const id in this.nodes) {
            const node = this.nodes[id];
            if (node.is(SkillNodeStates.Hovered) || node.is(SkillNodeStates.Pathing)) {
                hovered[id] = node;
            }
        }
        return hovered;
    }

    public getNodes = (state: SkillNodeStates): { [id: string]: SkillNode } => {
        const n: { [id: string]: SkillNode } = {};
        for (const id in this.nodes) {
            const node = this.nodes[id];
            if (node.is(state)) {
                n[id] = node;
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

    public clearAlternates = (usedNodes: string[]) => {
        for (const id in this.nodes) {
            if (usedNodes.indexOf(id) > -1) {
                continue;
            }

            this.nodes[id].alternateIds = undefined;
            this.nodes[id].faction = 0;
        }
    }

    public clearState = (state: SkillNodeStates) => {
        for (const id in this.getNodes(state)) {
            this.nodes[id].remove(state);

            if (state === SkillNodeStates.Hovered) {
                this.nodes[id].hoverText = null;
            }
        }
    }
}