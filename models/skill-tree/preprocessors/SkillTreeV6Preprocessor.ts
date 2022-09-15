/** 3.8.0 to 3.9.0 */
export class SkillTreeV6Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV6): boolean {
        return data.root !== undefined;
    }

    Process(data: ISkillTreeV6): ISkillTreeV7 {
        var v7: ISkillTreeV7 = {
            assets: data.assets || {},
            classes: [],
            constants: data.constants || {},
            extraImages: data.extraImages || {},
            groups: {},
            imageZoomLevels: data.imageZoomLevels || [],
            jewelSlots: [],
            max_x: data.max_x,
            max_y: data.max_y,
            min_x: data.min_x,
            min_y: data.min_y,
            nodes: {},
            skillSprites: data.skillSprites || {}
        };

        for (const id in data.characterData) {
            const character = data.characterData[id];
            const name = this.ClassIdToName(+id);
            if (name === null) continue;
            v7.classes[+id] = {
                ascendancies: [],
                base_dex: character.base_dex,
                base_int: character.base_int,
                base_str: character.base_str,
                name: name
            };
        }

        const nodes: { [id: string]: ISkillNodeV7 } = {};
        for (const id in data.nodes) {
            nodes[id.toString()] = this.UpgradeNode(data.nodes[id]);
        }
        nodes["root"] = this.UpgradeNode(data.root as ISkillNodeV6);
        v7.nodes = nodes;

        const groups: { [id: string]: IGroupV7 } = {};
        for (const id in data.groups) {
            groups[id.toString()] = this.UpgradeGroup(data.groups[id]);
        }
        v7.groups = groups;
        
        return v7;
    }

    private UpgradeNode(node: ISkillNodeV6): ISkillNodeV7 {
        return {
            ascendancyName: node.ascendancyName || "",
            classStartIndex: (node.spc && node.spc.length > 0) ? node.spc[0] : undefined,
            expansionJewel: undefined,
            flavourText: node.flavourText || [],
            grantedDexterity: node.da || 0,
            grantedIntelligence: node.ia || 0,
            grantedPassivePoints: node.passivePointsGranted || 0,
            grantedStrength: node.sa || 0,
            group: node.g,
            icon: node.icon,
            in: (node.in || []).map(x => x.toString()) || [],
            isAscendancyStart: node.isAscendancyStart || false,
            isBlighted: node.isBlighted || false,
            isJewelSocket: node.isJewelSocket || false,
            isKeystone: node.ks || false,
            isMastery: node.m || false,
            isMultipleChoice: node.isMultipleChoice || false,
            isMultipleChoiceOption: node.isMultipleChoiceOption || false,
            isNotable: node.not || false,
            isProxy: false,
            name: node.dn || "",
            orbit: node.o || 0,
            orbitIndex: node.oidx || 0,
            out: (node.out || []).map(x => x.toString()) || [],
            recipe: [],
            reminderText: node.reminderText || [],
            skill: +node.id || -1,
            stats: node.sd || []
        };
    }

    private UpgradeGroup(group: IGroupV1): IGroupV7 {
        var orbits: number[] = [];
        if (Array.isArray(group.oo)) {
            group.oo = { "0": group.oo[0] };
        }
        for (const id in group.oo) {
            orbits.push(+id);
        }

        return {
            isProxy: false,
            nodes: (group.n || []).map(n => n.toString()),
            orbits: orbits,
            x: group.x,
            y: group.y
        }
    }

    private ClassIdToName(id: number): string | null {
        switch (id) {
            case 0: return "Scion";
            case 1: return "Marauder";
            case 2: return "Ranger";
            case 3: return "Witch";
            case 4: return "Duelist";
            case 5: return "Templar";
            case 6: return "Shadow";
            default: return null;
        }
    }
}