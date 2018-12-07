import { SkillTreeData } from "../models/SkillTreeData";
import * as PIXI from "pixi.js";
import * as Viewport from "pixi-viewport"

namespace App {
    let skillTreeData: SkillTreeData;
    let pixi: PIXI.Application;
    let viewport: Viewport;
    export const main = async () => {
        skillTreeData = new SkillTreeData(await $.ajax({
            url: '/data/SkillTree.json',
            dataType: 'json'
        }));

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

        $(window).on("resize", () => {
            pixi.renderer.resize(window.innerWidth, window.innerHeight);
            viewport.resize(pixi.renderer.width, pixi.renderer.height, skillTreeData.width, skillTreeData.height);
        });
        //pixi.ticker.add(draw);
        draw();
    }


    export const events = () => {
        viewport.on('clicked', () => console.log('clicked'))
        viewport.on('drag-start', () => console.log('drag-start'))
        viewport.on('drag-end', () => console.log('drag-end'))
        viewport.on('pinch-start', () => console.log('pinch-start'))
        viewport.on('pinch-end', () => console.log('pinch-end'))
        viewport.on('snap-start', () => console.log('snap-start'))
        viewport.on('snap-end', () => console.log('snap-end'))
        viewport.on('snap-zoom-start', () => console.log('snap-zoom-start'))
        viewport.on('snap-zoom-end', () => console.log('snap-zoom-end'))
        viewport.on('moved-end', () => console.log('moved-end'))
        viewport.on('zoomed-end', () => console.log('zoomed-end'))
    }

    export const draw = (): void => {
        viewport.removeChildren();
        for (let id in skillTreeData.nodes) {
            var node = skillTreeData.nodes[id];
            var node_color = 0xFF0000;
            var node_size = 20;
            if (node.ks) {
                node_color = 0x0000FF;
                node_size *= 2;
            } else if (node.not) {
                node_color = 0x00FFFF;
                node_size *= 1.5;
            } else if (node.m) {
                node_color = 0xFFFFFF;
            }

            var node_graphic = new PIXI.Graphics();
            node_graphic.beginFill(node.spc.length > 0 || node.isAscendancyStart ? 0x00FF00 : node_color);
            node_graphic.lineStyle(0);
            node_graphic.drawCircle(node.x, node.y, node_size);
            node_graphic.endFill();
            viewport.addChild(node_graphic);
        }
    }
}

$(window).on("load", () => {
    App.main();
});