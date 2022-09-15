/** 0.9.12 to 2.1.0 */
export class SkillTreeV2Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV2): boolean {
        const init = data.root !== undefined
            && data.root.g !== undefined
            && Array.isArray(data.nodes)
            && Object.keys(data.skillSprites).length >= 6
        if (!init) {
            return false;
        }

        for (var id in data.nodes) {
            const v3 = (data.nodes[id] as ISkillNodeV3);
            if (v3.ascendancyName !== undefined && v3.ascendancyName !== '') {
                return false;
            }
        }

        return true;
    }

    Process(data: ISkillTreeV2): ISkillTreeV3 {
        var v3 = JSON.parse(JSON.stringify(data)) as ISkillTreeV3;

        var nodes: ISkillNodeV3[] = [];
        for (const node of data.nodes) {
            nodes.push(this.UpgradeNode(node))
        }
        v3.nodes = nodes;

        return v3;
    }

    private UpgradeNode(node: ISkillNodeV1): ISkillNodeV3 {
        var v3 = node as ISkillNodeV3;
        v3.isJewelSocket = false;
        v3.isMultipleChoice = false;
        v3.isMultipleChoiceOption = false;
        v3.passivePointsGranted = 0;
        v3.ascendancyName = "";
        v3.isAscendancyStart = false;
        v3.flavourText = [];
        v3.reminderText = [];
        return v3;
    }
}