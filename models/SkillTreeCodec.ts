export class SkillTreeCodec implements ISkillTreeCodec {
    encodeURL(skillTreeData: ISkillTreeData): string {
        const classid = skillTreeData.getStartClass();
        const ascid = skillTreeData.getAscendancyClass();
        const skilledNodes = skillTreeData.getSkilledNodes();
        const bytes = [];
        bytes.push(skillTreeData.version >> 24 & 0xFF);
        bytes.push(skillTreeData.version >> 16 & 0xFF);
        bytes.push(skillTreeData.version >> 8 & 0xFF);
        bytes.push(skillTreeData.version >> 0 & 0xFF);
        bytes.push(classid);
        bytes.push(ascid);
        bytes.push(skillTreeData.fullscreen);

        const nodes = new Array<ISkillNode>();
        for (const id in skilledNodes) {
            nodes.push(skilledNodes[id]);
        }
        nodes.sort((a, b) => { return a.skill - b.skill });

        for (const node of nodes) {
            if (node.classStartIndex !== undefined || node.isAscendancyStart) {
                continue;
            }
            bytes.push(node.skill >> 8 & 0xFF);
            bytes.push(node.skill & 0xFF);
        }

        return this.Uint8ArryToBase64(new Uint8Array(bytes));
    }

    decodeURL(encoding: string, skillTreeData: ISkillTreeData): SkillTreeDefinition {
        const skillTreeDefinition: SkillTreeDefinition = { Version: 4, Class: 0, Ascendancy: 0, Fullscreen: 0, Nodes: new Array<ISkillNode>() };
        const bytes = this.Base64ToUint8Array(encoding);
        skillTreeDefinition.Version = bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3];
        skillTreeDefinition.Class = bytes[4];
        skillTreeDefinition.Ascendancy = bytes[5];

        if (skillTreeDefinition.Version > 3) {
            skillTreeDefinition.Fullscreen = bytes[6];
        }
        for (let i = (skillTreeDefinition.Version > 3 ? 7 : 6); i < bytes.length; i += 2) {
            const id = bytes[i] << 8 | bytes[i + 1];
            const node = skillTreeData.nodes[id];
            if (node !== undefined) {
                skillTreeDefinition.Nodes.push(node);
            }
        }
        return skillTreeDefinition;
    }

    Uint8ArryToBase64 = (arr: Uint8Array): string => {
        return btoa(Array.prototype.map.call(arr, (c: number) => String.fromCharCode(c)).join('')).replace(/\+/gi, "-").replace(/\//gi, "_");
    }

    Base64ToUint8Array = (str: string): Uint8Array => {
        str = atob(str.replace(/-/gi, "+").replace(/_/gi, "/"));
        const arr = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            arr[i] = str.charCodeAt(i);
        }
        return arr;
    }
}