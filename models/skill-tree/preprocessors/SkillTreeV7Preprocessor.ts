/** 3.10.0 to 3.14.0 */
export class SkillTreeV7Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV7): boolean {
        return (data as ISkillTreeV8).tree === undefined;
    }

    Process(data: ISkillTreeV7): ISkillTreeV8 {
        var v8 = data as ISkillTreeV8;
        v8.tree = "Default";
        return v8;
    }
}