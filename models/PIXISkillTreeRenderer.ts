import { ISkillTreeRenderer } from "./types/ISkillTreeRenderer";
import { SkillTreeData } from './SkillTreeData';
import Viewport = require("pixi-viewport");
import { utils } from "../app/utils";
import { SkillTreeEvents } from "./SkillTreeEvents";
import { SkillNodeStates } from "./SkillNode";

export class PIXISkillTreeRenderer implements ISkillTreeRenderer {
    Initialized: boolean = false;
    private static UpdateHover: boolean = false;
    private static pixi: PIXI.Application;
    private static viewport: Viewport;
    private static skillTreeData: SkillTreeData;
    private static skillTreeData_compare: SkillTreeData | undefined;

    constructor() {
        PIXISkillTreeRenderer.pixi = new PIXI.Application({ resizeTo: window, resolution: devicePixelRatio });
        PIXI.utils.destroyTextureCache();
        PIXI.Loader.shared.reset();
    }

    async Initialize(container: HTMLElement, skillTreeData: SkillTreeData, skillTreeData_compare: SkillTreeData | undefined): Promise<boolean> {
        if (this.Initialized) {
            return false;
        }
        PIXISkillTreeRenderer.skillTreeData = skillTreeData;
        PIXISkillTreeRenderer.skillTreeData_compare = skillTreeData_compare;

        container.appendChild(PIXISkillTreeRenderer.pixi.view);

        // #region Setup pixi-viewport
        let zoomPercent = skillTreeData.imageZoomLevels.length > 2 ? skillTreeData.imageZoomLevels[1] - skillTreeData.imageZoomLevels[0] : .1;
        PIXISkillTreeRenderer.viewport = new Viewport({
            screenWidth: PIXISkillTreeRenderer.pixi.screen.width,
            screenHeight: PIXISkillTreeRenderer.pixi.screen.height,
            worldWidth: skillTreeData.width * (skillTreeData.scale * 1.25),
            worldHeight: skillTreeData.height * (skillTreeData.scale * 1.25),
            interaction: PIXISkillTreeRenderer.pixi.renderer.plugins.interaction
        });
        PIXISkillTreeRenderer.viewport.drag().wheel({ percent: zoomPercent }).pinch({ percent: zoomPercent * 10 });
        PIXISkillTreeRenderer.viewport.clampZoom({ minWidth: skillTreeData.width * (zoomPercent / 8), minHeight: skillTreeData.height * (zoomPercent / 8) });
        PIXISkillTreeRenderer.viewport.fitWorld(true);
        PIXISkillTreeRenderer.viewport.zoomPercent(1.726);

        PIXISkillTreeRenderer.viewport.on('drag-start', (data) => SkillTreeEvents.fire("viewport", "drag-start", data.world));
        PIXISkillTreeRenderer.viewport.on('drag-end', (data) => SkillTreeEvents.fire("viewport", "drag-end", data.world));
        PIXISkillTreeRenderer.viewport.on('mouseup', () => SkillTreeEvents.fire("viewport", "mouseup"));
        PIXISkillTreeRenderer.viewport.on('touchend', () => SkillTreeEvents.fire("viewport", "touchend"));
        PIXISkillTreeRenderer.viewport.on('touchcancel', () => SkillTreeEvents.fire("viewport", "touchcancel"));
        PIXISkillTreeRenderer.viewport.on('click', (click) => click.data.originalEvent.ctrlKey ? PIXISkillTreeRenderer.viewport.zoomPercent(zoomPercent * 2, false) : true);
        PIXISkillTreeRenderer.viewport.on('rightclick', (click) => click.data.originalEvent.ctrlKey ? PIXISkillTreeRenderer.viewport.zoomPercent(-zoomPercent * 2, false) : true);
        PIXISkillTreeRenderer.pixi.stage.addChild(PIXISkillTreeRenderer.viewport);
        // #endregion 

        window.onresize = () => {
            PIXISkillTreeRenderer.pixi.renderer.resize(window.innerWidth, window.innerHeight);
            PIXISkillTreeRenderer.viewport.resize(PIXISkillTreeRenderer.pixi.renderer.width, PIXISkillTreeRenderer.pixi.renderer.height, skillTreeData.width * (skillTreeData.scale * 1.25), skillTreeData.height * (skillTreeData.scale * 1.25));
            PIXISkillTreeRenderer.viewport.clampZoom({ minWidth: skillTreeData.width * (zoomPercent / 8), minHeight: skillTreeData.height * (zoomPercent / 8) });
        };

        var promise = this.LoadAssets([skillTreeData, skillTreeData_compare]);
        promise.then(_ => this.Initialized = true);
        promise.catch(_ => this.Initialized = false);
        return promise;
    }

    private LoadAssets(data: (SkillTreeData | undefined)[]): Promise<boolean> {
        var filteredData = data.filter(utils.NotUndefined);
        if (filteredData.length <= 0) {
            throw new Error("SkillTreeData has not been defined. Could not load assets.");
        }

        var promise = new Promise<boolean>((resolve, reject) => {
            PIXI.Loader.shared.onComplete.add(() => resolve(true));
            PIXI.Loader.shared.onError.add(() => reject(false));
        });

        // #region Load Assets
        let added_assets = new Array<string>();
        for (let i of filteredData) {
            for (let id in i.assets) {
                let asset = i.assets[id];
                if (asset[i.scale] && added_assets.indexOf(id) < 0) {
                    added_assets.push(id);
                    PIXI.Loader.shared.add(id, `data/${i.skillTreeOptions.version}/assets/${id}.png`);
                }
            }

            for (let id in i.skillSprites) {
                let sprites = i.skillSprites[id];
                let sprite = sprites[sprites.length - 1];
                if (sprite && added_assets.indexOf(sprite.filename) < 0) {
                    added_assets.push(sprite.filename);
                    PIXI.Loader.shared.add(sprite.filename, `data/${i.skillTreeOptions.version}/assets/${sprite.filename}`);
                }
            }
        }
        // #endregion
        // #region Display Loading Bar
        var skillTreeData = filteredData[0];
        PIXI.Loader.shared.load();
        let loaded_assets: number = 0;
        let load_bar_width = skillTreeData.width / 2;
        let progress_text = "";
        PIXI.Loader.shared.onProgress.add(() => {
            loaded_assets++;
            let new_text = `${Math.ceil(loaded_assets / added_assets.length * 1000) / 10}%`;
            if (new_text !== progress_text) {
                PIXISkillTreeRenderer.viewport.removeChildren();
                progress_text = new_text;

                let load_bar = new PIXI.Graphics();
                load_bar.moveTo(0, 0);
                load_bar.beginFill(0xFFFFFF, .75);
                load_bar.lineStyle(2, 0xCBB59C)
                load_bar.drawRect(0, 0, (loaded_assets / added_assets.length) * load_bar_width, 50);
                load_bar.endFill();
                load_bar.position.set(-load_bar_width / 2, screen.height / 2);
                PIXISkillTreeRenderer.viewport.addChild(load_bar);

                let text = new PIXI.Text(progress_text, { fontSize: 250, fill: 0xFFFFFF });
                text.position.set(0, -50);
                PIXISkillTreeRenderer.viewport.addChild(text);
            }
        });
        // #endregion

        return promise;
    }

    private static background: PIXI.Container = new PIXI.Container();
    private static connections: PIXI.Container = new PIXI.Container();
    private static skillIcons: PIXI.Container = new PIXI.Container();
    private static skillIcons_compare: PIXI.Container = new PIXI.Container();
    private static characterStarts: PIXI.Container = new PIXI.Container();
    RenderBase(): void {
        PIXISkillTreeRenderer.viewport.removeChildren();
        let backgroundContainer: PIXI.Container = new PIXI.Container();
        let connectionsContainer: PIXI.Container = new PIXI.Container();

        let backgroundSprite = PIXI.TilingSprite.from("Background1", PIXISkillTreeRenderer.skillTreeData.width * (PIXISkillTreeRenderer.skillTreeData.scale * 1.25), PIXISkillTreeRenderer.skillTreeData.height * (PIXISkillTreeRenderer.skillTreeData.scale * 1.25));
        backgroundSprite.anchor.set(.5);
        PIXISkillTreeRenderer.viewport.addChild(backgroundSprite);

        for (let id in PIXISkillTreeRenderer.skillTreeData.groups) {
            let group = PIXISkillTreeRenderer.skillTreeData.groups[id];
            if (group.n.find(id => PIXISkillTreeRenderer.skillTreeData.nodes[id].ascendancyName !== "") !== undefined || group.oo.length === 0) {
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
            sprite.position.set(Math.ceil(group.x * PIXISkillTreeRenderer.skillTreeData.scale), Math.ceil(group.y * PIXISkillTreeRenderer.skillTreeData.scale));
            sprite.anchor.set(.5);
            backgroundContainer.addChild(sprite);

            if (max === 3) {
                sprite.anchor.set(.5, 1);
                let sprite2 = PIXI.Sprite.from(`PSGroupBackground${max}`);
                sprite2.rotation = Math.PI;
                sprite2.position.set(Math.ceil(group.x * PIXISkillTreeRenderer.skillTreeData.scale), Math.ceil(group.y * PIXISkillTreeRenderer.skillTreeData.scale));
                sprite2.anchor.set(.5, 1);
                backgroundContainer.addChild(sprite2);
            }
        }

        for (let id in PIXISkillTreeRenderer.skillTreeData.groups) {
            let group = PIXISkillTreeRenderer.skillTreeData.groups[id];
            if (group.n.filter(id => PIXISkillTreeRenderer.skillTreeData.nodes[id].isAscendancyStart).length <= 0) {
                continue;
            }
            let ascendancyName = group.n.map(id => PIXISkillTreeRenderer.skillTreeData.nodes[id].ascendancyName)[0];
            let sprite = PIXI.Sprite.from(`Classes${ascendancyName}`);
            sprite.position.set(Math.ceil(group.x * PIXISkillTreeRenderer.skillTreeData.scale), Math.ceil(group.y * PIXISkillTreeRenderer.skillTreeData.scale));
            sprite.anchor.set(.5);
            backgroundContainer.addChild(sprite);

            for (let id in PIXISkillTreeRenderer.skillTreeData.skillTreeOptions.ascClasses) {
                let ascClasses = PIXISkillTreeRenderer.skillTreeData.skillTreeOptions.ascClasses[id];
                for (let classid in ascClasses.classes) {
                    let ascClass = ascClasses.classes[classid];
                    if (ascClass.name === ascendancyName) {
                        let rect = ascClass.flavourTextRect.split(",");
                        let x = Math.ceil((group.x + +rect[0]) * PIXISkillTreeRenderer.skillTreeData.scale) - sprite.width / 2;
                        let y = Math.ceil((group.y + +rect[1]) * PIXISkillTreeRenderer.skillTreeData.scale) - sprite.height / 2;
                        let c = ascClass.flavourTextColour.split(",");
                        let r = +c[0];
                        let g = +c[1];
                        let b = +c[2];
                        let colour = "0x" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                        let text = new PIXI.Text(ascClass.flavourText, { fill: colour, fontSize: 48, fontFamily: "serif", fontStyle: "italic", stroke: 0x000000, strokeThickness: 4 });
                        text.position.set(x, y);
                        text.scale.set(PIXISkillTreeRenderer.skillTreeData.scale);
                        backgroundContainer.addChild(text);
                    }
                }
            }
        }

        let drawn_connections: { [id: number]: Array<number> } = {};
        for (let id in PIXISkillTreeRenderer.skillTreeData.nodes) {
            var node = PIXISkillTreeRenderer.skillTreeData.nodes[id];
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

                    return PIXISkillTreeRenderer.skillTreeData.nodes[outID]
                });
            connectionsContainer.addChild(node.createConnections(nodes));
            PIXISkillTreeRenderer.skillIcons.addChild(node.createNodeGraphic(PIXISkillTreeRenderer.skillTreeData.skillSprites, PIXISkillTreeRenderer.skillTreeData.imageZoomLevels.length - 1));
            let frame = node.createNodeFrame();
            if (frame !== null) {
                PIXISkillTreeRenderer.skillIcons.addChild(frame);
            }

            if (PIXISkillTreeRenderer.skillTreeData_compare !== undefined && PIXISkillTreeRenderer.skillTreeData_compare.nodes[node.id] === undefined) {
                let highlighter = node.createNodeHighlight(0x00FF00);
                if (highlighter !== null) {
                    PIXISkillTreeRenderer.skillIcons.addChild(highlighter);
                }
            }
            if (PIXISkillTreeRenderer.skillTreeData_compare !== undefined && PIXISkillTreeRenderer.skillTreeData_compare.nodes[node.id] !== undefined) {
                let node2 = PIXISkillTreeRenderer.skillTreeData_compare.nodes[node.id];
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
                        PIXISkillTreeRenderer.skillIcons.addChild(highlighter);
                    }
                }
            }
        }

        if (PIXISkillTreeRenderer.skillTreeData_compare !== undefined) {
            for (let id in PIXISkillTreeRenderer.skillTreeData_compare.nodes) {
                var node = PIXISkillTreeRenderer.skillTreeData_compare.nodes[id];
                if (PIXISkillTreeRenderer.skillTreeData.nodes[node.id] === undefined) {
                    node.add(SkillNodeStates.Compared);
                    PIXISkillTreeRenderer.skillIcons_compare.addChild(node.createNodeGraphic(PIXISkillTreeRenderer.skillTreeData_compare.skillSprites, PIXISkillTreeRenderer.skillTreeData_compare.imageZoomLevels.length - 1));
                    let frame = node.createNodeFrame();
                    if (frame !== null) {
                        PIXISkillTreeRenderer.skillIcons_compare.addChild(frame);
                    }
                    let highlighter = node.createNodeHighlight(0xFF0000);
                    if (highlighter !== null) {
                        PIXISkillTreeRenderer.skillIcons_compare.addChild(highlighter);
                    }
                }
            }
        }

        for (let id of PIXISkillTreeRenderer.skillTreeData.root.out) {
            let node = PIXISkillTreeRenderer.skillTreeData.nodes[id];
            if (node.spc.length !== 1) {
                // Root node with no/multiple classes?
                continue;
            }

            let graphic = PIXI.Sprite.from("PSStartNodeBackgroundInactive");
            graphic.position.set(node.group.x * PIXISkillTreeRenderer.skillTreeData.scale, node.group.y * PIXISkillTreeRenderer.skillTreeData.scale);
            graphic.anchor.set(.5);
            PIXISkillTreeRenderer.characterStarts.addChild(graphic);
        }

        // Render background as a texture
        PIXISkillTreeRenderer.background = PIXISkillTreeRenderer.createRenderTextureContainer(backgroundContainer);
        PIXISkillTreeRenderer.background.interactive = false;
        backgroundContainer.destroy();
        PIXISkillTreeRenderer.viewport.addChild(PIXISkillTreeRenderer.background);

        // Render connections as a texture
        PIXISkillTreeRenderer.connections = PIXISkillTreeRenderer.createRenderTextureContainer(connectionsContainer);
        PIXISkillTreeRenderer.connections.interactive = false;
        connectionsContainer.destroy();
        PIXISkillTreeRenderer.viewport.addChild(PIXISkillTreeRenderer.connections);

        PIXISkillTreeRenderer.skillIcons_compare.interactive = false;
        PIXISkillTreeRenderer.skillIcons_compare.interactiveChildren = true;
        PIXISkillTreeRenderer.viewport.addChild(PIXISkillTreeRenderer.skillIcons_compare);

        PIXISkillTreeRenderer.skillIcons.interactive = false;
        PIXISkillTreeRenderer.skillIcons.interactiveChildren = true;
        PIXISkillTreeRenderer.viewport.addChild(PIXISkillTreeRenderer.skillIcons);

        PIXISkillTreeRenderer.characterStarts.interactive = false;
        PIXISkillTreeRenderer.characterStarts.interactiveChildren = false;
        PIXISkillTreeRenderer.viewport.addChild(PIXISkillTreeRenderer.characterStarts);
    }

    private static connectionsActive: PIXI.Container = new PIXI.Container();
    private static skillIconsActive: PIXI.Container = new PIXI.Container();
    RenderActive(): void {
        if (PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.connectionsActive) > 0) {
            PIXISkillTreeRenderer.viewport.removeChild(PIXISkillTreeRenderer.connectionsActive);
        }
        if (PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.skillIconsActive) > 0) {
            PIXISkillTreeRenderer.viewport.removeChild(PIXISkillTreeRenderer.skillIconsActive);
        }

        if (PIXISkillTreeRenderer.connectionsActive.children.length > 0) {
            PIXISkillTreeRenderer.connectionsActive.removeChildren();
        }
        if (PIXISkillTreeRenderer.skillIconsActive.children.length > 0) {
            PIXISkillTreeRenderer.skillIconsActive.removeChildren();
        }

        let drawn_connections: { [id: number]: Array<number> } = {};
        for (let id in PIXISkillTreeRenderer.skillTreeData.nodes) {
            var node = PIXISkillTreeRenderer.skillTreeData.nodes[id];
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

                    return PIXISkillTreeRenderer.skillTreeData.nodes[outID]
                });

            PIXISkillTreeRenderer.connectionsActive.addChild(node.createConnections(nodes));
            for (let out of nodes) {
                let frame = out.createNodeFrame();
                if (frame !== null) {
                    PIXISkillTreeRenderer.skillIconsActive.addChild(frame);
                }
            }

            PIXISkillTreeRenderer.skillIconsActive.addChild(node.createNodeGraphic(PIXISkillTreeRenderer.skillTreeData.skillSprites, PIXISkillTreeRenderer.skillTreeData.imageZoomLevels.length - 1));
            let frame = node.createNodeFrame();
            if (frame !== null) {
                PIXISkillTreeRenderer.skillIconsActive.addChild(frame);
            }
        }

        PIXISkillTreeRenderer.connectionsActive.interactive = false;
        PIXISkillTreeRenderer.skillIconsActive.interactive = false;

        PIXISkillTreeRenderer.viewport.addChildAt(PIXISkillTreeRenderer.connectionsActive, PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.connections) + 1);
        PIXISkillTreeRenderer.viewport.addChildAt(PIXISkillTreeRenderer.skillIconsActive, PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.skillIcons) + 1);
    }

    private static backgroundActive: PIXI.Container = new PIXI.Container();
    private static characterStartsActive: PIXI.Container = new PIXI.Container();
    RenderCharacterStartsActive(): void {
        if (PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.backgroundActive) > 0) {
            PIXISkillTreeRenderer.viewport.removeChild(PIXISkillTreeRenderer.backgroundActive);
        }
        if (PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.characterStartsActive) > 0) {
            PIXISkillTreeRenderer.viewport.removeChild(PIXISkillTreeRenderer.characterStartsActive);
        }

        if (PIXISkillTreeRenderer.backgroundActive.children.length > 0) {
            PIXISkillTreeRenderer.backgroundActive.removeChildren();
        }
        if (PIXISkillTreeRenderer.characterStartsActive.children.length > 0) {
            PIXISkillTreeRenderer.characterStartsActive.removeChildren();
        }

        for (let id of PIXISkillTreeRenderer.skillTreeData.root.out) {
            let node = PIXISkillTreeRenderer.skillTreeData.nodes[id];
            if (node.spc.length !== 1 || !node.is(SkillNodeStates.Active)) {
                continue;
            }
            let class_name = utils.getKeyByValue(PIXISkillTreeRenderer.skillTreeData.constants.classes, node.spc[0]);
            if (class_name === undefined) {
                throw new Error(`Couldn't find class name from constants: ${node.spc[0]}`);
            }

            let class_node_graphic = PIXI.Sprite.from(`Background${class_name.replace("Class", "")}`);
            class_node_graphic.anchor.set(.5)
            class_node_graphic.position.set(node.group.x * PIXISkillTreeRenderer.skillTreeData.scale, node.group.y * PIXISkillTreeRenderer.skillTreeData.scale);
            PIXISkillTreeRenderer.backgroundActive.addChild(class_node_graphic);

            let common_name = PIXISkillTreeRenderer.skillTreeData.constants.classesToName[class_name];
            let node_graphic = PIXI.Sprite.from(`center${common_name.toLocaleLowerCase()}`);
            node_graphic.anchor.set(.5)
            node_graphic.position.set(node.x, node.y);
            PIXISkillTreeRenderer.characterStartsActive.addChild(node_graphic);
        }

        PIXISkillTreeRenderer.viewport.addChildAt(PIXISkillTreeRenderer.backgroundActive, PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.background));
        PIXISkillTreeRenderer.viewport.addChild(PIXISkillTreeRenderer.characterStartsActive);
    }

    StopRenderHover(): void {
        PIXISkillTreeRenderer.UpdateHover = false;
    }
    StartRenderHover(): void {
        PIXISkillTreeRenderer.UpdateHover = true;
        PIXISkillTreeRenderer.RenderHover();
    }

    private static tooltip: PIXI.Graphics | undefined = undefined;
    private static tooltip_compare: PIXI.Graphics | undefined = undefined;
    private static pathing_connections: PIXI.Container = new PIXI.Container();
    private static pathing_skillIcons: PIXI.Container = new PIXI.Container();
    private static RenderHover(): void {
        if (PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.pathing_connections) > 0) {
            PIXISkillTreeRenderer.viewport.removeChild(PIXISkillTreeRenderer.pathing_connections);
        }
        if (PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.pathing_skillIcons) > 0) {
            PIXISkillTreeRenderer.viewport.removeChild(PIXISkillTreeRenderer.pathing_skillIcons);
        }
        if (PIXISkillTreeRenderer.tooltip !== undefined && PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.tooltip) > 0) {
            PIXISkillTreeRenderer.viewport.removeChild(PIXISkillTreeRenderer.tooltip);
        }
        if (PIXISkillTreeRenderer.tooltip_compare !== undefined && PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.tooltip_compare) > 0) {
            PIXISkillTreeRenderer.viewport.removeChild(PIXISkillTreeRenderer.tooltip_compare);
        }

        if (PIXISkillTreeRenderer.tooltip !== undefined && PIXISkillTreeRenderer.tooltip.children.length > 0) {
            PIXISkillTreeRenderer.tooltip.removeChildren();
            PIXISkillTreeRenderer.tooltip = undefined;
        }
        if (PIXISkillTreeRenderer.tooltip_compare !== undefined && PIXISkillTreeRenderer.tooltip_compare.children.length > 0) {
            PIXISkillTreeRenderer.tooltip_compare.removeChildren();
            PIXISkillTreeRenderer.tooltip_compare = undefined;
        }
        if (PIXISkillTreeRenderer.pathing_connections.children.length > 0) {
            PIXISkillTreeRenderer.pathing_connections.removeChildren();
        }
        if (PIXISkillTreeRenderer.pathing_skillIcons.children.length > 0) {
            PIXISkillTreeRenderer.pathing_skillIcons.removeChildren();
        }

        let drawn_connections: { [id: number]: Array<number> } = {};
        for (let id in PIXISkillTreeRenderer.skillTreeData.nodes) {
            let node = PIXISkillTreeRenderer.skillTreeData.nodes[id];
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

                        return PIXISkillTreeRenderer.skillTreeData.nodes[outID]
                    });

                PIXISkillTreeRenderer.pathing_connections.addChild(node.createConnections(nodes));
                let frame = node.createNodeFrame();
                if (frame !== null) {
                    PIXISkillTreeRenderer.pathing_skillIcons.addChild(frame);
                }
            }
            if (node.is(SkillNodeStates.Hovered)) {
                let padding = 10;
                let text = node.createTooltipText();
                text.position.set(padding / 2, padding / 2);

                PIXISkillTreeRenderer.tooltip = new PIXI.Graphics();
                PIXISkillTreeRenderer.tooltip.beginFill(0x000000, .75);
                PIXISkillTreeRenderer.tooltip.lineStyle(2, 0xCBB59C)
                PIXISkillTreeRenderer.tooltip.drawRect(0, 0, text.width + padding, text.height + padding);
                PIXISkillTreeRenderer.tooltip.endFill();

                PIXISkillTreeRenderer.tooltip.addChild(text);
                let mouse = PIXI.utils.isMobile.phone
                    ? new PIXI.Point(node.x + 50, node.y - 15) :
                    PIXISkillTreeRenderer.pixi.renderer.plugins.interaction.mouse.getLocalPosition(PIXISkillTreeRenderer.viewport);
                PIXISkillTreeRenderer.tooltip.position.set(mouse.x + 10, mouse.y - 5);

                if (PIXISkillTreeRenderer.skillTreeData_compare !== undefined) {
                    for (let idc in PIXISkillTreeRenderer.skillTreeData_compare.nodes) {
                        let n = PIXISkillTreeRenderer.skillTreeData_compare.nodes[idc];
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

        if (PIXISkillTreeRenderer.skillTreeData_compare !== undefined) {
            for (let id in PIXISkillTreeRenderer.skillTreeData_compare.nodes) {
                let node = PIXISkillTreeRenderer.skillTreeData_compare.nodes[id];
                if (node.is(SkillNodeStates.Hovered)) {
                    let padding = 10;
                    let text = node.createTooltipText();
                    text.position.set(padding / 2, padding / 2);

                    PIXISkillTreeRenderer.tooltip_compare = new PIXI.Graphics();
                    PIXISkillTreeRenderer.tooltip_compare.beginFill(0x000000, .75);
                    PIXISkillTreeRenderer.tooltip_compare.lineStyle(2, 0xFFB000)
                    PIXISkillTreeRenderer.tooltip_compare.drawRect(0, 0, text.width + padding, text.height + padding);
                    PIXISkillTreeRenderer.tooltip_compare.endFill();

                    PIXISkillTreeRenderer.tooltip_compare.addChild(text);
                    let mouse = PIXI.utils.isMobile.phone
                        ? new PIXI.Point(node.x + 50, node.y - 15) :
                        PIXISkillTreeRenderer.pixi.renderer.plugins.interaction.mouse.getLocalPosition(PIXISkillTreeRenderer.viewport);
                    PIXISkillTreeRenderer.tooltip_compare.position.set(mouse.x + 10, mouse.y - 5);
                }
            }
        }

        if (PIXISkillTreeRenderer.UpdateHover) {
            PIXISkillTreeRenderer.viewport.addChildAt(PIXISkillTreeRenderer.pathing_connections, Math.max(PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.connections), PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.connectionsActive)) + 1);
            PIXISkillTreeRenderer.viewport.addChildAt(PIXISkillTreeRenderer.pathing_skillIcons, Math.max(PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.skillIcons), PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.skillIconsActive)) + 1);
            if (PIXISkillTreeRenderer.tooltip !== undefined) {
                PIXISkillTreeRenderer.viewport.addChild(PIXISkillTreeRenderer.tooltip);
            }

            if (PIXISkillTreeRenderer.tooltip_compare !== undefined) {
                PIXISkillTreeRenderer.viewport.addChild(PIXISkillTreeRenderer.tooltip_compare);
            }

            if (PIXISkillTreeRenderer.tooltip !== undefined) {
                let bounds = PIXISkillTreeRenderer.tooltip.getBounds();
                if (PIXISkillTreeRenderer.tooltip.worldTransform.tx + bounds.width > screen.width) {
                    PIXISkillTreeRenderer.tooltip.x -= PIXISkillTreeRenderer.tooltip.width / (PIXI.utils.isMobile.phone ? 2 : 1);
                }
                if (PIXISkillTreeRenderer.tooltip.worldTransform.ty + bounds.height > screen.height) {
                    PIXISkillTreeRenderer.tooltip.y -= PIXISkillTreeRenderer.tooltip.height / (PIXI.utils.isMobile.phone ? 2 : 1);
                }
                if (!PIXI.utils.isMobile.phone) {
                    PIXISkillTreeRenderer.tooltip.scale.set(PIXISkillTreeRenderer.tooltip.width / bounds.width, PIXISkillTreeRenderer.tooltip.height / bounds.height);
                }
            }

            if (PIXISkillTreeRenderer.tooltip_compare !== undefined) {
                let bounds_compare = PIXISkillTreeRenderer.tooltip_compare.getBounds();
                if (PIXISkillTreeRenderer.tooltip !== undefined) {
                    PIXISkillTreeRenderer.tooltip_compare.y = PIXISkillTreeRenderer.tooltip.y;
                    PIXISkillTreeRenderer.tooltip_compare.x = PIXISkillTreeRenderer.tooltip.x + PIXISkillTreeRenderer.tooltip.width;
                }
                else {
                    if (PIXISkillTreeRenderer.tooltip_compare.worldTransform.tx + bounds_compare.width > screen.width) {
                        PIXISkillTreeRenderer.tooltip_compare.x -= PIXISkillTreeRenderer.tooltip_compare.width / (PIXI.utils.isMobile.phone ? 2 : 1);
                    }
                    if (PIXISkillTreeRenderer.tooltip_compare.worldTransform.ty + bounds_compare.height > screen.height) {
                        PIXISkillTreeRenderer.tooltip_compare.y -= PIXISkillTreeRenderer.tooltip_compare.height / (PIXI.utils.isMobile.phone ? 2 : 1);
                    }
                }

                if (!PIXI.utils.isMobile.phone) {
                    PIXISkillTreeRenderer.tooltip_compare.scale.set(PIXISkillTreeRenderer.tooltip_compare.width / bounds_compare.width, PIXISkillTreeRenderer.tooltip_compare.height / bounds_compare.height);
                }
            }


            requestAnimationFrame(PIXISkillTreeRenderer.RenderHover);
        }
    }

    private static highlights: PIXI.Container = new PIXI.Container();
    RenderHighlight(): void {
        if (PIXISkillTreeRenderer.viewport.children.indexOf(PIXISkillTreeRenderer.highlights) > 0) {
            PIXISkillTreeRenderer.viewport.removeChild(PIXISkillTreeRenderer.highlights);
        }
        if (PIXISkillTreeRenderer.highlights.children.length > 0) {
            PIXISkillTreeRenderer.highlights.removeChildren();
        }

        let highlightsContainer: PIXI.Container = new PIXI.Container();
        for (let id in PIXISkillTreeRenderer.skillTreeData.nodes) {
            let node = PIXISkillTreeRenderer.skillTreeData.nodes[id];
            let highlight = node.createNodeHighlight();
            if (highlight !== null) {
                highlightsContainer.addChild(highlight)
            }
        }

        PIXISkillTreeRenderer.highlights = PIXISkillTreeRenderer.createRenderTextureContainer(highlightsContainer);
        PIXISkillTreeRenderer.highlights.interactive = false;
        highlightsContainer.destroy();
        PIXISkillTreeRenderer.viewport.addChild(PIXISkillTreeRenderer.highlights);
    }

    private static MAX_COL_WIDTH: number = 2048;
    private static MAX_ROW_HEIGHT: number = 2048;
    private static createRenderTextureContainer = (obj: PIXI.Container, offset: PIXI.Rectangle | null = null): PIXI.Container => {
        const DEFAULT_OFFSET: PIXI.Rectangle = new PIXI.Rectangle(Math.abs(PIXISkillTreeRenderer.skillTreeData.min_x * PIXISkillTreeRenderer.skillTreeData.scale) * 1.25, Math.abs(PIXISkillTreeRenderer.skillTreeData.min_y * PIXISkillTreeRenderer.skillTreeData.scale) * 1.35, PIXISkillTreeRenderer.skillTreeData.width * PIXISkillTreeRenderer.skillTreeData.scale, PIXISkillTreeRenderer.skillTreeData.height * PIXISkillTreeRenderer.skillTreeData.scale);
        if (offset === null) {
            offset = DEFAULT_OFFSET;
        }

        let returnContainer = new PIXI.Container();
        obj.position.set(offset.x, offset.y);

        let cols = Math.ceil((offset.width * 1.15) / PIXISkillTreeRenderer.MAX_COL_WIDTH);
        let rows = Math.ceil((offset.height * 1.15) / PIXISkillTreeRenderer.MAX_ROW_HEIGHT);

        for (let i = 0; i < cols; i++) {
            var x = i * PIXISkillTreeRenderer.MAX_COL_WIDTH;
            obj.position.x = offset.x - x;

            for (let j = 0; j < rows; j++) {
                var y = j * PIXISkillTreeRenderer.MAX_ROW_HEIGHT;
                obj.position.y = offset.y - y;

                let sprite = new PIXI.Sprite(PIXISkillTreeRenderer.createRenderTexture(obj, PIXISkillTreeRenderer.MAX_ROW_HEIGHT, PIXISkillTreeRenderer.MAX_COL_WIDTH));
                sprite.position.set(-obj.position.x, -obj.position.y);
                returnContainer.addChild(sprite);
            }
        }

        return returnContainer;
    }

    private static createRenderTexture = (obj: PIXI.Container, width: number, height: number): PIXI.RenderTexture => {
        let renderTexture = PIXI.RenderTexture.create({ height: height, width: width, scaleMode: PIXI.SCALE_MODES.LINEAR, resolution: 1 });
        PIXISkillTreeRenderer.pixi.renderer.render(obj, renderTexture);
        return renderTexture;
    }
}