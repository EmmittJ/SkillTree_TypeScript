interface IRootNodeV1 {
    /** The group id of the SkillNode */
    g: number;

    /** The Orbit Radii of the SkillNode
     * @see Constants.orbitRadii
     */
    o: number;

    /** The index on the Orbit
     * @see Constants.skillsPerOrbit
     */
    oidx: number;

    /** The amount of Dex the SkillNode gives */
    da: number;

    /** The amount of Int the SkillNode gives */
    ia: number;

    /** The amount of Strength the SkillNode gives */
    sa: number;

    /** The conections from this SkillNode*/
    out: Array<number>;
}