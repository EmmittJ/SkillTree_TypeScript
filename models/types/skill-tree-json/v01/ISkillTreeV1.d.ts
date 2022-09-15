interface ISkillTreeV1 extends ISkillTreeBase {
    characterData: { [id: string]: ICharacterV1 };
    groups: { [id: string]: IGroupV1 };
    root: IRootNodeV1;
    nodes: Array<ISkillNodeV1>;
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
    assets: { [id: string]: { [zoomLevel: string]: string } };
    constants: IConstantsV1;
    skillSprites: { [id: string]: Array<ISpriteSheetV1> };
    imageZoomLevels: Array<number>;
}