import { SkillTreeData } from "../SkillTreeData";
import { ISkillNodeRenderer } from "./ISkillNodeRenderer";

interface ISkillTreeRenderer {
    SkillNodeRenderer: ISkillNodeRenderer;
    Initialized: boolean;
    Initialize(container: HTMLElement, skillTreeData: SkillTreeData, skillTreeData_compare: SkillTreeData | undefined): Promise<boolean>;

    RenderActive(): void;
    RenderBase(): void;
    RenderCharacterStartsActive(): void;
    RenderHighlight(): void;
    StartRenderHover(): void;
    StopRenderHover(): void;
}