interface ISkillTreeAlternate {
    factions: { [id: number]: IFaction };
    alternate_tree_keystones: { [faction_id: number]: { [name_on_jewel: string]: string } };
    nodes: { [id: string]: ISkillNodeAlternate };
    passiveTypes: string[];
    skillSprites: { [id: string]: Array<ISpriteSheet> };
    version: string;
}

interface IFaction {
    name: string;
    replaceRegular1: boolean;
    replaceRegular2: boolean;
}