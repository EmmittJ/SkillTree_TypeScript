/** 3.23.0 to current */
export class SkillTreeV14Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV14): boolean {
        return data.sprites["azmeri"] === undefined;
    }

    Process(data: ISkillTreeV14): ISkillTreeV15 {
        const v13 = JSON.parse(JSON.stringify(data)) as ISkillTreeV15;
        return v13;
    }
}