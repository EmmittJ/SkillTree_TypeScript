export class SkillTreeAlternate implements ISkillTreeAlternate {
    alternate_tree_keystones: { [faction_id: number]: { [id: string]: string } } = {};
    factions: { [id: number]: IFaction } = {};
    nodes: { [id: string]: ISkillNodeAlternate } = {};
    passiveTypes: string[] = [];
    skillSprites: { [id: string]: ISpriteSheet[] } = {};
    version = "";

    nodesByPassiveType: ISkillNodeAlternate[][] = [];

    constructor(alternate: ISkillTreeAlternate | undefined) {
        if (alternate === undefined) {
            return;
        }

        this.alternate_tree_keystones = alternate.alternate_tree_keystones;
        this.factions = alternate.factions;
        this.nodes = alternate.nodes;
        this.passiveTypes = alternate.passiveTypes;
        this.skillSprites = alternate.skillSprites;
        this.version = alternate.version

        for (const id in this.nodes) {
            const n = this.nodes[id];
            for (const i in this.passiveTypes) {
                if (n.passiveType.indexOf(+i) >= 0) {
                    if (this.nodesByPassiveType[i] === undefined) {
                        this.nodesByPassiveType[i] = [];
                    }
                    this.nodesByPassiveType[i].push(n);
                }
            }
        }
    }

    getJewelCircleNameFromFaction = (faction_id: number) => this.factions[faction_id] !== undefined ? this.factions[faction_id].name.replace('Eternal', 'EternalEmpire').replace('None', '') : '';
}