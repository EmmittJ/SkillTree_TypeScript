import { SkillNode } from "../SkillNode";

interface ISkillNodeRenderer {
    Initialized: boolean;
    Initialize(): Promise<boolean>;

    CreateIcon(node: SkillNode, source: "Base" | "Compare"): any;
    CreateIconEffect(node: SkillNode, source: "Base" | "Compare"): any;
    CreateTooltip(node: SkillNode, source: "Base" | "Compare"): any;
    DestroyTooltip(node: SkillNode, source: "Base" | "Compare"): void;
}