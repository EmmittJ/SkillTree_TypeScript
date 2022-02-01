interface ISkillTreeData {
    tree: "Default" | "Royale" | undefined;
    patch: string;
    version: number;
    fullscreen: number;
    characterData: { [id: string]: ICharacter };
    classes: IAscendancyClasses[] | undefined;
    groups: { [id: string]: IGroup };
    root: IRootNode;
    nodes: { [id: string]: ISkillNode };
    extraImages: { [id: string]: IClassImage } | undefined;
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
    assets: { [id: string]: { [zoomLevel: string]: string } };
    imageRoot: string;
    imageZoomLevels: Array<number>;
    skillSprites: { [id: string]: Array<ISpriteSheet> };
    constants: IConstants;

    getStartClass(): number;
    getAscendancyClass(): number;
    getSkilledNodes(): { [id: string]: ISkillNode };
    getHoveredNodes(): { [id: string]: ISkillNode };
}