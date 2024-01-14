import { ISkillTreeUrlDecoder } from "./ISkillTreeUrlDecoder";
import { ISkillTreeUrlData } from "../ISkillTreeUrlData";

export class SkillTreeUrlV4Decoder implements ISkillTreeUrlDecoder {
    canDecode(bytes: Uint8Array): boolean {
        return bytes.length >= 7 && this.version(bytes) == 4;
    }

    decode(bytes: Uint8Array): ISkillTreeUrlData {
        const version = this.version(bytes);
        const _class = this.class(bytes);
        const ascendancy = this.ascendancy(bytes);
        const _ = this.fullscreen(bytes);

        const ids = new Array<number>()
        for (let i = 7; i < bytes.length; i += 2) {
            if (i + 1 > bytes.length) {
                break;
            }
            ids.push(bytes[i] << 8 | bytes[i + 1])
        }

        return {
            version: version,
            class: _class,
            ascendancy: ascendancy,
            wildwoodAscendancy: 0,
            nodeCount: ids.length,
            nodes: ids,
            extendedNodeCount: 0,
            extendedNodes: [],
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

    private fullscreen(bytes: Uint8Array): number {
        return bytes[6]
    }
}