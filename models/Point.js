"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Point = /** @class */ (function () {
    function Point(x, y) {
        var _this = this;
        this.add = function (other) {
            return new Point(_this.x + other.x, _this.y + other.y);
        };
        this.subtract = function (other) {
            return new Point(_this.x - other.x, _this.y - other.y);
        };
        this.multiply = function (other) {
            return new Point(_this.x * other.x, _this.y * other.y);
        };
        this.divide = function (other) {
            return new Point(_this.x / other.x, _this.y / other.y);
        };
        this.equals = function (other) {
            return _this.x === other.x && _this.y === other.y;
        };
        this.toString = function () {
            return "Point(" + _this.x + ", " + _this.y + ")";
        };
        this.x = x;
        this.y = y;
    }
    return Point;
}());
exports.Point = Point;
//# sourceMappingURL=Point.js.map