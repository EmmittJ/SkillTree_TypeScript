import { SemVer } from "semver";

interface ISkillTreeData extends ISkillTreeV13 {
    patch: SemVer;
    version: number;
    masteryEffects: { [id: number]: number }

    getStartClass(): number;
    getAscendancyClass(): number;
    getSkilledNodes(): { [id: string]: ISkillNode };
    getHoveredNodes(): { [id: string]: ISkillNode };
}