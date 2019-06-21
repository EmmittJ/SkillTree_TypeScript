interface ISkillTreeBuild {
    NodeAlternateIdMap: { [node_id: number]: ISkillNodeAlternateState[] };
    JewelSettings: { [id: number]: ISkillTreeAlternateJewelSettings | undefined };
    TreeHash: string;
}