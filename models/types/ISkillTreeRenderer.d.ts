import { SkillTreeData } from "../SkillTreeData";
import { ISkillNodeRenderer } from "./ISkillNodeRenderer";
import { SkillTreeAlternate } from "../SkillTreeAlternate";
import { SkillNode } from "../SkillNode";

interface ISkillTreeRenderer {
    SkillNodeRenderer: ISkillNodeRenderer;
    Initialized: boolean;
    Initialize(): Promise<boolean>;

    RenderActive(): void;
    RenderBase(): void;
    RenderCharacterStartsActive(): void;
    RenderHighlight(): void;
    StartRenderHover(skillNode: SkillNode): void;
    StopRenderHover(): void;
    CreateScreenshot(mimeType: "image/jpeg" | "image/webp"): string;
}