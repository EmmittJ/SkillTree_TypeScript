interface ISkillNodeV3 extends ISkillNodeV1 {
    /** Determines if the SkillNode is a Jewel Socket */
    isJewelSocket: boolean;

    /** Determines if the SkillNode is Multiple Choice */
    isMultipleChoice: boolean | undefined;

    /** Options of a Multiple Choice node */
    isMultipleChoiceOption: boolean | undefined;

    /** Determines the number of passive points received when this SkillNode is skilled */
    passivePointsGranted: number | undefined;

    /** The name of the Ascendancy Class the SkillNode belongs to */
    ascendancyName: string | undefined;

    /** Determines if the SkillNode is the root of an Ascendancy Class */
    isAscendancyStart: boolean | undefined;

    /** Node flavour text (similar to the flavour text on uniques, appears in the unique border color in game) */
    flavourText: Array<string> | undefined;

    /** Additional information on mechanics or the node itself (appears grey in game) */
    reminderText: Array<string> | undefined;
}