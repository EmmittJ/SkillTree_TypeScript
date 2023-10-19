/** 3.2.0 to 3.7.0 */
export class SkillTreeV5Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV5): boolean {
        for (var id in data.nodes) {
            if ((data.nodes[id] as ISkillNodeV6).isBlighted === true) {
                return false;
            }
        }

        return true;
    }

    Process(data: ISkillTreeV5): ISkillTreeV6 {
        var v6 = JSON.parse(JSON.stringify(data)) as ISkillTreeV6;

        const nodes: { [id: string]: ISkillNodeV6 } = {};
        for (const id in data.nodes) {
            nodes[id.toString()] = this.UpgradeNode(data.nodes[id]);
        }
        v6.nodes = nodes;

        return v6;
    }

    private UpgradeNode(node: ISkillNodeV5): ISkillNodeV6 {
        var v6 = node as ISkillNodeV6;
        v6.isBlighted = false;
        return v6;
    }
}