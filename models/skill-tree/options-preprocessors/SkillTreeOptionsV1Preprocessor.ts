/** 2.2.0 to 3.7.0 */
export class SkillTreeOptionsV1Preprocessor implements ISkillTreeOptionsPreprocessor {
    CanProcess(data: ISkillTreeOptionsV1): boolean {
        return (data as ISkillTreeOptionsV2).circles === undefined;
    }

    Process(data: ISkillTreeOptionsV1): ISkillTreeOptionsV2 {
        let v2 = data as ISkillTreeOptionsV2;

        v2.realm = 'pc';
        v2.circles = { "Small": [{ "level": 0.1246, "width": 199 }, { "level": 0.2109, "width": 337 }, { "level": 0.2972, "width": 476 }, { "level": 0.3835, "width": 614 }], "Medium": [{ "level": 0.1246, "width": 299 }, { "level": 0.2109, "width": 506 }, { "level": 0.2972, "width": 713 }, { "level": 0.3835, "width": 920 }], "Large": [{ "level": 0.1246, "width": 374 }, { "level": 0.2109, "width": 633 }, { "level": 0.2972, "width": 892 }, { "level": 0.3835, "width": 1151 }] };

        return v2;
    }
}