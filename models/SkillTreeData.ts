import { SkillNode } from "./SkillNode";

export class SkillTreeData implements ISkillTreeData {
    characterData: { [id: string]: ICharacter };
    groups: { [id: string]: IGroup };
    root: IRootNode;
    nodes: { [id: string]: SkillNode };
    extraImages: { [id: string]: IClassImage };
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
    assets: { [id: string]: Array<IAsset> };
    imageRoot: string;
    imageZoomLevels: Array<number>;
    skillSprites: { [id: string]: Array<ISpriteSheet> };
    constants: IConstants;
    width: number;
    height: number;

    constructor(skillTree: ISkillTreeData) {
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
        this.constants = skillTree.constants;
        this.width = Math.abs(this.min_x) + Math.abs(this.max_x);
        this.height = Math.abs(this.min_y) + Math.abs(this.max_y);

        this.nodes = {};
        for (let id in skillTree.nodes) {
            this.nodes[id]
                = new SkillNode(
                    skillTree.nodes[id],
                    skillTree.groups[skillTree.nodes[id].g],
                    skillTree.constants.orbitRadii,
                    skillTree.constants.skillsPerOrbit);
        }
    }
}