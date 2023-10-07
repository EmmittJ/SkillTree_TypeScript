import { ISkillTreeUrlData } from "../ISkillTreeUrlData";

export interface ISkillTreeUrlDecoder {
    canDecode(bytes: Uint8Array): boolean
    decode(bytes: Uint8Array): ISkillTreeUrlData
}