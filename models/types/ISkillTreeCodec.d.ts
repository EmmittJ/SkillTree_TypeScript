import { ISkillTreeData } from "./ISkillTreeData";

interface ISkillTreeCodec {
    encodeURL(skillTreeData: ISkillTreeData): string;
    decodeURL(encoding: string, skillTreeData: ISkillTreeData): SkillTreeDefinition;
}

type SkillTreeDefinition = {
    Version: number;
    Class: number;
    Ascendancy: number;
    Nodes: Array<ISkillNode>;
    ExtendedNodes: Array<ISkillNode>;
    MasteryEffects: Array<[node: ISkillNode, effect: number]>;
}