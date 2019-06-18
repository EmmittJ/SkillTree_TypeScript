export class SkillTreeAlternate implements ISkillTreeAlternate {
    alternate_tree_keystones: { [faction_id: number]: { [id: string]: string } } = {};
    factions: { [id: number]: IFaction } = {};
    nodes: { [id: string]: ISkillNodeAlternate } = {};
    passiveTypes: string[] = [];
    skillSprites: { [id: string]: ISpriteSheet[] } = {};
    version: string = "";

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
    }

    getJewelCircleNameFromFaction = (faction_id: number) => this.factions[faction_id] !== undefined ? this.factions[faction_id].name.replace('Eternal', 'EternalEmpire').replace('None', '') : '';
}