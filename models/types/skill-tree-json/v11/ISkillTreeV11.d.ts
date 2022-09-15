interface ISkillTreeV11 extends Omit<ISkillTreeV10, 'assets' | 'skillSprites'> {
    sprites: { [id: string]: { [zoomLevel: string]: ISpriteSheetV11 } };
}