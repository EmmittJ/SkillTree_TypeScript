/** 3.15.0 */
export class SkillTreeV8Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV8): boolean {
        for (var id in data.nodes) {
            if ((data.nodes[id] as ISkillNodeV9).activeEffectImage !== undefined) {
                return false;
            }
        }

        return true;
    }

    Process(data: ISkillTreeV8): ISkillTreeV9 {
        var v9 = data as ISkillTreeV9;

        const nodes: { [id: string]: ISkillNodeV9 } = {};
        for (const id in data.nodes) {
            nodes[id.toString()] = this.UpgradeNode(data.nodes[id]);
        }
        v9.nodes = nodes;

        return v9;
    }

    private UpgradeNode(node: ISkillNodeV7): ISkillNodeV9 {
        var v9 = node as ISkillNodeV9
        v9.activeEffectImage = undefined;
        v9.activeIcon = undefined;
        v9.inactiveIcon = undefined;
        v9.masteryEffects = undefined;
        return v9
    }
}