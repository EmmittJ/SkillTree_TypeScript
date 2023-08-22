interface ISkillTreeV13 extends Omit<ISkillTreeV12, 'nodes'> {
    nodes: { [id: string]: ISkillNodeV13 };
}