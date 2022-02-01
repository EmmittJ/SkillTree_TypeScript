interface ISpriteSheet {
    filename: string;
    coords: { [id: string]: ISprite };
}

interface ISpriteSheetOld {
    filename: string;
    coords: { [id: string]: ISprite };
    notableCoords: { [id: string]: ISprite } | undefined;
    keystoneCoords: { [id: string]: ISprite } | undefined;
}

interface ISprite {
    x: number;
    y: number;
    w: number;
    h: number;
}