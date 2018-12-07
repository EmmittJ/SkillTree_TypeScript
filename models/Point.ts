export class Point implements IPoint {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add = (other: Point) => {
        return new Point(this.x + other.x, this.y + other.y);
    }

    subtract = (other: Point) => {
        return new Point(this.x - other.x, this.y - other.y)
    }

    multiply = (other: Point) => {
        return new Point(this.x * other.x, this.y * other.y);
    }

    divide = (other: Point) => {
        return new Point(this.x / other.x, this.y / other.y);
    }

    equals = (other: Point) => {
        return this.x === other.x && this.y === other.y;
    }

    toString = () => {
        return `Point(${this.x}, ${this.y})`;
    }
}