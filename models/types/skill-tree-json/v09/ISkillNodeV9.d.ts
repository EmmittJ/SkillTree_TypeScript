interface ISkillNodeV9 extends ISkillNodeV7 {
    /** Active Icon Effect of the SkillNode (i.e. "Art/2DArt/SkillIcons/passives/Champion/AnEFortify.png") */
    activeEffectImage: string | undefined;

    /** Active Icon of the SkillNode (i.e. "Art/2DArt/SkillIcons/passives/Champion/AnEFortify.png") */
    activeIcon: string | undefined;

    /** Inactive Icon of the SkillNode (i.e. "Art/2DArt/SkillIcons/passives/Champion/AnEFortify.png") */
    inactiveIcon: string | undefined;

    /** Mastery Effects of the SkillNode */
    masteryEffects: IMasteryEffect[] | undefined;
}