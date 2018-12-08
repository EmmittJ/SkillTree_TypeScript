﻿interface ISkillTreeData {
    characterData: { [id: string]: ICharacter };
    groups: { [id: string]: IGroup };
    root: IRootNode;
    nodes: { [id: string]: ISkillNode };
    extraImages: { [id: string]: IClassImage };
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
    assets: { [id: string]: { [zoomLevel: string]: string } };
    imageRoot: string;
    imageZoomLevels: Array<number>;
    skillSprites: { [id: string]: Array<ISpriteSheet> };
    constants: IConstants;
}