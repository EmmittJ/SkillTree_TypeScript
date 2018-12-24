import { SkillTreeData } from "../models/SkillTreeData";
import { Utils } from "./utils";
import * as PIXI from "pixi.js";;
import * as Viewport from "pixi-viewport";
import { SkillNode } from "../models/SkillNode";

namespace App {
    let skillTreeData: SkillTreeData;
    let pixi: PIXI.Application;
    let viewport: Viewport;
    export const main = async () => {
        skillTreeData = new SkillTreeData(await $.ajax({
            url: `/data/SkillTree.json?t=${(new Date()).getTime()}`,
            dataType: 'json'
        }));

        pixi = new PIXI.Application(window.innerWidth, window.innerHeight, {
            autoResize: true,
            resolution: devicePixelRatio
        });
        document.body.appendChild(pixi.view);

        viewport = new Viewport({
            screenWidth: pixi.screen.width,
            screenHeight: pixi.screen.height,
            worldWidth: skillTreeData.width / 2.4,
            worldHeight: skillTreeData.height / 2.4,
            interaction: pixi.renderer.plugins.interaction
        });
        viewport
            .drag()
            .wheel()
            .pinch();
        pixi.stage.addChild(viewport);
        $(window).on("resize", () => {
            pixi.renderer.resize(window.innerWidth, window.innerHeight);
            viewport.resize(pixi.renderer.width, pixi.renderer.height, skillTreeData.width, skillTreeData.height);
        });

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
        //we like the highest res images
        var max_zoom = skillTreeData.imageZoomLevels[skillTreeData.imageZoomLevels.length - 1];
        let background: PIXI.Container = new PIXI.Container();
        let connections: PIXI.Container = new PIXI.Container();
        let connections_active: PIXI.Container = new PIXI.Container();
        let skillIcons: PIXI.Container = new PIXI.Container();
        let skillIcons_active: PIXI.Container = new PIXI.Container();
        let characterStarts: PIXI.Container = new PIXI.Container();

        let background_graphic = PIXI.extras.TilingSprite.fromImage('data/assets/Background1.png', skillTreeData.width / 2.4, skillTreeData.height / 2.4);
        background_graphic.x = skillTreeData.min_x / 2.4;
        background_graphic.y = skillTreeData.min_y / 2.4;

        let background_mask = new PIXI.Sprite();
        let fade_side = PIXI.Sprite.fromImage('data/assets/imgPSFadeSide.png');
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                let fade_corner = PIXI.Sprite.fromImage('data/assets/imgPSFadeCorner.png');
                let fade_side_tiled = new PIXI.extras.TilingSprite(fade_side.texture, skillTreeData.width / 2.4, fade_side.texture.baseTexture.height);
                fade_side_tiled.x = fade_corner.x = (i % 2 === 0 ? skillTreeData.min_x : skillTreeData.max_x) / 2.4;
                fade_side_tiled.y = fade_corner.y = (j % 2 === 0 ? skillTreeData.min_y : skillTreeData.max_y) / 2.4;
                if (i === 0 && j === 0) {
                    fade_side_tiled.rotation = 0;
                    fade_corner.rotation = 0;
                } else if (i === 1 && j === 0) {
                    fade_side_tiled.rotation = (Math.PI * 2) * .25;
                    fade_corner.rotation = (Math.PI * 2) * .25;
                } else if (i === 1 && j === 1) {
                    fade_side_tiled.rotation = (Math.PI * 2) * .5;
                    fade_corner.rotation = (Math.PI * 2) * .5;
                } else if (i === 0 && j === 1) {
                    fade_side_tiled.rotation = (Math.PI * 2) * .75;
                    fade_corner.rotation = (Math.PI * 2) * .75;
                }
                fade_corner.alpha = .75;
                background_mask.addChild(fade_side_tiled);
                background_mask.addChild(fade_corner);
            }

        }
        background.addChild(background_graphic);
        background.addChild(background_mask);

        for (let id in skillTreeData.nodes) {
            var node = skillTreeData.nodes[id];
            for (let graphic of node.getGraphicConnectionsTo(node.out.map(id => skillTreeData.nodes[id]), "Normal")) {
                connections.addChild(graphic);
            }

            if (node.spc.length === 0) {
                skillIcons.addChild(node.getGraphic(skillTreeData.skillSprites, "Inactive", skillTreeData.imageZoomLevels.length - 1));
                skillIcons.addChild(node.getNodeFrame("Unallocated"));
            }
        }


        for (let id of skillTreeData.root.out) {
            let node = skillTreeData.nodes[id];
            if (node.spc.length !== 1) {
                // Root node with no/multiple classes?
                continue;
            }

            let class_name = Utils.getKeyByValue(skillTreeData.constants.classes, node.spc[0]);
            if (class_name === undefined) {
                throw new Error(`Couldn't find class name from constants: ${node.spc[0]}`);
            }

            let class_name_backgrouds = skillTreeData.assets[`Background${class_name.replace("Class", "")}`];
            let class_name_backgroud = "";
            if (class_name_backgrouds) {
                if (max_zoom in class_name_backgrouds) {
                    class_name_backgroud = class_name_backgrouds[max_zoom];
                } else {
                    class_name_backgroud = class_name_backgrouds[0];
                }
                let class_file_name = class_name_backgroud.slice(class_name_backgroud.lastIndexOf('/') + 1);
                let class_url = `data/assets/Background${class_name.replace("Class", "").toLocaleLowerCase()}${class_file_name.slice(class_file_name.lastIndexOf('.'))}`;
                let class_node_graphic = PIXI.Sprite.fromImage(class_url);
                class_node_graphic.anchor.set(.5, .5)
                class_node_graphic.x = node.group.x / 2.5;
                class_node_graphic.y = node.group.y / 2.5;
                //viewport.addChild(class_node_graphic);
            }

            let common_name = skillTreeData.constants.classesToName[class_name];

            //find center
            //TODO: make asset loader
            let class_backgrounds = skillTreeData.assets[`center${common_name.toLocaleLowerCase()}`];
            let class_background = "";
            if (class_backgrounds) {
                if (max_zoom in class_backgrounds) {
                    class_background = class_backgrounds[max_zoom];
                } else {
                    class_background = class_backgrounds[0];
                }
                //get file name
                let file_name = class_background.slice(class_background.lastIndexOf('/') + 1);
                let node_url = `data/assets/center${common_name.toLocaleLowerCase()}${file_name.slice(file_name.lastIndexOf('.'))}`;
                let node_graphic = PIXI.Sprite.fromImage(node_url);
                node_graphic.anchor.set(.5)
                node_graphic.x = node.x;
                node_graphic.y = node.y;
                characterStarts.addChild(node_graphic);
            }
        }
        background.interactive = false;
        background.interactiveChildren = false;
        viewport.addChild(background);

        connections.interactive = false;
        connections.interactiveChildren = false;
        viewport.addChild(connections);

        viewport.addChild(skillIcons);

        characterStarts.interactive = false;
        characterStarts.interactiveChildren = false;
        viewport.addChild(characterStarts);

        // Loading textures takes a bit, so we need to pause before caching
        setTimeout(() => {
            background.cacheAsBitmap = true;
            connections.cacheAsBitmap = true;
        }, 1000);

        viewport.fitWorld(true);
        viewport.zoomPercent(1.5);
    }
}

$(window).on("load", () => {
    App.main();
});