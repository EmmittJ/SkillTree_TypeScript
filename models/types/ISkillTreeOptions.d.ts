interface ISkillTreeOptions {
    ascClasses: { [id: string]: IAscendancyClasses };
    zoomLevels: Array<number>;
    height: number;
    startClass: number;
    fullScreen: boolean;
    version: string;
    build: {};
    circles: { [id: string]: ICircleOption[] } | undefined
}

interface ICircleOption {
    level: number;
    width: number;
}