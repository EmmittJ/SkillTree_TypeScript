import { Point } from "../models/Point";
export declare class CanvasControls {
    container: JQuery<HTMLElement>;
    ctx: CanvasRenderingContext2D;
    private redraw;
    private SCALE_FACTOR;
    private scaleMatrix;
    private translateMatrix;
    private mouseDown;
    private mouseMove;
    private offset;
    private isMouseDown;
    constructor(container: JQuery<HTMLElement>, ctx: CanvasRenderingContext2D, redraw: (offset: Point) => void);
    private lerp;
    private getMousePosition;
    move: (previous: Point, current: Point, redraw?: boolean) => void;
    translate: (x: number, y: number, redraw?: boolean) => void;
    /**
     * A positive number will zoom out while a negative number will zoom in
     */
    zoom: (direction: number, current: Point, redraw?: boolean) => void;
    scale: (x: number, y: number, redraw?: boolean) => void;
    clear: () => void;
}
