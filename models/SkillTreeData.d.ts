import { SkillNode } from "./SkillNode";
export declare class SkillTreeData implements ISkillTreeData {
    characterData: {
        [id: string]: ICharacter;
    };
    groups: {
        [id: string]: IGroup;
    };
    root: IRootNode;
    nodes: {
        [id: string]: SkillNode;
    };
    extraImages: {
        [id: string]: IClassImage;
    };
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
    assets: {
        [id: string]: Array<IAsset>;
    };
    imageRoot: string;
    imageZoomLevels: Array<number>;
    skillSprites: {
        [id: string]: Array<ISpriteSheet>;
    };
    constants: IConstants;
    width: number;
    height: number;
    constructor(skillTree: ISkillTreeData);
}
