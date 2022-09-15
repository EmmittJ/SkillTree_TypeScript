interface ISkillNodeV1 extends IRootNodeV1 {
    /** Id of the SkillNode */
    id: number;

    /** Name of the SkillNode */
    dn: string;

    /** Icon of the SkillNode (i.e. "Art/2DArt/SkillIcons/passives/Champion/AnEFortify.png") */
    icon: string;

    /** Determines if the SkillNode is a Keystone */
    ks: boolean | undefined;

    /** Determines if the SkillNode is a Notable */
    not: boolean | undefined;

    /** Determines if the SkillNode is a Mastery */
    m: boolean | undefined;

    /** Detemines the root classes of the SkillNode */
    spc: Array<number> | undefined;

    /** The stat descriptions of the SkillNode */
    sd: Array<string>;
}