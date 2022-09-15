/** 2.5.0 to 3.1.0 */
export class SkillTreeV4Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV4): boolean {
        return Array.isArray(data.nodes);
    }

    Process(data: ISkillTreeV4): ISkillTreeV5 {
        var v5 = JSON.parse(JSON.stringify(data)) as ISkillTreeV5;

        const nodes: { [id: string]: ISkillNodeV5 } = {};
        for (const node of data.nodes) {
            nodes[node.id.toString()] = this.UpgradeNode(node);
        }
        v5.nodes = nodes;

        return v5;
    }

    private UpgradeNode(node: ISkillNodeV3): ISkillNodeV5 {
        var v5 = node as ISkillNodeV5;
        if (v5.out === undefined)
            v5.out = [];
        if (v5.in === undefined)
            v5.in = [];
        return v5;
    }
}