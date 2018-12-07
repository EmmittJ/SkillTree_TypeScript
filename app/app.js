"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var SkillTreeData_1 = require("../models/SkillTreeData");
var PIXI = require("pixi.js");
var Viewport = require("pixi-viewport");
var App;
(function (App) {
    var _this = this;
    var skillTreeData;
    var pixi;
    var viewport;
    App.main = function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = SkillTreeData_1.SkillTreeData.bind;
                    return [4 /*yield*/, $.ajax({
                            url: '/data/SkillTree.json',
                            dataType: 'json'
                        })];
                case 1:
                    skillTreeData = new (_a.apply(SkillTreeData_1.SkillTreeData, [void 0, _b.sent()]))();
                    pixi = new PIXI.Application(window.innerWidth, window.innerHeight, {
                        autoResize: true,
                        resolution: devicePixelRatio,
                    });
                    document.body.appendChild(pixi.view);
                    viewport = new Viewport({
                        screenWidth: pixi.screen.width,
                        screenHeight: pixi.screen.height,
                        worldWidth: skillTreeData.width,
                        worldHeight: skillTreeData.height,
                        interaction: pixi.renderer.plugins.interaction
                    });
                    viewport
                        .drag()
                        .wheel({ smooth: 3 })
                        .pinch();
                    pixi.stage.addChild(viewport);
                    //events();
                    $(window).on("resize", function () {
                        pixi.renderer.resize(window.innerWidth, window.innerHeight);
                        viewport.resize(pixi.renderer.width, pixi.renderer.height, skillTreeData.width, skillTreeData.height);
                    });
                    //pixi.ticker.add(draw);
                    App.draw();
                    return [2 /*return*/];
            }
        });
    }); };
    App.events = function () {
        viewport.on('clicked', function () { return console.log('clicked'); });
        viewport.on('drag-start', function () { return console.log('drag-start'); });
        viewport.on('drag-end', function () { return console.log('drag-end'); });
        viewport.on('pinch-start', function () { return console.log('pinch-start'); });
        viewport.on('pinch-end', function () { return console.log('pinch-end'); });
        viewport.on('snap-start', function () { return console.log('snap-start'); });
        viewport.on('snap-end', function () { return console.log('snap-end'); });
        viewport.on('snap-zoom-start', function () { return console.log('snap-zoom-start'); });
        viewport.on('snap-zoom-end', function () { return console.log('snap-zoom-end'); });
        viewport.on('moved-end', function () { return console.log('moved-end'); });
        viewport.on('zoomed-end', function () { return console.log('zoomed-end'); });
    };
    App.draw = function () {
        viewport.removeChildren();
        for (var id in skillTreeData.nodes) {
            var node = skillTreeData.nodes[id];
            var node_color = 0xFF0000;
            var node_size = 20;
            if (node.ks) {
                node_color = 0x0000FF;
                node_size *= 2;
            }
            else if (node.not) {
                node_color = 0x00FFFF;
                node_size *= 1.5;
            }
            else if (node.m) {
                node_color = 0xFFFFFF;
            }
            var node_graphic = new PIXI.Graphics();
            node_graphic.beginFill(node.spc.length > 0 || node.isAscendancyStart ? 0x00FF00 : node_color);
            node_graphic.lineStyle(0);
            node_graphic.drawCircle(node.x, node.y, node_size);
            node_graphic.endFill();
            viewport.addChild(node_graphic);
        }
    };
})(App || (App = {}));
$(window).on("load", function () {
    App.main();
});
//# sourceMappingURL=app.js.map