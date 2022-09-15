interface ISkillTreeOptionsV1 extends ISkillTreeOptionsBase {
    ascClasses: { [id: string]: IAscendancyClassesV1 };
    build: any;
    fullscreen: boolean;
    height: number;
    startClass: number;
    version: string;
    zoomLevels: Array<number>;
}
