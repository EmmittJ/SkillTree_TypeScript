/** 3.20.0 to current */
export class SkillTreeV11Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV11): boolean {
        for (const id in data.groups) {
            const group = data.groups[id] as any;
            if (group.background) {
                return false;
            }
        }
        return true;
    }

    Process(data: ISkillTreeV11): ISkillTreeV12 {
        const v12 = JSON.parse(JSON.stringify(data)) as ISkillTreeV12;

        const upgradedGroups = this.UpgradeGroups(data);
        v12.groups = upgradedGroups;

        delete (v12 as any).uiArtOptions
        return v12;
    }

    private UpgradeGroups(data: ISkillTreeV11): { [id: string]: IGroupV12 } {
        var groups: { [id: string]: IGroupV12 } = {};
        for (const id in data.groups) {
            const group = data.groups[id];
            const nodes = group.nodes || [];
            if (nodes.length === 0 || nodes.find(id => data.nodes[id].ascendancyName !== undefined) !== undefined) {
                groups[id] = this.CopyGroup(group);
                continue;
            }

            let orbits = group.orbits || [];
            orbits = orbits.filter(x => x <= 3);
            const max = group.backgroundOverride !== undefined && group.backgroundOverride !== 0 ? group.backgroundOverride : Math.max(...orbits);
            if (max <= 0 || max > 3) {
                groups[id] = this.CopyGroup(group);
                continue;
            }

            groups[id] = this.UpgradeGroup(group, max, (data.uiArtOptions == undefined) ? true : data.uiArtOptions.largeGroupUsesHalfImage);
        }
        return groups
    }

    private CopyGroup(group: IGroupV10): IGroupV12 {
        return {
            x: group.x,
            y: group.y,
            isProxy: group.isProxy,
            orbits: group.orbits,
            nodes: group.nodes,
            background: undefined
        }
    }

    private UpgradeGroup(group: IGroupV10, max: number, largeGroupUsesHalfImage: boolean | undefined): IGroupV12 {
        var v12 = this.CopyGroup(group);
        v12.background = {
            image: this.MapBackground(max),
            isHalfImage: (max === 3 && largeGroupUsesHalfImage) ? true : undefined,
            offsetX: undefined,
            offsetY: undefined
        }
        return v12;
    }

    private MapBackground(max: number): BackgroundKey {
        switch (max) {
            case 1:
                return "PSGroupBackground1";
            case 2:
                return "PSGroupBackground2";
            case 3:
                return "PSGroupBackground3";
            default:
                throw new Error(`Unhandled BackgroundKey: ${max}`);
        }
    }
}