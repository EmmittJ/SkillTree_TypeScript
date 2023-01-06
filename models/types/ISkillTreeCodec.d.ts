import { ISkillTreeData } from "./ISkillTreeData";

interface ISkillTreeCodec {
    encodeURL(skillTreeData: ISkillTreeData): string;
    decodeURL(encoding: string, skillTreeData: ISkillTreeData): SkillTreeDefinition;
}

type SkillTreeDefinition = {
    Version: number;
    Fullscreen: number;
    Class: number;
    Ascendancy: number;
    Nodes: Array<ISkillNode>;
}