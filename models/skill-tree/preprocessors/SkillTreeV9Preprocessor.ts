/** 3.16.0 to 3.18.0 */
export class SkillTreeV9Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV9): boolean {
        return (data as ISkillTreeV10).points === undefined;
    }

    Process(data: ISkillTreeV9): ISkillTreeV10 {
        var v10 = data as ISkillTreeV10;

        v10.points = { totalPoints: 121, ascendancyPoints: 8 };

        return v10;
    }
}