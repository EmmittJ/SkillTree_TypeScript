interface ISkillTreeV2 extends Omit<ISkillTreeV1, 'skillSprites'> {
    skillSprites: { [id: string]: Array<ISpriteSheetV2> };
}