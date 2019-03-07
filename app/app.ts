import '../content/app.css';

import * as PIXI from "pixi.js";
import * as Viewport from "pixi-viewport";
import { SkillNodeStates } from "../models/SkillNode";
import { SkillTreeData } from "../models/SkillTreeData";
import { SkillTreeEvents } from "../models/SkillTreeEvents";
import { Utils } from "./utils";

namespace App {
    let skillTreeData: SkillTreeData;
    let skillTreeOptions: ISkillTreeOptions;
    let skillTreeData_compare: SkillTreeData;
    let skillTreeOptions_compare: ISkillTreeOptions;
    let pixi: PIXI.Application;
    let viewport: Viewport;

    export const main = async () => {
        pixi = new PIXI.Application(window.innerWidth, window.innerHeight, {
            autoResize: true,
            resolution: devicePixelRatio
        });
        let container = document.getElementById("skillTreeContainer");
        if (container !== null) {
            container.append(pixi.view);
        }

        let oxhr = new XMLHttpRequest();
        oxhr.open("GET", `data/Opts.json?t=${(new Date()).getTime()}`, false);
        oxhr.onload = () => {
            if (oxhr.status === 200) {
                skillTreeOptions = JSON.parse(oxhr.responseText);
            } else {
                console.error("Failed to load options");
            }
        }
        oxhr.send();

        let dxhr = new XMLHttpRequest();
        dxhr.open("GET", `data/SkillTree.json?t=${(new Date()).getTime()}`, false);
        dxhr.onload = () => {
            if (dxhr.status === 200) {
                skillTreeData = new SkillTreeData(JSON.parse(dxhr.responseText), skillTreeOptions);
            } else {
                console.error("Failed to load skill tree data");
            }
        }
        dxhr.send();

        // Load Compare Data
        //let ocxhr = new XMLHttpRequest();
        //ocxhr.open("GET", `data/Opts.compare.json?t=${(new Date()).getTime()}`, false);
        //ocxhr.onload = () => {
        //    if (ocxhr.status === 200) {
        //        skillTreeOptions_compare = JSON.parse(ocxhr.responseText);
        //    } else {
        //        console.error("Failed to load options");
        //    }
        //}
        //ocxhr.send();

        //let dxchr = new XMLHttpRequest();
        //dxchr.open("GET", `data/SkillTree.compare.json?t=${(new Date()).getTime()}`, false);
        //dxchr.onload = () => {
        //    if (dxchr.status === 200) {
        //        skillTreeData_compare = new SkillTreeData(JSON.parse(dxchr.responseText), skillTreeOptions_compare);
        //    } else {
        //        console.error("Failed to load skill tree data");
        //    }
        //}
        //dxchr.send();

        let zoomPercent = skillTreeData.imageZoomLevels.length > 2 ? skillTreeData.imageZoomLevels[1] - skillTreeData.imageZoomLevels[0] : .1;
        viewport = new Viewport({
            screenWidth: pixi.screen.width,
            screenHeight: pixi.screen.height,
            worldWidth: skillTreeData.width * (skillTreeData.scale * 1.25),
            worldHeight: skillTreeData.height * (skillTreeData.scale * 1.25),
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
            if (asset[skillTreeData.scale] && added_assets.indexOf(id) < 0) {
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

        if (skillTreeData_compare !== undefined) {
            // Load Compare Assets (where possible)
            for (let id in skillTreeData_compare.assets) {
                let asset = skillTreeData_compare.assets[id];
                if (asset[skillTreeData_compare.scale] && added_assets.indexOf(id) < 0) {
                    added_assets.push(id);
                    PIXI.Loader.shared.add(id, `data/assets.compare/${id}.png`);
                }
            }
            for (let id in skillTreeData_compare.skillSprites) {
                let sprites = skillTreeData_compare.skillSprites[id];
                let sprite = sprites[sprites.length - 1];
                if (sprite && added_assets.indexOf(sprite.filename) < 0) {
                    added_assets.push(sprite.filename);
                    PIXI.Loader.shared.add(sprite.filename, `data/assets.compare/${sprite.filename}`);
                }
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
            setupSkillTreeEvents();
            draw();
        });

        viewport.on('drag-start', (data) => SkillTreeEvents.fire("viewport", "drag-start", data.world));
        viewport.on('drag-end', (data) => SkillTreeEvents.fire("viewport", "drag-end", data.world));
        viewport.on('mouseup', () => SkillTreeEvents.fire("viewport", "mouseup"));
        viewport.on('touchend', () => SkillTreeEvents.fire("viewport", "touchend"));
        viewport.on('touchcancel', () => SkillTreeEvents.fire("viewport", "touchcancel"));

        window.onresize = () => {
            pixi.renderer.resize(window.innerWidth, window.innerHeight);
            viewport.resize(pixi.renderer.width, pixi.renderer.height, skillTreeData.width * (skillTreeData.scale * 1.25), skillTreeData.height * (skillTreeData.scale * 1.25));
            viewport.clampZoom({ minWidth: skillTreeData.width * (zoomPercent / 8), minHeight: skillTreeData.height * (zoomPercent / 8) });
        };
    }

    let setupSkillTreeEvents = () => {
        SkillTreeEvents.on("skilltree", "highlighted-nodes-update", drawHighlight);
        SkillTreeEvents.on("skilltree", "class-change", drawCharacterStartsActive);

        SkillTreeEvents.on("skilltree", "hovered-nodes-start", () => {
            updateHover = true;
            drawHover();
        });
        SkillTreeEvents.on("skilltree", "hovered-nodes-end", () => updateHover = false);
        SkillTreeEvents.on("skilltree", "active-nodes-update", drawActive);

        SkillTreeEvents.on("skilltree", "normal-node-count", (count: number) => { let e = document.getElementById("skillTreeNormalNodeCount"); if (e !== null) e.innerHTML = count.toString(); });
        SkillTreeEvents.on("skilltree", "normal-node-count-maximum", (count: number) => { let e = document.getElementById("skillTreeNormalNodeCountMaximum"); if (e !== null) e.innerHTML = count.toString(); });
        SkillTreeEvents.on("skilltree", "ascendancy-node-count", (count: number) => { let e = document.getElementById("skillTreeAscendancyNodeCount"); if (e !== null) e.innerHTML = count.toString(); });
        SkillTreeEvents.on("skilltree", "ascendancy-node-count-maximum", (count: number) => { let e = document.getElementById("skillTreeAscendancyNodeCountMaximum"); if (e !== null) e.innerHTML = count.toString(); });
    }

    let populateStartClasses = (classControl: HTMLSelectElement) => {
        while (classControl.firstChild) {
            classControl.removeChild(classControl.firstChild);
        }

        let options = new Array<HTMLOptionElement>();
        for (let id in skillTreeData.classStartNodes) {
            let node = skillTreeData.nodes[id];

            let e = document.createElement("option");
            e.text = skillTreeOptions.ascClasses[node.spc[0]].name;
            e.value = node.spc[0].toString();

            if (node.spc[0] === skillTreeData.getStartClass()) {
                e.setAttribute("selected", "selected");
            }
            options.push(e);
        }

        options.sort((a, b) => {
            let first = a.value;
            let second = b.value;
            if (first !== null && second !== null) {
                return +first - +second;
            }
            return 0;
        });

        for (var e of options) {
            classControl.append(e);
        }

        let ascControl = <HTMLSelectElement>document.getElementById("skillTreeControl_Ascendancy");
        classControl.onchange = () => {
            let val = classControl.value;
            SkillTreeEvents.fire("controls", "class-change", +val);
            if (ascControl !== null) {
                populateAscendancyClasses(ascControl, +val, 0);
            }
        };

        if (ascControl !== null) {
            populateAscendancyClasses(ascControl);
        }
    }

    let populateAscendancyClasses = (ascControl: HTMLSelectElement, start: number | undefined = undefined, startasc: number | undefined = undefined) => {
        while (ascControl.firstChild) {
            ascControl.removeChild(ascControl.firstChild);
        }

        let ascStart = startasc !== undefined ? startasc : skillTreeData.getAscendancyClass();
        let none = document.createElement("option");
        none.text = "None";
        none.value = "0";
        if (ascStart === 0) {
            none.setAttribute("selected", "selected");
        }
        ascControl.append(none);

        let startClass = start !== undefined ? start : skillTreeData.getStartClass();
        for (let ascid in skillTreeOptions.ascClasses[startClass].classes) {
            let asc = skillTreeOptions.ascClasses[startClass].classes[ascid];

            let e = document.createElement("option");
            e.text = asc.displayName;
            e.value = ascid;

            if (+ascid === ascStart) {
                e.setAttribute("selected", "selected");
            }
            ascControl.append(e);
        }

        ascControl.onchange = () => {
            let val = ascControl.value;
            SkillTreeEvents.fire("controls", "ascendancy-class-change", +val);
        };
    }

    let searchTimout: number | null = null;
    let bindSearchBox = (searchControl: HTMLInputElement) => {
        searchControl.onkeyup = () => {
            if (searchTimout !== null) {
                clearTimeout(searchTimout);
            }
            searchTimout = setTimeout(() => {
                SkillTreeEvents.fire("controls", "search-change", searchControl.value);
                searchTimout = null;
            }, 250);
        };
    }

    let background: PIXI.Container = new PIXI.Container();
    let connections: PIXI.Container = new PIXI.Container();
    let skillIcons: PIXI.Container = new PIXI.Container();
    let skillIcons_compare: PIXI.Container = new PIXI.Container();
    let characterStarts: PIXI.Container = new PIXI.Container();
    export const draw = (): void => {
        viewport.removeChildren();
        let backgroundContainer: PIXI.Container = new PIXI.Container();
        let connectionsContainer: PIXI.Container = new PIXI.Container();

        let backgroundSprite = PIXI.TilingSprite.from("Background1", skillTreeData.width * (skillTreeData.scale * 1.25), skillTreeData.height * (skillTreeData.scale * 1.25));
        backgroundSprite.anchor.set(.5);
        viewport.addChild(backgroundSprite);

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
            sprite.position.set(Math.ceil(group.x * skillTreeData.scale), Math.ceil(group.y * skillTreeData.scale));
            sprite.anchor.set(.5);
            backgroundContainer.addChild(sprite);

            if (max === 3) {
                sprite.anchor.set(.5, 1);
                let sprite2 = PIXI.Sprite.from(`PSGroupBackground${max}`);
                sprite2.rotation = Math.PI;
                sprite2.position.set(Math.ceil(group.x * skillTreeData.scale), Math.ceil(group.y * skillTreeData.scale));
                sprite2.anchor.set(.5, 1);
                backgroundContainer.addChild(sprite2);
            }
        }

        for (let id in skillTreeData.groups) {
            let group = skillTreeData.groups[id];
            if (group.n.filter(id => skillTreeData.nodes[id].isAscendancyStart).length <= 0) {
                continue;
            }
            let ascendancyName = group.n.map(id => skillTreeData.nodes[id].ascendancyName)[0];
            let sprite = PIXI.Sprite.from(`Classes${ascendancyName}`);
            sprite.position.set(Math.ceil(group.x * skillTreeData.scale), Math.ceil(group.y * skillTreeData.scale));
            sprite.anchor.set(.5);
            backgroundContainer.addChild(sprite);

            for (let id in skillTreeOptions.ascClasses) {
                let ascClasses = skillTreeOptions.ascClasses[id];
                for (let classid in ascClasses.classes) {
                    let ascClass = ascClasses.classes[classid];
                    if (ascClass.name === ascendancyName) {
                        let rect = ascClass.flavourTextRect.split(",");
                        let x = Math.ceil((group.x + +rect[0]) * skillTreeData.scale) - sprite.width / 2;
                        let y = Math.ceil((group.y + +rect[1]) * skillTreeData.scale) - sprite.height / 2;
                        let c = ascClass.flavourTextColour.split(",");
                        let r = +c[0];
                        let g = +c[1];
                        let b = +c[2];
                        let colour = "0x" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                        let text = new PIXI.Text(ascClass.flavourText, { fill: colour, fontSize: 48, fontFamily: "serif", fontStyle: "italic", stroke: 0x000000, strokeThickness: 4 });
                        text.position.set(x, y);
                        text.scale.set(skillTreeData.scale);
                        backgroundContainer.addChild(text);
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
            connectionsContainer.addChild(node.createConnections(nodes));
            skillIcons.addChild(node.createNodeGraphic(skillTreeData.skillSprites, skillTreeData.imageZoomLevels.length - 1));
            let frame = node.createNodeFrame();
            if (frame !== null) {
                skillIcons.addChild(frame);
            }

            if (skillTreeData_compare !== undefined && skillTreeData_compare.nodes[node.id] === undefined) {
                let highlighter = node.createNodeHighlight(0x00FF00);
                if (highlighter !== null) {
                    skillIcons.addChild(highlighter);
                }
            }
            if (skillTreeData_compare !== undefined && skillTreeData_compare.nodes[node.id] !== undefined) {
                let node2 = skillTreeData_compare.nodes[node.id];
                let sDiff = false;

                for (let s of node.sd) {
                    let found = false;
                    for (let s2 of node2.sd) {
                        if (s.toUpperCase() === s2.toUpperCase()) {
                            found = true;
                        }
                    }

                    if (!found) {
                        sDiff = true;
                        break;
                    }
                }

                if (sDiff) {
                    node2.add(SkillNodeStates.Compared);
                    let highlighter = node.createNodeHighlight(0xFFB000);
                    if (highlighter !== null) {
                        skillIcons.addChild(highlighter);
                    }
                }
            }
        }

        if (skillTreeData_compare !== undefined) {
            for (let id in skillTreeData_compare.nodes) {
                var node = skillTreeData_compare.nodes[id];
                if (skillTreeData.nodes[node.id] === undefined) {
                    node.add(SkillNodeStates.Compared);
                    skillIcons_compare.addChild(node.createNodeGraphic(skillTreeData_compare.skillSprites, skillTreeData_compare.imageZoomLevels.length - 1));
                    let frame = node.createNodeFrame();
                    if (frame !== null) {
                        skillIcons_compare.addChild(frame);
                    }
                    let highlighter = node.createNodeHighlight(0xFF0000);
                    if (highlighter !== null) {
                        skillIcons_compare.addChild(highlighter);
                    }
                }
            }
        }

        for (let id of skillTreeData.root.out) {
            let node = skillTreeData.nodes[id];
            if (node.spc.length !== 1) {
                // Root node with no/multiple classes?
                continue;
            }

            let graphic = PIXI.Sprite.from("PSStartNodeBackgroundInactive");
            graphic.position.set(node.group.x * skillTreeData.scale, node.group.y * skillTreeData.scale);
            graphic.anchor.set(.5);
            characterStarts.addChild(graphic);
        }

        // Render background as a texture
        background = createRenderTextureContainer(backgroundContainer);
        background.interactive = false;
        backgroundContainer.destroy();
        viewport.addChild(background);

        // Render connections as a texture
        connections = createRenderTextureContainer(connectionsContainer);
        connections.interactive = false;
        connectionsContainer.destroy();
        viewport.addChild(connections);

        skillIcons_compare.interactive = false;
        skillIcons_compare.interactiveChildren = true;
        viewport.addChild(skillIcons_compare);

        skillIcons.interactive = false;
        skillIcons.interactiveChildren = true;
        viewport.addChild(skillIcons);

        characterStarts.interactive = false;
        characterStarts.interactiveChildren = false;
        viewport.addChild(characterStarts);

        skillTreeData.skillTreeUtilities.decodeURL();
        drawCharacterStartsActive();
        populateStartClasses(<HTMLSelectElement>document.getElementById("skillTreeControl_Class"));
        bindSearchBox(<HTMLInputElement>document.getElementById("skillTreeControl_Search"));
        let controls = <HTMLCollectionOf<HTMLDivElement>>document.getElementsByClassName("skillTreeControls");
        for (let i in controls) {
            if (controls[i].style !== undefined) {
                controls[i].style.removeProperty('display');
            }
        }
        let points = <HTMLCollectionOf<HTMLDivElement>>document.getElementsByClassName("skillTreePoints");
        for (let i in points) {
            if (points[i].style !== undefined) {
                points[i].style.removeProperty('display');
            }
        }
    }

    let highlights: PIXI.Container = new PIXI.Container();
    export const drawHighlight = () => {
        if (viewport.children.indexOf(highlights) > 0) {
            viewport.removeChild(highlights);
        }
        if (highlights.children.length > 0) {
            highlights.removeChildren();
        }

        let highlightsContainer: PIXI.Container = new PIXI.Container();
        for (let id in skillTreeData.nodes) {
            let node = skillTreeData.nodes[id];
            let highlight = node.createNodeHighlight();
            if (highlight !== null) {
                highlightsContainer.addChild(highlight)
            }
        }

        highlights = createRenderTextureContainer(highlightsContainer);
        highlights.interactive = false;
        highlightsContainer.destroy();
        viewport.addChild(highlights);
    }

    let backgroundActive: PIXI.Container = new PIXI.Container();
    let characterStartsActive: PIXI.Container = new PIXI.Container();
    export const drawCharacterStartsActive = () => {
        if (viewport.children.indexOf(backgroundActive) > 0) {
            viewport.removeChild(backgroundActive);
        }
        if (viewport.children.indexOf(characterStartsActive) > 0) {
            viewport.removeChild(characterStartsActive);
        }

        if (backgroundActive.children.length > 0) {
            backgroundActive.removeChildren();
        }
        if (characterStartsActive.children.length > 0) {
            characterStartsActive.removeChildren();
        }

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
            class_node_graphic.position.set(node.group.x * skillTreeData.scale, node.group.y * skillTreeData.scale);
            backgroundActive.addChild(class_node_graphic);

            let common_name = skillTreeData.constants.classesToName[class_name];
            let node_graphic = PIXI.Sprite.from(`center${common_name.toLocaleLowerCase()}`);
            node_graphic.anchor.set(.5)
            node_graphic.position.set(node.x, node.y);
            characterStartsActive.addChild(node_graphic);
        }

        viewport.addChildAt(backgroundActive, viewport.children.indexOf(background));
        viewport.addChild(characterStartsActive);
    }

    let updateHover = true;
    let tooltip: PIXI.Graphics | undefined = undefined;
    let tooltip_compare: PIXI.Graphics | undefined = undefined;
    let pathing_connections: PIXI.Container = new PIXI.Container();
    let pathing_skillIcons: PIXI.Container = new PIXI.Container();
    export const drawHover = () => {
        if (viewport.children.indexOf(pathing_connections) > 0) {
            viewport.removeChild(pathing_connections);
        }
        if (viewport.children.indexOf(pathing_skillIcons) > 0) {
            viewport.removeChild(pathing_skillIcons);
        }
        if (tooltip !== undefined && viewport.children.indexOf(tooltip) > 0) {
            viewport.removeChild(tooltip);
        }
        if (tooltip_compare !== undefined && viewport.children.indexOf(tooltip_compare) > 0) {
            viewport.removeChild(tooltip_compare);
        }

        if (tooltip !== undefined && tooltip.children.length > 0) {
            tooltip.removeChildren();
            tooltip = undefined;
        }
        if (tooltip_compare !== undefined && tooltip_compare.children.length > 0) {
            tooltip_compare.removeChildren();
            tooltip_compare = undefined;
        }
        if (pathing_connections.children.length > 0) {
            pathing_connections.removeChildren();
        }
        if (pathing_skillIcons.children.length > 0) {
            pathing_skillIcons.removeChildren();
        }

        let drawn_connections: { [id: number]: Array<number> } = {};
        for (let id in skillTreeData.nodes) {
            let node = skillTreeData.nodes[id];
            if (node.is(SkillNodeStates.Pathing)) {
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

                pathing_connections.addChild(node.createConnections(nodes));
                let frame = node.createNodeFrame();
                if (frame !== null) {
                    pathing_skillIcons.addChild(frame);
                }
            }
            if (node.is(SkillNodeStates.Hovered)) {
                let padding = 10;
                let text = node.createTooltipText();
                text.position.set(padding / 2, padding / 2);

                tooltip = new PIXI.Graphics();
                tooltip.beginFill(0x000000, .75);
                tooltip.lineStyle(2, 0xCBB59C)
                tooltip.drawRect(0, 0, text.width + padding, text.height + padding);
                tooltip.endFill();

                tooltip.addChild(text);
                let mouse = PIXI.utils.isMobile.phone
                    ? new PIXI.Point(node.x + 50, node.y - 15) :
                    pixi.renderer.plugins.interaction.mouse.getLocalPosition(viewport);
                tooltip.position.set(mouse.x + 10, mouse.y - 5);

                if (skillTreeData_compare !== undefined) {
                    for (let idc in skillTreeData_compare.nodes) {
                        let n = skillTreeData_compare.nodes[idc];
                        if (!n.is(SkillNodeStates.Compared)) {
                            continue;
                        }

                        if (n.id === node.id || (Math.abs(n.x - node.x) < 5 && Math.abs(n.y - node.y) < 5)) {
                            n.add(SkillNodeStates.Hovered);
                        }
                    }
                }
            }
        }

        if (skillTreeData_compare !== undefined) {
            for (let id in skillTreeData_compare.nodes) {
                let node = skillTreeData_compare.nodes[id];
                if (node.is(SkillNodeStates.Hovered)) {
                    let padding = 10;
                    let text = node.createTooltipText();
                    text.position.set(padding / 2, padding / 2);

                    tooltip_compare = new PIXI.Graphics();
                    tooltip_compare.beginFill(0x000000, .75);
                    tooltip_compare.lineStyle(2, 0xFFB000)
                    tooltip_compare.drawRect(0, 0, text.width + padding, text.height + padding);
                    tooltip_compare.endFill();

                    tooltip_compare.addChild(text);
                    let mouse = PIXI.utils.isMobile.phone
                        ? new PIXI.Point(node.x + 50, node.y - 15) :
                        pixi.renderer.plugins.interaction.mouse.getLocalPosition(viewport);
                    tooltip_compare.position.set(mouse.x + 10, mouse.y - 5);
                }
            }
        }

        if (updateHover) {
            viewport.addChildAt(pathing_connections, Math.max(viewport.children.indexOf(connections), viewport.children.indexOf(connectionsActive)) + 1);
            viewport.addChildAt(pathing_skillIcons, Math.max(viewport.children.indexOf(skillIcons), viewport.children.indexOf(skillIconsActive)) + 1);
            if (tooltip !== undefined) {
                viewport.addChild(tooltip);
            }

            if (tooltip_compare !== undefined) {
                viewport.addChild(tooltip_compare);
            }

            if (tooltip !== undefined) {
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
            }

            if (tooltip_compare !== undefined) {
                let bounds_compare = tooltip_compare.getBounds();
                if (tooltip !== undefined) {
                    tooltip_compare.y = tooltip.y;
                    tooltip_compare.x = tooltip.x + tooltip.width;
                }
                else {
                    if (tooltip_compare.worldTransform.tx + bounds_compare.width > screen.width) {
                        tooltip_compare.x -= tooltip_compare.width / (PIXI.utils.isMobile.phone ? 2 : 1);
                    }
                    if (tooltip_compare.worldTransform.ty + bounds_compare.height > screen.height) {
                        tooltip_compare.y -= tooltip_compare.height / (PIXI.utils.isMobile.phone ? 2 : 1);
                    }
                }

                if (!PIXI.utils.isMobile.phone) {
                    tooltip_compare.scale.set(tooltip_compare.width / bounds_compare.width, tooltip_compare.height / bounds_compare.height);
                }
            }


            requestAnimationFrame(drawHover);
        }
    }


    let connectionsActive: PIXI.Container = new PIXI.Container();
    let skillIconsActive: PIXI.Container = new PIXI.Container();
    export const drawActive = () => {
        if (viewport.children.indexOf(connectionsActive) > 0) {
            viewport.removeChild(connectionsActive);
        }
        if (viewport.children.indexOf(skillIconsActive) > 0) {
            viewport.removeChild(skillIconsActive);
        }

        if (connectionsActive.children.length > 0) {
            connectionsActive.removeChildren();
        }
        if (skillIconsActive.children.length > 0) {
            skillIconsActive.removeChildren();
        }

        let drawn_connections: { [id: number]: Array<number> } = {};
        for (let id in skillTreeData.nodes) {
            var node = skillTreeData.nodes[id];
            if (!node.is(SkillNodeStates.Active) || node.spc.length > 0) {
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

            connectionsActive.addChild(node.createConnections(nodes));
            for (let out of nodes) {
                let frame = out.createNodeFrame();
                if (frame !== null) {
                    skillIconsActive.addChild(frame);
                }
            }

            skillIconsActive.addChild(node.createNodeGraphic(skillTreeData.skillSprites, skillTreeData.imageZoomLevels.length - 1));
            let frame = node.createNodeFrame();
            if (frame !== null) {
                skillIconsActive.addChild(frame);
            }
        }

        connectionsActive.interactive = false;
        skillIconsActive.interactive = false;

        viewport.addChildAt(connectionsActive, viewport.children.indexOf(connections) + 1);
        viewport.addChildAt(skillIconsActive, viewport.children.indexOf(skillIcons) + 1);
    }

    var MAX_COL_WIDTH: number = PIXI.utils.isMobile.phone ? 2048 : 4096;
    var MAX_ROW_HEIGHT: number = PIXI.utils.isMobile.phone ? 2048 : 4096;
    export const createRenderTextureContainer = (obj: PIXI.Container, offset: PIXI.Rectangle | null = null): PIXI.Container => {
        const DEFAULT_OFFSET: PIXI.Rectangle = new PIXI.Rectangle(Math.abs(skillTreeData.min_x * skillTreeData.scale) * 1.25, Math.abs(skillTreeData.min_y * skillTreeData.scale) * 1.35, skillTreeData.width * skillTreeData.scale, skillTreeData.height * skillTreeData.scale);
        if (offset === null) {
            offset = DEFAULT_OFFSET;
        }

        let returnContainer = new PIXI.Container();
        obj.position.set(offset.x, offset.y);

        let cols = Math.ceil((offset.width * 1.15) / MAX_COL_WIDTH);
        let rows = Math.ceil((offset.height * 1.15) / MAX_ROW_HEIGHT);

        for (let i = 0; i < cols; i++) {
            var x = i * MAX_COL_WIDTH;
            obj.position.x = offset.x - x;

            for (let j = 0; j < rows; j++) {
                var y = j * MAX_ROW_HEIGHT;
                obj.position.y = offset.y - y;

                let sprite = new PIXI.Sprite(createRenderTexture(obj, MAX_ROW_HEIGHT, MAX_COL_WIDTH));
                sprite.position.set(-obj.position.x, -obj.position.y);
                returnContainer.addChild(sprite);
            }
        }

        return returnContainer;
    }

    export const createRenderTexture = (obj: PIXI.Container, width: number, height: number): PIXI.RenderTexture => {
        let renderTexture = PIXI.RenderTexture.create({ height: height, width: width, scaleMode: PIXI.SCALE_MODES.LINEAR, resolution: 1 });
        pixi.renderer.render(obj, renderTexture);
        return renderTexture;
    }
}

window.onload = () => {
    App.main();
};