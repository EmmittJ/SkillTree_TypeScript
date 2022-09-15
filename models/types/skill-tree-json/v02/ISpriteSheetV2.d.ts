interface ISpriteSheetV2 extends Omit<ISpriteSheetV1, 'notableCoords' | 'keystoneCoords'> {
    filename: string;
    coords: { [id: string]: ISpriteV1 };
}