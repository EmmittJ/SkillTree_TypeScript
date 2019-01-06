import { SkillNode, SkillNodeStates } from "./SkillNode";
import { Constants } from "./Constants";
import { SkillTreeUtilities } from "./SkillTreeUtilities";

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

    skillTreeOtions: ISkillTreeOptions;
    skillTreeUtilities: SkillTreeUtilities;
    width: number;
    height: number;
    classStartNodes: { [id: string]: SkillNode };
    ascedancyStartNodes: { [id: string]: SkillNode };

    constructor(skillTree: ISkillTreeData, options: ISkillTreeOptions) {
        this.version = skillTree.version = 4;
        this.fullscreen = skillTree.fullscreen = 0;
        this.skillTreeOtions = options;
        this.skillTreeUtilities = new SkillTreeUtilities(this);
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
        this.skillSprites = skillTree.skillSprites
        this.constants = new Constants(skillTree.constants);
        this.width = Math.abs(this.min_x) + Math.abs(this.max_x);
        this.height = Math.abs(this.min_y) + Math.abs(this.max_y);

        // Setup in/out properties correctly
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

        let scale = skillTree.imageZoomLevels[skillTree.imageZoomLevels.length - 1];
        this.nodes = {};
        this.classStartNodes = {};
        this.ascedancyStartNodes = {};
        for (let id in skillTree.nodes) {
            let node
                = new SkillNode(
                    skillTree.nodes[id],
                    skillTree.groups[skillTree.nodes[id].g],
                    skillTree.constants.orbitRadii,
                    skillTree.constants.skillsPerOrbit,
                    scale,
                    this.skillTreeUtilities);
            if (node.spc.length > 0 && node.spc.indexOf(options.startClass) >= 0) {
                node.add(SkillNodeStates.Active);
            }

            this.nodes[id] = node;
            if (node.isAscendancyStart) {
                this.ascedancyStartNodes[id] = node;
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
        for (let id in this.ascedancyStartNodes) {
            if (this.nodes[id].is(SkillNodeStates.Active)) {
                for (let classid in this.skillTreeOtions.ascClasses) {
                    for (let ascid in this.skillTreeOtions.ascClasses[classid].classes) {
                        let asc = this.skillTreeOtions.ascClasses[classid].classes[ascid];
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
}