interface ISpriteSheet {
    filename: string;
    coords: Map<string, ISprite>;
}

interface ISprite {
    x: number;
    y: number;
    w: number;
    h: number;
}