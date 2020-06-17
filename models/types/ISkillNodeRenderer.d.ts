import { SkillNode } from "../SkillNode";

interface ISkillNodeRenderer {
    GetNodeSize(node: SkillNode, source: "Base" | "Compare"): any;
    CreateConnections(node: SkillNode, others: SkillNode[]): any;
    CreateConnection(node: SkillNode, other: SkillNode): any;
    CreateFrame(node: SkillNode, others: SkillNode[]): any;
    CreateIcon(node: SkillNode, source: "Base" | "Compare"): any;
    CreateHighlight(node: SkillNode, color: number | undefined, source: "Base" | "Compare"): any;
    CreateTooltip(node: SkillNode, source: "Base" | "Compare"): any;
    DestroyTooltip(node: SkillNode, source: "Base" | "Compare"): void;
}