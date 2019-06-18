import { ISkillTreeAlternateJewelSettings } from "./ISkillTreeAlternateJewelSettings";

interface ISkillTreeBuild {
    JewelSettings: { [id: number]: ISkillTreeAlternateJewelSettings | undefined };
    TreeHash: string;
}