import { SkillTreeData } from "./SkillTreeData";

export class SkillTreeCodec implements ISkillTreeCodec {
    encodeURL(skillTreeData: ISkillTreeData): string {
        let classid = skillTreeData.getStartClass();
        let ascid = skillTreeData.getAscendancyClass();
        let skilledNodes = skillTreeData.getSkilledNodes();
        let bytes = [];
        bytes.push(skillTreeData.version >> 24 & 0xFF);
        bytes.push(skillTreeData.version >> 16 & 0xFF);
        bytes.push(skillTreeData.version >> 8 & 0xFF);
        bytes.push(skillTreeData.version >> 0 & 0xFF);
        bytes.push(classid);
        bytes.push(ascid);
        bytes.push(skillTreeData.fullscreen);

        let nodes = new Array<ISkillNode>();
        for (let id in skilledNodes) {
            nodes.push(skilledNodes[id]);
        }
        nodes.sort((a, b) => { return a.id - b.id });

        for (let node of nodes) {
            if (node.spc.length > 0 || node.isAscendancyStart) {
                continue;
            }
            bytes.push(node.id >> 8 & 0xFF);
            bytes.push(node.id & 0xFF);
        }

        return this.Uint8ArryToBase64(new Uint8Array(bytes));
    }

    decodeURL(encoding: string, skillTreeData: ISkillTreeData): SkillTreeDefinition {
        let skillTreeDefinition: SkillTreeDefinition = { Version: 4, Class: 0, Ascendancy: 0, Fullscreen: 0, Nodes: new Array<ISkillNode>() };
        let bytes = this.Base64ToUint8Array(encoding);
        skillTreeDefinition.Version = bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3];
        skillTreeDefinition.Class = bytes[4];
        skillTreeDefinition.Ascendancy = bytes[5];

        if (skillTreeDefinition.Version > 3) {
            skillTreeDefinition.Fullscreen = bytes[6];
        }
        for (let i = (skillTreeDefinition.Version > 3 ? 7 : 6); i < bytes.length; i += 2) {
            let id = bytes[i] << 8 | bytes[i + 1];
            let node = skillTreeData.nodes[id];
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
        let arr = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            arr[i] = str.charCodeAt(i);
        }
        return arr;
    }
}