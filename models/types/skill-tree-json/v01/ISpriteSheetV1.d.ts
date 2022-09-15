interface ISpriteSheetV1 {
    filename: string;
    coords: { [id: string]: ISpriteV1 };
    notableCoords: { [id: string]: ISpriteV1 } | undefined;
    keystoneCoords: { [id: string]: ISpriteV1 } | undefined;
}