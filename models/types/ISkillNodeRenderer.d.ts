import { SkillNode } from "../SkillNode";

interface ISkillNodeRenderer {
    Initialized: boolean;
    Initialize(): Promise<boolean>;

    CreateFrame(node: SkillNode, others: SkillNode[]): any;
    CreateIcon(node: SkillNode, source: "Base" | "Compare"): any;
    CreateIconEffect(node: SkillNode, source: "Base" | "Compare"): any;
    CreateTooltip(node: SkillNode, source: "Base" | "Compare"): any;
    DestroyTooltip(node: SkillNode, source: "Base" | "Compare"): void;
}