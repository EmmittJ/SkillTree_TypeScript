import { SkillTreeData } from "../models/SkillTreeData";
import { Utils } from "./utils";
import * as PIXI from "pixi.js";;
import * as Viewport from "pixi-viewport";
import * as $ from "jquery";
import { SkillTreeEvents } from "../models/SkillTreeEvents";
import { SkillNodeStates } from "../models/SkillNode";

namespace App {
    let skillTreeData: SkillTreeData;
    let skillTreeOptions: ISkillTreeOptions;
    let pixi: PIXI.Application;
    let viewport: Viewport;

    export const main = async () => {
        pixi = new PIXI.Application(window.innerWidth, window.innerHeight, {
            autoResize: true,
            resolution: devicePixelRatio
        });
        $("#skillTreeContainer").append(pixi.view);

        skillTreeOptions = await $.ajax({
            url: `/data/Opts.json?t=${(new Date()).getTime()}`,
            dataType: 'json'
        });
        skillTreeData = new SkillTreeData(await $.ajax({
            url: `/data/SkillTree.json?t=${(new Date()).getTime()}`,
            dataType: 'json'
        }), skillTreeOptions);

        let zoomPercent = skillTreeData.imageZoomLevels.length > 2 ? skillTreeData.imageZoomLevels[1] - skillTreeData.imageZoomLevels[0] : .1;
        viewport = new Viewport({
            screenWidth: pixi.screen.width,
            screenHeight: pixi.screen.height,
            worldWidth: skillTreeData.width * (skillTreeData.maxZoom * 1.25),
            worldHeight: skillTreeData.height * (skillTreeData.maxZoom * 1.25),
            interaction: pixi.renderer.plugins.interaction
        });
        viewport
            .drag()
            .wheel({ percent: zoomPercent })
            .pinch({ percent: zoomPercent * 10 });
        viewport.clampZoom({ minWidth: skillTreeData.width * (zoomPercent / 8), minHeight: skillTreeData.height * (zoomPercent / 8) });
        viewport.fitWorld(true);
        viewport.zoomPercent(1.726);
        pixi.stage.addChild(viewport);

        PIXI.utils.destroyTextureCache();
        PIXI.Loader.shared.reset();
        let added_assets = new Array<string>();
        for (let id in skillTreeData.assets) {
            let asset = skillTreeData.assets[id];
            if (asset[skillTreeData.maxZoom] && added_assets.indexOf(id) < 0) {
                added_assets.push(id);
                PIXI.Loader.shared.add(id, `data/assets/${id}.png`);
            }
        }
        for (let id in skillTreeData.skillSprites) {
            let sprites = skillTreeData.skillSprites[id];
            let sprite = sprites[sprites.length - 1];
            if (sprite && added_assets.indexOf(sprite.filename) < 0) {
                added_assets.push(sprite.filename);
                PIXI.Loader.shared.add(sprite.filename, `data/assets/${sprite.filename}`);
            }
        }

        PIXI.Loader.shared.load();
        let loaded_assets: number = 0;
        let load_bar_width = skillTreeData.width / 2;
        let progress_text = "";
        PIXI.Loader.shared.onProgress.add(() => {
            loaded_assets++;
            let new_text = `${Math.ceil(loaded_assets / added_assets.length * 1000) / 10}%`;
            if (new_text !== progress_text) {
                viewport.removeChildren();
                progress_text = new_text;

                let load_bar = new PIXI.Graphics();
                load_bar.moveTo(0, 0);
                load_bar.beginFill(0xFFFFFF, .75);
                load_bar.lineStyle(2, 0xCBB59C)
                load_bar.drawRect(0, 0, (loaded_assets / added_assets.length) * load_bar_width, 50);
                load_bar.endFill();
                load_bar.position.set(-load_bar_width / 2, screen.height / 2);
                viewport.addChild(load_bar);

                let text = new PIXI.Text(progress_text, { fontSize: 250, fill: 0xFFFFFF });
                text.position.set(0, -50);
                viewport.addChild(text);
            }
        });
        PIXI.Loader.shared.onComplete.add(() => {
            draw();
        });

        viewport.on('drag-start', (data) => SkillTreeEvents.fire("viewport", "drag-start", data.world));
        viewport.on('drag-end', (data) => SkillTreeEvents.fire("viewport", "drag-end", data.world));
        viewport.on('mouseup', () => SkillTreeEvents.fire("viewport", "mouseup"));
        viewport.on('touchend', () => SkillTreeEvents.fire("viewport", "touchend"));
        viewport.on('touchcancel', () => SkillTreeEvents.fire("viewport", "touchcancel"));

        $(window).on("resize", () => {
            pixi.renderer.resize(window.innerWidth, window.innerHeight);
            viewport.resize(pixi.renderer.width, pixi.renderer.height, skillTreeData.width * (skillTreeData.maxZoom * 1.25), skillTreeData.height * (skillTreeData.maxZoom * 1.25));
            viewport.clampZoom({ minWidth: skillTreeData.width * (zoomPercent / 8), minHeight: skillTreeData.height * (zoomPercent / 8) });
        });
    }

    let populateStartClasses = (classControl: JQuery<HTMLElement>) => {
        classControl.children().remove();
        let classe: Array<JQuery> = new Array<JQuery>();
        for (let id in skillTreeData.classStartNodes) {
            let node = skillTreeData.nodes[id];
            let e = $(`<option>${skillTreeOptions.ascClasses[node.spc[0]].name}</option>`).val(node.spc[0]);
            if (node.spc[0] === skillTreeData.getStartClass()) {
                e.prop("selected", "selected");
            }
            classe.push(e);
        }

        classe.sort((a, b) => {
            let first = a.val();
            let second = b.val();
            if (first !== undefined && second !== undefined) {
                return +first - +second;
            }
            return 0;
        });

        for (var e of classe) {
            classControl.append(e);
        }
        classControl.on("change", () => {
            let val = classControl.find("option:selected").val();
            if (val !== undefined) {
                SkillTreeEvents.fire("controls", "class-change", +val);
                populateAscendancyClasses($("#skillTreeControl_Ascendancy"));
            }
        })

        populateAscendancyClasses($("#skillTreeControl_Ascendancy"));
    }

    let populateAscendancyClasses = (ascControl: JQuery<HTMLElement>) => {
        let ascStart = skillTreeData.getAscendancyClass();
        ascControl.children().remove();
        ascControl.append(`<option value='0' ${ascStart === 0 ? "selected='selected'" : ""}>None</option>`);
        let startClass = skillTreeData.getStartClass();
        for (let ascid in skillTreeOptions.ascClasses[startClass].classes) {
            let asc = skillTreeOptions.ascClasses[startClass].classes[ascid];
            let e = $(`<option>${asc.displayName}</option>`).val(ascid);
            if (+ascid === ascStart) {
                e.prop("selected", "selected");
            }
            ascControl.append(e);
        }
        ascControl.on("change", () => {
            let val = ascControl.find("option:selected").val();
            SkillTreeEvents.fire("controls", "ascendancy-class-change", val !== undefined ? +val : 0);
        });
    }

    let searchTimout: number | null = null;
    let bindSearchBox = (searchControl: JQuery<HTMLElement>) => {
        searchControl.on("keyup", () => {
            if (searchTimout !== null) {
                clearTimeout(searchTimout);
            }
            searchTimout = setTimeout(() => {
                SkillTreeEvents.fire("controls", "search-change", searchControl.val());
                searchTimout = null;
            }, 250);
        })
    }

    export const draw = (): void => {
        viewport.removeChildren();
        let background: PIXI.Container = new PIXI.Container();
        let connections: PIXI.Container = new PIXI.Container();
        let skillIcons: PIXI.Container = new PIXI.Container();
        let characterStarts: PIXI.Container = new PIXI.Container();

        let background_graphic = PIXI.TilingSprite.from("Background1", skillTreeData.width * (skillTreeData.maxZoom * 1.25), skillTreeData.height * (skillTreeData.maxZoom * 1.25));
        background_graphic.anchor.set(.5);
        background.addChild(background_graphic);

        for (let id in skillTreeData.groups) {
            let group = skillTreeData.groups[id];
            if (group.n.find(id => skillTreeData.nodes[id].ascendancyName !== "") !== undefined || group.oo.length === 0) {
                continue;
            }

            if (Array.isArray(group.oo)) {
                if (group.oo.length === 1) {
                    group.oo = { "0": group.oo[0] };
                }
                else {
                    console.log(group);
                    throw new Error(`Group ${id} could not be formatted correctly`);
                }
            }
            let max = 0;
            for (let id in group.oo) {
                if (+id > max && +id < 4) {
                    max = +id;
                }
            }
            if (max === 0) {
                continue;
            }

            let sprite = PIXI.Sprite.from(`PSGroupBackground${max}`);
            sprite.position.set(Math.ceil(group.x * skillTreeData.maxZoom), Math.ceil(group.y * skillTreeData.maxZoom));
            sprite.anchor.set(.5);
            background.addChild(sprite);

            if (max === 3) {
                sprite.anchor.set(.5, 1);
                let sprite2 = PIXI.Sprite.from(`PSGroupBackground${max}`);
                sprite2.rotation = Math.PI;
                sprite2.position.set(Math.ceil(group.x * skillTreeData.maxZoom), Math.ceil(group.y * skillTreeData.maxZoom));
                sprite2.anchor.set(.5, 1);
                background.addChild(sprite2);
            }
        }

        for (let id in skillTreeData.groups) {
            let group = skillTreeData.groups[id];
            if (group.n.filter(id => skillTreeData.nodes[id].isAscendancyStart).length <= 0) {
                continue;
            }
            let ascendancyName = group.n.map(id => skillTreeData.nodes[id].ascendancyName)[0];
            let sprite = PIXI.Sprite.from(`Classes${ascendancyName}`);
            sprite.position.set(Math.ceil(group.x * skillTreeData.maxZoom), Math.ceil(group.y * skillTreeData.maxZoom));
            sprite.anchor.set(.5);
            background.addChild(sprite);

            for (let id in skillTreeOptions.ascClasses) {
                let ascClasses = skillTreeOptions.ascClasses[id];
                for (let classid in ascClasses.classes) {
                    let ascClass = ascClasses.classes[classid];
                    if (ascClass.name === ascendancyName) {
                        let rect = ascClass.flavourTextRect.split(",");
                        let x = Math.ceil((group.x + +rect[0]) * skillTreeData.maxZoom) - sprite.width / 2;
                        let y = Math.ceil((group.y + +rect[1]) * skillTreeData.maxZoom) - sprite.height / 2;
                        let c = ascClass.flavourTextColour.split(",");
                        let r = +c[0];
                        let g = +c[1];
                        let b = +c[2];
                        let colour = "0x" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                        let text = new PIXI.Text(ascClass.flavourText, { fill: colour, fontSize: 48, fontFamily: "serif", fontStyle: "italic", stroke: 0x000000, strokeThickness: 4 });
                        text.position.set(x, y);
                        text.scale.set(skillTreeData.maxZoom);
                        background.addChild(text);
                    }
                }
            }
        }

        let drawn_connections: { [id: number]: Array<number> } = {};
        for (let id in skillTreeData.nodes) {
            var node = skillTreeData.nodes[id];
            let nodes = node.in
                .filter((outID) => {
                    if (drawn_connections[outID] === undefined || drawn_connections[+id] === undefined) {
                        return true;
                    } else {
                        return drawn_connections[outID].indexOf(+id) < 0 && drawn_connections[+id].indexOf(outID) < 0;
                    }
                })
                .map((outID) => {
                    if (drawn_connections[outID] === undefined) {
                        drawn_connections[outID] = new Array<number>();
                    }
                    if (drawn_connections[+id] === undefined) {
                        drawn_connections[+id] = new Array<number>();
                    }
                    drawn_connections[outID].push(+id);
                    drawn_connections[+id].push(outID);

                    return skillTreeData.nodes[outID]
                });
            connections.addChild(node.createConnections(nodes));
            skillIcons.addChild(node.createNodeGraphic(skillTreeData.skillSprites, skillTreeData.imageZoomLevels.length - 1));
            let frame = node.createNodeFrame();
            if (frame !== null) {
                skillIcons.addChild(frame);
            }
        }

        for (let id of skillTreeData.root.out) {
            let node = skillTreeData.nodes[id];
            if (node.spc.length !== 1) {
                // Root node with no/multiple classes?
                continue;
            }

            let graphic = PIXI.Sprite.from("PSStartNodeBackgroundInactive");
            graphic.position.set(node.group.x * skillTreeData.maxZoom, node.group.y * skillTreeData.maxZoom);
            graphic.anchor.set(.5);
            characterStarts.addChild(graphic);
        }

        background.interactive = false;
        background.interactiveChildren = false;
        viewport.addChild(background);

        connections.interactive = false;
        connections.interactiveChildren = false;
        viewport.addChild(connections);

        skillIcons.interactive = false;
        skillIcons.interactiveChildren = true;
        viewport.addChild(skillIcons);

        characterStarts.interactive = false;
        characterStarts.interactiveChildren = false;
        viewport.addChild(characterStarts);

        drawCharacterStartsActive();
        drawActive();
        skillTreeData.skillTreeUtilities.decodeURL();
        populateStartClasses($("#skillTreeControl_Class"));
        bindSearchBox($("#skillTreeControl_Search"));
        SkillTreeEvents.on("skilltree", "highlighted-nodes-update", drawHighlight);
        SkillTreeEvents.on("skilltree", "class-change", drawCharacterStartsActive);

        SkillTreeEvents.on("skilltree", "hovered-nodes-start", () => {
            updateTooltip = true;
            drawTooltip();
        });
        SkillTreeEvents.on("skilltree", "hovered-nodes-end", () => updateTooltip = false);
    }

    let highlights: PIXI.Container = new PIXI.Container();
    export const drawHighlight = () => {
        viewport.removeChild(highlights);
        if (highlights.children.length > 0) {
            highlights.removeChildren();
        }
        for (let id in skillTreeData.nodes) {
            let node = skillTreeData.nodes[id];
            let highlight = node.createNodeHighlight();
            if (highlight !== null) {
                highlights.addChild(highlight)
            }
        }
        viewport.addChild(highlights);
    }

    let backgrounds_active: PIXI.Container = new PIXI.Container();
    let characterStarts_active: PIXI.Container = new PIXI.Container();
    export const drawCharacterStartsActive = () => {
        viewport.removeChild(backgrounds_active);
        backgrounds_active.removeChildren();

        viewport.removeChild(characterStarts_active);
        characterStarts_active.removeChildren();

        for (let id of skillTreeData.root.out) {
            let node = skillTreeData.nodes[id];
            if (node.spc.length !== 1 || !node.is(SkillNodeStates.Active)) {
                continue;
            }
            let class_name = Utils.getKeyByValue(skillTreeData.constants.classes, node.spc[0]);
            if (class_name === undefined) {
                throw new Error(`Couldn't find class name from constants: ${node.spc[0]}`);
            }

            let class_node_graphic = PIXI.Sprite.from(`Background${class_name.replace("Class", "")}`);
            class_node_graphic.anchor.set(.5)
            class_node_graphic.position.set(node.group.x * skillTreeData.maxZoom, node.group.y * skillTreeData.maxZoom);
            backgrounds_active.addChild(class_node_graphic);

            let common_name = skillTreeData.constants.classesToName[class_name];
            let node_graphic = PIXI.Sprite.from(`center${common_name.toLocaleLowerCase()}`);
            node_graphic.anchor.set(.5)
            node_graphic.position.set(node.x, node.y);
            characterStarts_active.addChild(node_graphic);
        }

        viewport.addChildAt(backgrounds_active, 1);
        viewport.addChild(characterStarts_active);
    }

    let updateTooltip = true;
    let tooltip: PIXI.Graphics = new PIXI.Graphics();
    export const drawTooltip = () => {
        viewport.removeChild(tooltip);
        if (tooltip.children.length > 0) {
            tooltip.removeChildren();
        }
        for (let id in skillTreeData.nodes) {
            let node = skillTreeData.nodes[id];
            if (node.is(SkillNodeStates.Hovered)) {
                let padding = 10;
                let text = node.createTooltipText();
                text.position.set(padding / 2, padding / 2);

                tooltip.clear();
                tooltip.beginFill(0x000000, .75);
                tooltip.lineStyle(2, 0xCBB59C)
                tooltip.drawRect(0, 0, text.width + padding, text.height + padding);
                tooltip.endFill();

                tooltip.addChild(text);
                let mouse = PIXI.utils.isMobile.phone
                    ? new PIXI.Point(node.x + 50, node.y - 15) :
                    pixi.renderer.plugins.interaction.mouse.getLocalPosition(viewport);
                tooltip.position.set(mouse.x + 10, mouse.y - 5);
            }
        }

        if (updateTooltip) {
            viewport.addChild(tooltip);
            let bounds = tooltip.getBounds();
            if (tooltip.worldTransform.tx + bounds.width > screen.width) {
                tooltip.x -= tooltip.width / (PIXI.utils.isMobile.phone ? 2 : 1);
            }
            if (tooltip.worldTransform.ty + bounds.height > screen.height) {
                tooltip.y -= tooltip.height / (PIXI.utils.isMobile.phone ? 2 : 1);
            }

            if (!PIXI.utils.isMobile.phone) {
                tooltip.scale.set(tooltip.width / bounds.width, tooltip.height / bounds.height);
            }

            requestAnimationFrame(drawTooltip);
        }
    }

    let connections_active: PIXI.Container = new PIXI.Container();
    let skillIcons_active: PIXI.Container = new PIXI.Container();
    export const drawActive = () => {
        viewport.removeChild(connections_active);
        viewport.removeChild(skillIcons_active);

        if (connections_active.children.length > 0) {
            connections_active.removeChildren();
        }
        if (skillIcons_active.children.length > 0) {
            skillIcons_active.removeChildren();
        }

        let drawn_connections: { [id: number]: Array<number> } = {};
        for (let id in skillTreeData.nodes) {
            var node = skillTreeData.nodes[id];
            if ((!node.is(SkillNodeStates.Active) && !node.is(SkillNodeStates.Pathing)) || node.spc.length > 0) {
                continue;
            }

            let nodes = node.in
                .filter((outID) => {
                    if (drawn_connections[outID] === undefined || drawn_connections[+id] === undefined) {
                        return true;
                    } else {
                        return drawn_connections[outID].indexOf(+id) < 0 && drawn_connections[+id].indexOf(outID) < 0;
                    }
                })
                .map((outID) => {
                    if (drawn_connections[outID] === undefined) {
                        drawn_connections[outID] = new Array<number>();
                    }
                    if (drawn_connections[+id] === undefined) {
                        drawn_connections[+id] = new Array<number>();
                    }
                    drawn_connections[outID].push(+id);
                    drawn_connections[+id].push(outID);

                    return skillTreeData.nodes[outID]
                });

            connections_active.addChild(node.createConnections(nodes));
            for (let out of nodes) {
                if (node.is(SkillNodeStates.Active)) {
                    let frame = out.createNodeFrame();
                    if (frame !== null) {
                        skillIcons_active.addChild(frame);
                    }
                }
            }

            skillIcons_active.addChild(node.createNodeGraphic(skillTreeData.skillSprites, skillTreeData.imageZoomLevels.length - 1));
            let frame = node.createNodeFrame();
            if (frame !== null) {
                skillIcons_active.addChild(frame);
            }
        }

        viewport.addChildAt(connections_active, 3);
        viewport.addChildAt(skillIcons_active, 5);

        requestAnimationFrame(drawActive);
    }
}

$(window).on("load", () => {
    App.main();
});