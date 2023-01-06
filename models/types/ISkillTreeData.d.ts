interface ISkillTreeData extends ISkillTreeV12 {
    patch: string;
    version: number;
    fullscreen: number;

    getStartClass(): number;
    getAscendancyClass(): number;
    getSkilledNodes(): { [id: string]: ISkillNode };
    getHoveredNodes(): { [id: string]: ISkillNode };
}