interface ISkillTreeV12 extends Omit<ISkillTreeV11, 'groups' | 'uiArtOptions'> {
    groups: { [id: string]: IGroupV12 };
}