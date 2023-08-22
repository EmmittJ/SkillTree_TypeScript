import { SemVer } from "semver";

interface ISkillTreeData extends ISkillTreeV13 {
    patch: SemVer;
    version: number;
    fullscreen: number;

    getStartClass(): number;
    getAscendancyClass(): number;
    getSkilledNodes(): { [id: string]: ISkillNode };
    getHoveredNodes(): { [id: string]: ISkillNode };
}