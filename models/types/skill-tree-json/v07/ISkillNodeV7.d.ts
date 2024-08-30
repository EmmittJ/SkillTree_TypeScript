interface ISkillNodeV7 extends Omit<ISkillNodeV6, 'spc' | 'da' | 'ia' | 'sa' | 'id' | 'g' | 'ks' | 'm' | 'not' | 'dn' | 'o' | 'oidx' | 'sd' | 'passivePointsGranted' | 'in' | 'out'> {
    /** Determines the root classes of the SkillNode */
    classStartIndex: number | undefined;

    /** Expansion Jewel properties of a Jewel Socket */
    expansionJewel: IExpansionJewelV7 | undefined;

    /** The amount of Dex the SkillNode gives */
    grantedDexterity: number | undefined;

    /** The amount of Int the SkillNode gives */
    grantedIntelligence: number | undefined;

    /** Determines the number of passive points received when this SkillNode is skilled */
    grantedPassivePoints: number | undefined;

    /** The amount of Strength the SkillNode gives */
    grantedStrength: number | undefined;

    /** The group id of the SkillNode */
    group: number | undefined;

    /** Id of the SkillNode */
    skill: number;

    /** The connections to this SkillNode */
    in: Array<string>;

    /** Determines if the SkillNode is a Keystone */
    isKeystone: boolean | undefined;

    /** Determines if the SkillNode is a Mastery */
    isMastery: boolean | undefined;

    /** Determines if the SkillNode is a Notable */
    isNotable: boolean | undefined;

    /** Determines if the SkillNode is a proxy (cluster jewel) */
    isProxy: boolean | undefined;

    /** Name of the SkillNode */
    name: string;

    /** The Orbit Radii of the SkillNode
     * @see Constants.orbitRadii
     */
    orbit: number;

    /** The index on the Orbit
     * @see Constants.skillsPerOrbit
     */
    orbitIndex: number;

    /** The connections from this SkillNode */
    out: Array<string>;

    /** The Blight Oil Recipe for the node */
    recipe: Array<string> | undefined;

    /** The stat descriptions of the SkillNode */
    stats: Array<string>;
}