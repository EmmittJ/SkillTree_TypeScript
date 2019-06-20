interface ISkillTreeBuild {
    NodeAlternateIdMap: { [node_id: number]: string[] };
    JewelSettings: { [id: number]: ISkillTreeAlternateJewelSettings | undefined };
    TreeHash: string;
}