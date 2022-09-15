/** Clean up after all versions are done */
export class SkillTreePreprocessor implements ISkillTreePreprocessor {
    CanProcess(_: ISkillTreeData): boolean {
        return true;
    }

    Process(data: ISkillTreeData): ISkillTreeData {
        data.nodes["root"].in = data.nodes["root"].in || [];
        data.nodes["root"].out = data.nodes["root"].out || [];

        const nodes: { [id: string]: ISkillNodeV9 } = {};
        for (const id in data.nodes) {
            nodes[id.toString()] = this.FixNode(id, data.nodes[id]);
        }

        for (const id in nodes) {
            if (id === "root") continue;

            for (const outId of nodes[id].out) {
                if (outId === "root") continue;

                if (nodes[id].in.indexOf(outId) < 0) {
                    nodes[id].in.push(outId);
                }
                if (!nodes[outId].isMastery && nodes[outId].out.indexOf(id) < 0) {
                    nodes[outId].out.push(id);
                }
            }

            for (const inId of nodes[id].in) {
                if (inId === "root") continue;

                if (!nodes[id].isMastery && nodes[id].out.indexOf(inId) < 0) {
                    nodes[id].out.push(inId);
                }
                if (nodes[inId].in.indexOf(id) < 0) {
                    nodes[inId].in.push(id);
                }
            }
        }

        data.nodes = nodes;

        for (var id in data.sprites) {
            for (var zoom in data.sprites[id]) {
                data.sprites[id][zoom].filename = data.sprites[id][zoom].filename.replace("https://web.poecdn.com/image/passive-skill/", "");
            }
        }

        for (const id in data.groups) {
            const group = data.groups[id];
            data.groups[id].nodes = (group.nodes || []).map(n => n.toString());
            data.groups[id].orbits = group.orbits || [];
        }

        return data;
    }

    private FixNode(id: string, node: ISkillNodeV9): ISkillNodeV9 {
        node.in = (node.in || []).map(x => x.toString()) || [];
        node.out = (node.out || []).map(x => x.toString()) || [];
        node.in = node.in.filter(x => x !== id);
        node.out = node.out.filter(x => x !== id);
        return node;
    }
}