interface ISpriteSheet {
    filename: string;
    coords: { [id: string]: ISprite };
}

interface ISprite {
    x: number;
    y: number;
    w: number;
    h: number;
}