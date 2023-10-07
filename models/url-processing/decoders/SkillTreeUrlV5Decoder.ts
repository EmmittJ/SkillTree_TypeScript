import { ISkillTreeUrlDecoder } from "./ISkillTreeUrlDecoder";
import { ISkillTreeUrlData } from "../ISkillTreeUrlData";

export class SkillTreeUrlV5Decoder implements ISkillTreeUrlDecoder {
    canDecode(bytes: Uint8Array): boolean {
        return bytes.length >= 8 && this.version(bytes) == 5;
    }

    decode(bytes: Uint8Array): ISkillTreeUrlData {
        const version = this.version(bytes);
        const _class = this.class(bytes);
        const ascendancy = this.ascendancy(bytes);
        let offset = 6;

        const nodeCount = bytes[offset++];
        const nodes = new Array<number>()
        for (let i = 0; i < nodeCount; i++) {
            if (offset + 1 > bytes.length) {
                break;
            }
            nodes.push(bytes[offset++] << 8 | bytes[offset++])
        }

        const extendedNodeCount = bytes[offset++];
        const extendedNodes = new Array<number>()
        for (let i = 0; i < extendedNodeCount; i++) {
            if (offset + 1 > bytes.length) {
                break;
            }
            extendedNodes.push(bytes[offset++] << 8 | bytes[offset++])
        }

        return {
            version: version,
            class: _class,
            ascendancy: ascendancy,
            nodeCount: nodes.length,
            nodes: nodes,
            extendedNodeCount: extendedNodes.length,
            extendedNodes: extendedNodes,
            masteryEffectCount: 0,
            masteryEffects: []
        }
    }

    private version(bytes: Uint8Array): number {
        return bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3]
    }

    private class(bytes: Uint8Array): number {
        return bytes[4]
    }

    private ascendancy(bytes: Uint8Array): number {
        return bytes[5]
    }
}