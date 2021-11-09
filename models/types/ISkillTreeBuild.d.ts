interface ISkillTreeBuild {
    NodeAlternateIdMap: { [node_id: string]: ISkillNodeAlternateState[] };
    JewelSettings: { [id: string]: ISkillTreeAlternateJewelSettings | undefined };
    TreeHash: string;
}