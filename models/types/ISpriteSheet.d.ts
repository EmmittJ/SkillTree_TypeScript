interface ISpriteSheet {
    filename: string;
    coords: { [id: string]: ISprite };
}

interface ISpriteSheetOld {
    filename: string;
    coords: { [id: string]: ISprite };
    notableCoords: { [id: string]: ISprite };
    keystoneCoords: { [id: string]: ISprite };
}

interface ISprite {
    x: number;
    y: number;
    w: number;
    h: number;
}