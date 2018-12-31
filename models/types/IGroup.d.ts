interface IGroup {
    /** x-coordinate of the group */
    x: number;

    /** y-coordinate of the group */
    y: number;

    /** The Orbitals (i.e. SkillNode.oidx) associated with the nodes attached to the group */
    oo: Array<boolean> | { [id: string]: boolean };

    /** A list of SkillNodes by Id */
    n: Array<number>;
}