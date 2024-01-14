/** 3.21.0 to 3.22.0 */
export class SkillTreeV12Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV12): boolean {
        return data.tree === "Atlas" && data.sprites["wormholeInactive"] === undefined;
    }

    Process(data: ISkillTreeV12): ISkillTreeV13 {
        const v13 = JSON.parse(JSON.stringify(data)) as ISkillTreeV13;
        // nothing to do since "isWormhole is already undefined
        return v13;
    }
}