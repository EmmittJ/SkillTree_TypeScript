"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Point_1 = require("../models/Point");
var CanvasControls = /** @class */ (function () {
    function CanvasControls(container, ctx, redraw) {
        var _this = this;
        this.SCALE_FACTOR = .1;
        this.scaleMatrix = new Point_1.Point(1, 1);
        this.translateMatrix = new Point_1.Point(0, 0);
        this.mouseDown = new Point_1.Point(-1, -1);
        this.mouseMove = new Point_1.Point(-1, -1);
        this.offset = new Point_1.Point(0, 0);
        this.isMouseDown = false;
        this.lerp = function (v0, v1, t) {
            return new Point_1.Point((1 - t) * v0.x + t * v1.x, (1 - t) * v0.y + t * v1.y);
        };
        this.getMousePosition = function (e) {
            var bounds = _this.ctx.canvas.getBoundingClientRect();
            var scale = new Point_1.Point(_this.ctx.canvas.width / bounds.width, _this.ctx.canvas.height / bounds.height);
            var x = 0;
            if (e.clientX || e.clientX === 0) {
                x = e.clientX - _this.ctx.canvas.getBoundingClientRect().left;
            }
            else if (e.layerX || e.layerX === 0) {
                x = e.layerX - _this.ctx.canvas.offsetLeft;
            }
            else if (e.offsetX || e.offsetX === 0) {
                x = e.offsetX;
            }
            var y = 0;
            if (e.clientY || e.clientY === 0) {
                y = e.clientY - _this.ctx.canvas.getBoundingClientRect().top;
            }
            else if (e.layerY || e.layerY === 0) {
                y = e.layerY - _this.ctx.canvas.offsetTop;
            }
            else if (e.offsetY || e.offsetY === 0) {
                y = e.offsetY;
            }
            var offset = new Point_1.Point(x, y).multiply(scale);
            return offset;
        };
        this.move = function (previous, current, redraw) {
            if (redraw === void 0) { redraw = true; }
            if (redraw)
                _this.clear();
            _this.translateMatrix = new Point_1.Point(current.x, current.y);
            _this.ctx.setTransform(_this.scaleMatrix.x, 0, 0, _this.scaleMatrix.y, current.x, current.y);
            if (redraw)
                _this.redraw(_this.offset);
        };
        this.translate = function (x, y, redraw) {
            if (redraw === void 0) { redraw = true; }
            if (redraw)
                _this.clear();
            _this.translateMatrix = new Point_1.Point(_this.translateMatrix.x + x, _this.translateMatrix.y + y);
            _this.ctx.translate(x, y);
            if (redraw)
                _this.redraw(_this.offset);
        };
        /**
         * A positive number will zoom out while a negative number will zoom in
         */
        this.zoom = function (direction, current, redraw) {
            if (redraw === void 0) { redraw = true; }
            if (redraw)
                _this.clear();
            var absolute = current.multiply(_this.scaleMatrix).add(_this.translateMatrix);
            var scale_factor = direction > 0 ? -_this.SCALE_FACTOR : _this.SCALE_FACTOR;
            _this.scaleMatrix.x += scale_factor * _this.scaleMatrix.x;
            _this.scaleMatrix.y += scale_factor * _this.scaleMatrix.y;
            _this.translateMatrix = absolute.subtract(current.multiply(_this.scaleMatrix));
            _this.ctx.setTransform(_this.scaleMatrix.x, 0, 0, _this.scaleMatrix.x, _this.translateMatrix.x, _this.translateMatrix.y);
            console.log(current.toString(), _this.translateMatrix.toString());
            if (redraw)
                _this.redraw(_this.offset);
        };
        this.scale = function (x, y, redraw) {
            if (redraw === void 0) { redraw = true; }
            if (redraw)
                _this.clear();
            _this.scaleMatrix = new Point_1.Point(_this.scaleMatrix.x * x, _this.scaleMatrix.y * y);
            _this.ctx.scale(x, y);
            if (redraw)
                _this.redraw(_this.offset);
        };
        this.clear = function () {
            _this.ctx.save();
            _this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            _this.ctx.clearRect(0, 0, _this.ctx.canvas.width, _this.ctx.canvas.height);
            _this.ctx.restore();
        };
        this.container = container;
        this.ctx = ctx;
        this.redraw = redraw;
        if (container.length <= 0) {
            throw new DOMException("Could not initialize CanvasControls on given container: " + container);
        }
        this.translate(window.innerWidth / 2, window.innerHeight / 2);
        this.scale(.05, .05);
        this.container.on("mousedown", function (e) {
            _this.isMouseDown = true;
            _this.mouseDown = _this.mouseMove = _this.getMousePosition(e.originalEvent);
        });
        this.container.on("mouseup", function (e) {
            _this.isMouseDown = false;
            _this.mouseMove = _this.getMousePosition(e.originalEvent);
        });
        this.container.on("mousemove", function (e) {
            var mouse = _this.getMousePosition(e.originalEvent);
            if (!_this.isMouseDown) {
                return;
            }
            _this.clear();
            _this.offset = _this.mouseDown.subtract(_this.mouseMove);
            _this.ctx.setTransform(_this.scaleMatrix.x, 0, 0, _this.scaleMatrix.y, _this.mouseMove.x, _this.mouseMove.y);
            //this.ctx.translate(this.mouseMove.x, this.mouseMove.y);
            //this.ctx.translate(this.offset.x, this.offset.y);
            _this.mouseMove = mouse;
            _this.redraw(_this.offset);
        });
        this.container.on("wheel", function (e) {
            var event = e.originalEvent;
            _this.zoom(event.deltaY, _this.getMousePosition(event));
        });
    }
    return CanvasControls;
}());
exports.CanvasControls = CanvasControls;
//# sourceMappingURL=CanvasControls.js.map