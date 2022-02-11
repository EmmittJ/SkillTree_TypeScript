import { ConnectionStyle, SkillNode } from "../SkillNode";

interface IConnnection {
    asset: string;
    style: ConnectionStyle;
    node: SkillNode;
    other: SkillNode;
    removing: boolean
}