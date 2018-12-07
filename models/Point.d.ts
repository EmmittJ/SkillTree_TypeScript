export declare class Point implements IPoint {
    x: number;
    y: number;
    constructor(x: number, y: number);
    add: (other: Point) => Point;
    subtract: (other: Point) => Point;
    multiply: (other: Point) => Point;
    divide: (other: Point) => Point;
    equals: (other: Point) => boolean;
    toString: () => string;
}
