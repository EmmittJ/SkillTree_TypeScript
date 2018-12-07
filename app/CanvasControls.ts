import { Point } from "../models/Point";
import { SkillTreeData } from "../models/SkillTreeData";

export class CanvasControls {
    container: JQuery<HTMLElement>;
    ctx: CanvasRenderingContext2D;
    private redraw: (offset: Point) => void;

    private SCALE_FACTOR = .1;
    private scaleMatrix = new Point(1, 1);
    private translateMatrix = new Point(0, 0);
    private mouseDown = new Point(-1, -1);
    private mouseMove = new Point(-1, -1);
    private offset = new Point(0, 0);
    private isMouseDown: boolean = false;

    constructor(container: JQuery<HTMLElement>, ctx: CanvasRenderingContext2D, redraw: (offset: Point) => void) {
        this.container = container;
        this.ctx = ctx;
        this.redraw = redraw;

        if (container.length <= 0) {
            throw new DOMException(`Could not initialize CanvasControls on given container: ${container}`);
        }

        this.translate(window.innerWidth / 2, window.innerHeight / 2);
        this.scale(.05, .05);

        this.container.on("mousedown", (e) => {
            this.isMouseDown = true;
            this.mouseDown = this.mouseMove = this.getMousePosition(<MouseEvent>e.originalEvent);
        });

        this.container.on("mouseup", (e) => {
            this.isMouseDown = false;
            this.mouseMove = this.getMousePosition(<MouseEvent>e.originalEvent);
        });

        this.container.on("mousemove", (e) => {
            let mouse = this.getMousePosition(<MouseEvent>e.originalEvent);
            if (!this.isMouseDown) {
                return;
            }
            this.clear();

            this.offset = this.mouseDown.subtract(this.mouseMove);
            this.ctx.setTransform(this.scaleMatrix.x, 0, 0, this.scaleMatrix.y, this.mouseMove.x, this.mouseMove.y);
            //this.ctx.translate(this.mouseMove.x, this.mouseMove.y);
            //this.ctx.translate(this.offset.x, this.offset.y);

            this.mouseMove = mouse;
            this.redraw(this.offset);
        });

        this.container.on("wheel", (e) => {
            var event: WheelEvent = <WheelEvent>e.originalEvent;
            this.zoom(event.deltaY, this.getMousePosition(event));
        });
    }

    private lerp = (v0: Point, v1: Point, t: number): Point => {
        return new Point(
            (1 - t) * v0.x + t * v1.x,
            (1 - t) * v0.y + t * v1.y
        )
    }

    private getMousePosition = (e: MouseEvent): Point => {
        let bounds = this.ctx.canvas.getBoundingClientRect();
        let scale = new Point(
            this.ctx.canvas.width / bounds.width,
            this.ctx.canvas.height / bounds.height
        );

        let x = 0;
        if (e.clientX || e.clientX === 0) {
            x = e.clientX - this.ctx.canvas.getBoundingClientRect().left;
        } else if (e.layerX || e.layerX === 0) {
            x = e.layerX - this.ctx.canvas.offsetLeft;
        } else if (e.offsetX || e.offsetX === 0) {
            x = e.offsetX;
        }

        let y = 0;
        if (e.clientY || e.clientY === 0) {
            y = e.clientY - this.ctx.canvas.getBoundingClientRect().top;
        } else if (e.layerY || e.layerY === 0) {
            y = e.layerY - this.ctx.canvas.offsetTop;
        } else if (e.offsetY || e.offsetY === 0) {
            y = e.offsetY;
        }

        let offset = new Point(x, y).multiply(scale);
        return offset;
    }

    move = (previous: Point, current: Point, redraw: boolean = true): void => {
        if (redraw) this.clear();
        this.translateMatrix = new Point(current.x, current.y);
        this.ctx.setTransform(this.scaleMatrix.x, 0, 0, this.scaleMatrix.y, current.x, current.y);

        if (redraw) this.redraw(this.offset);
    }

    translate = (x: number, y: number, redraw: boolean = true): void => {
        if (redraw) this.clear();

        this.translateMatrix = new Point(this.translateMatrix.x + x, this.translateMatrix.y + y);
        this.ctx.translate(x, y);

        if (redraw) this.redraw(this.offset);
    }

    /** 
     * A positive number will zoom out while a negative number will zoom in
     */
    zoom = (direction: number, current: Point, redraw: boolean = true): void => {
        if (redraw) this.clear();

        let absolute = current.multiply(this.scaleMatrix).add(this.translateMatrix);

        var scale_factor = direction > 0 ? -this.SCALE_FACTOR : this.SCALE_FACTOR;
        this.scaleMatrix.x += scale_factor * this.scaleMatrix.x;
        this.scaleMatrix.y += scale_factor * this.scaleMatrix.y;

        this.translateMatrix = absolute.subtract(current.multiply(this.scaleMatrix));

        this.ctx.setTransform(this.scaleMatrix.x, 0, 0, this.scaleMatrix.x, this.translateMatrix.x, this.translateMatrix.y);
        console.log(current.toString(), this.translateMatrix.toString());
        if (redraw) this.redraw(this.offset);
    }

    scale = (x: number, y: number, redraw: boolean = true): void => {
        if (redraw) this.clear();

        this.scaleMatrix = new Point(this.scaleMatrix.x * x, this.scaleMatrix.y * y);

        this.ctx.scale(x, y);

        if (redraw) this.redraw(this.offset);
    }

    clear = (): void => {
        this.ctx.save();

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.ctx.restore();
    }
}