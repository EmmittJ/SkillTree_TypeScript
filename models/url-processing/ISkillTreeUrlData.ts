export interface ISkillTreeUrlData {
    version: number
    class: number
    ascendancy: number
    nodeCount: number
    nodes: Array<number>
    extendedNodeCount: number
    extendedNodes: Array<number>
    masteryEffectCount: number
    masteryEffects: Array<[id: number, effect: number]>
}