/** 3.22.0 to 3.23.0 */
export class SkillTreeV13Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV13): boolean {
        return data.sprites["tattooActiveEffect"] === undefined;
    }

    Process(data: ISkillTreeV13): ISkillTreeV14 {
        const v13 = JSON.parse(JSON.stringify(data)) as ISkillTreeV14;
        return v13;
    }
}