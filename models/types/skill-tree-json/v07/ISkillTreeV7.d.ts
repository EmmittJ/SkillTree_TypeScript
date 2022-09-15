interface ISkillTreeV7 extends Omit<ISkillTreeV6, 'characterData' | 'groups' | 'nodes' | 'root'> {
    classes: Array<IAscendancyClassesV7>;
    groups: { [id: string]: IGroupV7 };
    nodes: { [id: string]: ISkillNodeV7 };
    jewelSlots: Array<number>;
}