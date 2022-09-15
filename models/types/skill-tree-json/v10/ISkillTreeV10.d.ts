interface ISkillTreeV10 extends Omit<ISkillTreeV9, 'tree' | 'classes'> {
    classes: Array<IAscendancyClassesV7> | undefined;
    groups: { [id: string]: IGroupV10 };
    tree: "Default" | "Royale" | "Atlas";
    uiArtOptions: IUIArtOptionsV10 | undefined;
    points: IPoints | undefined;
}