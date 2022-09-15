/** 2.2.0 to 2.4.0 */
export class SkillTreeV3Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV3): boolean {
        return (data as ISkillTreeV4).extraImages === undefined;
    }

    Process(data: ISkillTreeV3): ISkillTreeV4 {
        var v4 = JSON.parse(JSON.stringify(data)) as ISkillTreeV4;

        v4.extraImages = {};

        return v4;
    }
}