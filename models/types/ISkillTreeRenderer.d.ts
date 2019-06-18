import { SkillTreeData } from "../SkillTreeData";
import { ISkillNodeRenderer } from "./ISkillNodeRenderer";
import { SkillTreeAlternate } from "../SkillTreeAlternate";

interface ISkillTreeRenderer {
    SkillNodeRenderer: ISkillNodeRenderer;
    Initialized: boolean;
    Initialize(container: HTMLElement, skillTreeData: SkillTreeData, skillTreeAlternate: SkillTreeAlternate, skillTreeData_compare: SkillTreeData | undefined): Promise<boolean>;

    RenderActive(): void;
    RenderBase(): void;
    RenderCharacterStartsActive(): void;
    RenderHighlight(): void;
    StartRenderHover(): void;
    StopRenderHover(): void;
    CreateScreenshot(mimeType: "image/jpeg" | "image/webp"): string;
}