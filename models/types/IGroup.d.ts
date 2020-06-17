interface IGroup {
    /** x-coordinate of the group */
    x: number;

    /** y-coordinate of the group */
    y: number;

    /** @deprecated The Orbitals (i.e. SkillNode.oidx) associated with the nodes attached to the group */
    oo: Array<boolean> | { [id: string]: boolean } | undefined;

    /** The Orbitals (i.e. SkillNode.oidx) associated with the nodes attached to the group */
    orbits: Array<number> | undefined;

    /** @deprecated A list of SkillNodes by Id */
    n: Array<number> | undefined;

    /** A list of SkillNodes by Id */
    nodes: Array<number> | undefined;
}