import { SkillNode, SkillNodeStates } from "./SkillNode";
import { Constants } from "./Constants";

export class SkillTreeData implements ISkillTreeData {
    version: number;
    fullscreen: number;
    characterData: { [id: string]: ICharacter };
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

    skillTreeOptions: ISkillTreeOptions;
    width: number;
    height: number;
    scale: number;
    classStartNodes: { [id: string]: SkillNode };
    ascedancyNodes: { [id: string]: SkillNode };
    Build: ISkillTreeBuild;

    constructor(skillTree: ISkillTreeData, options: ISkillTreeOptions) {
        this.version = skillTree.version = 4;
        this.fullscreen = skillTree.fullscreen = 0;
        this.skillTreeOptions = options;
        this.characterData = skillTree.characterData;
        this.groups = skillTree.groups;
        this.root = skillTree.root;
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
        this.width = Math.abs(this.min_x) + Math.abs(this.max_x);
        this.height = Math.abs(this.min_y) + Math.abs(this.max_y);
        this.scale = skillTree.imageZoomLevels[skillTree.imageZoomLevels.length - 1];
        this.Build = <ISkillTreeBuild>{ JewelSettings: {}, TreeHash: '' };

        // #region Fix for old school array style nodes
        let temp: { [id: string]: ISkillNode } = {};
        for (let i in skillTree.nodes) {
            let node = skillTree.nodes[i];
            temp[node.id] = node;
        }
        skillTree.nodes = temp;
        // #endregion
        // #region Setup in/out properties correctly
        {
            for (let id in skillTree.nodes) {
                skillTree.nodes[id].in = [];
            }
            for (let id in skillTree.nodes) {
                if (skillTree.nodes[id].m) {
                    continue;
                }
                for (let outId of skillTree.nodes[id].out) {
                    if (skillTree.nodes[id].in.indexOf(outId) < 0) {
                        skillTree.nodes[id].in.push(outId);
                    }
                    if (skillTree.nodes[outId].out.indexOf(+id) < 0) {
                        skillTree.nodes[outId].out.push(+id);
                    }
                }
                for (let inId of skillTree.nodes[id].in) {
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
        let groupsCompleted: { [id: string]: boolean | undefined } = {};
        for (let id in skillTree.nodes) {
            let node = skillTree.nodes[id];
            if (node.isAscendancyStart && groupsCompleted[node.g] === undefined) {
                let startNode: ISkillNode | undefined = undefined;
                for (let o of node.out) {
                    if (skillTree.nodes[o].spc.length > 0) {
                        startNode = skillTree.nodes[o];
                    }
                }

                for (let o of node.in) {
                    if (skillTree.nodes[o].spc.length > 0) {
                        startNode = skillTree.nodes[o];
                    }
                }

                if (startNode === undefined) {
                    continue;
                }

                let offset = 0;
                let classes = this.skillTreeOptions.ascClasses[startNode.spc[0]].classes;
                for (let i in classes) {
                    if (classes[i].name.toLowerCase().includes(node.ascendancyName.toLowerCase())) {
                        offset = +i - 1;
                        break;
                    }
                }

                let center_threshold = 100;
                let offset_distance = 1450;
                let base_x = 0;
                let base_y = 0;
                let start_group = this.groups[startNode.g];

                if ((start_group.x > -center_threshold && start_group.x < center_threshold) && (start_group.y > -center_threshold && start_group.y < center_threshold)) {
                    base_x = this.min_x * .55;
                    base_y = this.max_y * .80;
                } else if (start_group.x > -center_threshold && start_group.x < center_threshold) {
                    base_x = start_group.x + (Math.sign(start_group.x) * (offset - 1) * offset_distance);
                    base_y = Math.sign(start_group.y) > 0 ? this.max_y * .95 : this.min_y;
                } else {
                    base_x = start_group.x < 0 ? this.min_x * .80 : this.max_x * .95;
                    base_y = start_group.y + (Math.sign(start_group.y) * offset * offset_distance);
                }

                groupsCompleted[node.g] = true;
                for (let oid in skillTree.nodes) {
                    let other = skillTree.nodes[oid];
                    if (groupsCompleted[other.g] === undefined && other.ascendancyName === node.ascendancyName) {
                        let diff_x = this.groups[node.g].x - this.groups[other.g].x;
                        let diff_y = this.groups[node.g].y - this.groups[other.g].y;
                        this.groups[other.g].x = base_x - diff_x;
                        this.groups[other.g].y = base_y - diff_y;
                        groupsCompleted[other.g] = true;
                    }
                }

                this.groups[node.g].x = base_x;
                this.groups[node.g].y = base_y;
            }
        }
        // #endregion

        this.nodes = {};
        this.classStartNodes = {};
        this.ascedancyNodes = {};
        for (let id in skillTree.nodes) {
            let node = new SkillNode(skillTree.nodes[id], skillTree.groups[skillTree.nodes[id].g], skillTree.constants.orbitRadii, skillTree.constants.skillsPerOrbit, this.scale);
            if (node.spc.length > 0 && node.spc.indexOf(options.startClass) >= 0) {
                node.add(SkillNodeStates.Active);
            }

            this.nodes[id] = node;
            if (node.ascendancyName !== "") {
                this.ascedancyNodes[id] = node;
            }
            if (node.spc.length > 0) {
                this.classStartNodes[id] = node;
            }
        }
    }

    public getStartClass = (): number => {
        for (let id in this.classStartNodes) {
            if (this.nodes[id].is(SkillNodeStates.Active)) {
                return this.nodes[id].spc[0];
            }
        }
        return 0;
    }

    public getAscendancyClass = (): number => {
        for (let id in this.ascedancyNodes) {
            if (this.nodes[id].isAscendancyStart && this.nodes[id].is(SkillNodeStates.Active)) {
                for (let classid in this.skillTreeOptions.ascClasses) {
                    for (let ascid in this.skillTreeOptions.ascClasses[classid].classes) {
                        let asc = this.skillTreeOptions.ascClasses[classid].classes[ascid];
                        if (asc.name === this.nodes[id].dn) {
                            return +ascid;
                        }
                    }
                }
            }
        }

        return 0;
    }

    public getSkilledNodes = (): { [id: string]: SkillNode } => {
        let skilled: { [id: string]: SkillNode } = {};
        for (let id in this.nodes) {
            let node = this.nodes[id];
            if (node.is(SkillNodeStates.Active)) {
                skilled[id] = node;
            }
        }
        return skilled;
    }

    public getHoveredNodes = (): { [id: string]: SkillNode } => {
        let hovered: { [id: string]: SkillNode } = {};
        for (let id in this.nodes) {
            let node = this.nodes[id];
            if (node.is(SkillNodeStates.Hovered) || node.is(SkillNodeStates.Pathing)) {
                hovered[id] = node;
            }
        }
        return hovered;
    }

    public getNodes = (state: SkillNodeStates): { [id: string]: SkillNode } => {
        let n: { [id: string]: SkillNode } = {};
        for (let id in this.nodes) {
            let node = this.nodes[id];
            if (node.is(state)) {
                n[id] = node;
            }
        }

        return n;
    }

    public getNodesInRange = (x: number, y: number, range: number) => {
        let _nodes: SkillNode[] = [];
        for (var id in this.nodes) {
            let n = this.nodes[id];
            if (n.m) {
                continue;
            }

            let dx = Math.abs(n.x - x);
            let dy = Math.abs(n.y - y)
            if (dx * dx + dy * dy < range * range && Math.abs(n.y - y) < range) {
                _nodes.push(n);
            }
        }

        return _nodes;
    }

    public clearAlternates = (used_nodes: string[]) => {
        for (let id in this.nodes) {
            if (used_nodes.indexOf(id) > -1) {
                continue;
            }

            this.nodes[id].alternate_ids = undefined;
            this.nodes[id].faction = 0;
        }
    }

    public clearState = (state: SkillNodeStates) => {
        for (let id in this.getNodes(state)) {
            this.nodes[id].remove(state);

            if (state === SkillNodeStates.Hovered) {
                this.nodes[id].hoverText = null;
            }
        }
    }
}