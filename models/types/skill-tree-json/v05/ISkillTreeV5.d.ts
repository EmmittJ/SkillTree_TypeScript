interface ISkillTreeV5 extends Omit<ISkillTreeV4, 'nodes' | 'root'> {
    root: IRootNodeV5;
    nodes: { [id: string]: ISkillNodeV5 };
}