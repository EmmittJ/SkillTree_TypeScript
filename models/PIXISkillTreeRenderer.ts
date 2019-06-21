import { ISkillTreeRenderer } from "./types/ISkillTreeRenderer";
import { SkillTreeData } from './SkillTreeData';
import Viewport = require("pixi-viewport");
import { utils } from "../app/utils";
import { SkillTreeEvents } from "./SkillTreeEvents";
import { SkillNodeStates, SkillNode } from "./SkillNode";
import { PIXISkillNodeRenderer } from "./PIXISkillNodeRenderer";
import { SkillTreeAlternate } from "./SkillTreeAlternate";

export class PIXISkillTreeRenderer implements ISkillTreeRenderer {
    Initialized: boolean = false;
    SkillNodeRenderer!: PIXISkillNodeRenderer;
    private updateHover: boolean = false;
    private pixi: PIXI.Application;
    private viewport!: Viewport;
    private skillTreeData!: SkillTreeData;
    private skillTreeData_compare!: SkillTreeData | undefined;
    private skillTreeAlternate!: SkillTreeAlternate;

    constructor() {
        this.pixi = new PIXI.Application({ resizeTo: window, resolution: devicePixelRatio });

        PIXI.utils.destroyTextureCache();
        PIXI.Loader.shared.reset();
    }

    async Initialize(container: HTMLElement, skillTreeData: SkillTreeData, skillTreeAlternate: SkillTreeAlternate, skillTreeData_compare: SkillTreeData | undefined): Promise<boolean> {
        if (this.Initialized) {
            return true;
        }

        this.skillTreeData = skillTreeData;
        this.skillTreeData_compare = skillTreeData_compare;
        this.skillTreeAlternate = skillTreeAlternate;
        this.SkillNodeRenderer = new PIXISkillNodeRenderer(this.skillTreeData.skillSprites, skillTreeAlternate, this.skillTreeData_compare !== undefined ? this.skillTreeData_compare.skillSprites : undefined, this.skillTreeData.imageZoomLevels.length - 1);
        SkillTreeEvents.on("skilltree", "hovered-nodes-end", (node: SkillNode) => this.SkillNodeRenderer.DestroyTooltip(node, "Base"));
        SkillTreeEvents.on("skilltree", "hovered-nodes-end", (node: SkillNode) => this.SkillNodeRenderer.DestroyTooltip(node, "Compare"));
        SkillTreeEvents.on("skilltree", "jewel-click-end", this.CreateJewelSocketHightlights);
        SkillTreeEvents.on("skilltree", "faction-node-end", this.UpdateFactionNode);
        container.appendChild(this.pixi.view);

        // #region Setup pixi-viewport
        let zoomPercent = skillTreeData.imageZoomLevels.length > 2 ? skillTreeData.imageZoomLevels[1] - skillTreeData.imageZoomLevels[0] : .1;
        this.viewport = new Viewport({
            screenWidth: this.pixi.screen.width,
            screenHeight: this.pixi.screen.height,
            worldWidth: skillTreeData.width * (skillTreeData.scale * 1.25),
            worldHeight: skillTreeData.height * (skillTreeData.scale * 1.25),
            interaction: this.pixi.renderer.plugins.interaction
        });
        this.viewport.drag().wheel({ percent: zoomPercent }).pinch({ percent: zoomPercent * 10 });
        this.viewport.clampZoom({ minWidth: skillTreeData.width * (zoomPercent / 8), minHeight: skillTreeData.height * (zoomPercent / 8) });
        this.viewport.fitWorld(true);
        this.viewport.zoomPercent(1.726);

        this.viewport.on('drag-start', (data) => SkillTreeEvents.fire("viewport", "drag-start", data.world));
        this.viewport.on('drag-end', (data) => SkillTreeEvents.fire("viewport", "drag-end", data.world));
        this.viewport.on('mouseup', () => SkillTreeEvents.fire("viewport", "mouseup"));
        this.viewport.on('touchend', () => SkillTreeEvents.fire("viewport", "touchend"));
        this.viewport.on('touchcancel', () => SkillTreeEvents.fire("viewport", "touchcancel"));
        this.viewport.on('click', (click) => this.HandleZoomClick(click, zoomPercent * 2));
        this.viewport.on('click', this.HandleShiftClick);
        this.viewport.on('rightclick', (click) => this.HandleZoomClick(click, -zoomPercent * 2));
        this.pixi.stage.addChild(this.viewport);
        // #endregion 

        window.onresize = () => {
            this.pixi.renderer.resize(window.innerWidth, window.innerHeight);
            this.viewport.resize(this.pixi.renderer.width, this.pixi.renderer.height, skillTreeData.width * (skillTreeData.scale * 1.25), skillTreeData.height * (skillTreeData.scale * 1.25));
            this.viewport.clampZoom({ minWidth: skillTreeData.width * (zoomPercent / 8), minHeight: skillTreeData.height * (zoomPercent / 8) });
        };

        var promise = this.LoadAssets([skillTreeData, skillTreeData_compare]);
        promise.then(_ => this.Initialized = true);
        //promise.catch(_ => this.Initialized = false);
        return promise;
    }

    private HandleZoomClick = (click: PIXI.interaction.InteractionEvent, zoom: number) => {
        if (!click.data.originalEvent.ctrlKey) {
            return;
        }

        this.viewport.zoomPercent(zoom, false);
    }

    private jewelSocketHighlights: PIXI.Container = new PIXI.Container();
    private HandleShiftClick = (click: PIXI.interaction.InteractionEvent) => {
        if (!click.data.originalEvent.shiftKey || this.skillTreeData.skillTreeOptions.circles === undefined) {
            return;
        }

        let interactiveObject = this.pixi.renderer.plugins.interaction.hitTest(click.data.global, this.skillIcons);
        if (interactiveObject === null || interactiveObject.name === undefined || interactiveObject.name === null || interactiveObject.name === "") {
            return;
        }

        let node = this.skillTreeData.nodes[+interactiveObject.name];
        if (node.ks) {
            return;
        }

        if (node.isJewelSocket) {
            let settings = this.skillTreeData.Build.JewelSettings[node.id];
            if (settings === undefined) {
                settings = <ISkillTreeAlternateJewelSettings>{ node_id: node.id };
            }
            SkillTreeEvents.fire("skilltree", "jewel-click-start", settings);
        } else if (node.faction !== 0) {
            SkillTreeEvents.fire("skilltree", "faction-node-start", { node: node, choices: this.skillTreeAlternate.nodesByPassiveType[node.GetPassiveType()].filter(x => x.faction === node.faction) });
        }
    }

    private UpdateFactionNode = (event: { node_id: number, alterante_ids: ISkillNodeAlternateState[] }) => {
        let node = this.skillTreeData.nodes[event.node_id];
        node.alternate_ids = event.alterante_ids.length > 0 ? event.alterante_ids : undefined;

        this.CreateJewelSocketHightlights();
    }

    private CreateJewelSocketHightlights = (new_settings: ISkillTreeAlternateJewelSettings | undefined = undefined) => {
        if (this.skillTreeData.skillTreeOptions.circles === undefined) {
            return;
        }

        if (new_settings !== undefined && this.skillTreeData.Build.JewelSettings[new_settings.node_id] === undefined) {
            this.skillTreeData.Build.JewelSettings[new_settings.node_id] = JSON.parse(JSON.stringify(new_settings));
        }

        let used_nodes: string[] = [];
        for (let i in this.skillTreeData.Build.JewelSettings) {
            let settings = this.skillTreeData.Build.JewelSettings[i];
            if (settings === undefined) {
                continue;
            }

            if (settings.extra_data instanceof PIXI.Container) {
                this.pixi.ticker.remove(this.RotateJewelHighlights, settings.extra_data);
                this.jewelSocketHighlights.removeChild(settings.extra_data);
                settings.extra_data.destroy({ children: true });
                settings.extra_data = undefined;
            }

            if (new_settings !== undefined && settings.node_id === new_settings.node_id) {
                this.skillTreeData.Build.JewelSettings[new_settings.node_id] = <ISkillTreeAlternateJewelSettings>JSON.parse(JSON.stringify(new_settings));
                settings = this.skillTreeData.Build.JewelSettings[new_settings.node_id];
                if (settings === undefined) {
                    continue;
                }
            }

            if (settings.size !== "None" && settings.extra_data === undefined) {
                let node = this.skillTreeData.nodes[settings.node_id];
                if (node === undefined) {
                    continue;
                }
                let jewelWidth = this.skillTreeData.skillTreeOptions.circles[settings.size][this.skillTreeData.imageZoomLevels.length - 1].width;
                let factionCircleName = this.skillTreeAlternate.getJewelCircleNameFromFaction(settings.factionId);
                let sprite1 = PIXI.Sprite.from(`PassiveSkillScreen${factionCircleName}JewelCircle1`);
                let sprite2 = PIXI.Sprite.from(`PassiveSkillScreen${factionCircleName}JewelCircle${factionCircleName === "" ? 1 : 2}`);
                sprite1.width = sprite1.height = sprite2.width = sprite2.height = jewelWidth;
                sprite1.x = sprite2.x = node.x;
                sprite1.y = sprite2.y = node.y;
                sprite1.anchor.set(.5);
                sprite2.anchor.set(.5);

                let container = new PIXI.Container();
                container.addChild(sprite2);
                container.addChild(sprite1);

                this.jewelSocketHighlights.addChild(container);
                settings.extra_data = container;

                let singleNodes: { [id: number]: ISkillNodeAlternateState[] | undefined } = {};
                if (settings.factionId in this.skillTreeAlternate.alternate_tree_keystones) {
                    let keystone_id = this.skillTreeAlternate.alternate_tree_keystones[settings.factionId][settings.name];
                    singleNodes[4] = [<ISkillNodeAlternateState>{ id: keystone_id, values: [] }];
                }

                for (var passiveType in this.skillTreeAlternate.passiveTypes) {
                    if (this.skillTreeAlternate.nodesByPassiveType[+passiveType] === undefined) {
                        continue;
                    }
                    let ns = this.skillTreeAlternate.nodesByPassiveType[+passiveType].filter(x => x.faction === (<ISkillTreeAlternateJewelSettings>settings).factionId);
                    if (ns.length === 1) {
                        singleNodes[+passiveType] = [<ISkillNodeAlternateState>{ id: ns[0].id, values: ns[0].stats.map(x => x.min === x.max ? x.min : `${x.min}-${x.max}`) }];
                    }
                }

                for (let o of this.skillTreeData.getNodesInRange(node.x, node.y, jewelWidth / 2)) {
                    if (o.isJewelSocket) {
                        continue;
                    }
                    used_nodes.push(o.id.toString());
                    o.faction = settings.factionId;

                    if (o.alternate_ids !== undefined && o.alternate_ids.filter(x => this.skillTreeAlternate.nodes[x.id].faction !== (<ISkillTreeAlternateJewelSettings>settings).factionId).length > 0) {
                        o.alternate_ids = undefined;
                    }

                    if (o.alternate_ids === undefined || o.GetPassiveType() === 4) {
                        o.alternate_ids = singleNodes[o.GetPassiveType()];
                    }
                }

                if (settings.extra_data instanceof PIXI.Container) {
                    this.pixi.ticker.add(this.RotateJewelHighlights, settings.extra_data);
                }
            }
        }

        this.skillTreeData.clearAlternates(used_nodes);
        this.UpdateJewelSocketHighlightPosition();
        this.RenderActive();
        SkillTreeEvents.fire("skilltree", "encode-url");
    }

    private RotateJewelHighlights(delta: number) {
        if (this instanceof PIXI.Container) {
            let rotation = 0.0005;
            for (var sprite of this.children) {
                sprite.rotation += rotation * delta;
                rotation *= -1;
            }
        }
    }

    private UpdateJewelSocketHighlightPosition = () => {
        if (this.viewport.children.indexOf(this.jewelSocketHighlights) < 0) {
            this.viewport.addChild(this.jewelSocketHighlights);
        }

        if (this.tooltip !== undefined && this.viewport.children.indexOf(this.tooltip) >= 0) {
            this.viewport.setChildIndex(this.jewelSocketHighlights, this.viewport.children.indexOf(this.tooltip) - 1);
        }
        else if (this.viewport.children.indexOf(this.jewelSocketHighlights) !== this.viewport.children.length - 1) {
            this.viewport.setChildIndex(this.jewelSocketHighlights, this.viewport.children.length - 1);
        }
    }

    private LoadAssets = (data: (SkillTreeData | undefined)[]): Promise<boolean> => {
        var filteredData = data.filter(utils.NotUndefined);
        if (filteredData.length <= 0) {
            throw new Error("SkillTreeData has not been defined. Could not load assets.");
        }

        var promise = new Promise<boolean>((resolve, reject) => {
            PIXI.Loader.shared.onComplete.add(() => resolve(true));
            //PIXI.Loader.shared.onError.add(() => reject(false));
        });

        // #region Load Assets
        let added_assets = new Array<string>();
        for (let i of filteredData) {
            for (let id in i.assets) {
                let asset = i.assets[id];
                if ((asset[i.scale] || asset["1"]) && added_assets.indexOf(id) < 0) {
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

        if (this.skillTreeAlternate.version !== "") {
            for (let id in this.skillTreeAlternate.skillSprites) {
                let sprites = this.skillTreeAlternate.skillSprites[id];
                let sprite = sprites[sprites.length - 1];
                if (sprite && added_assets.indexOf(sprite.filename) < 0) {
                    added_assets.push(sprite.filename);
                    PIXI.Loader.shared.add(sprite.filename, `data/${this.skillTreeAlternate.version}/assets/${sprite.filename}`);
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
                this.viewport.removeChildren();
                progress_text = new_text;

                let load_bar = new PIXI.Graphics();
                load_bar.moveTo(0, 0);
                load_bar.beginFill(0xFFFFFF, .75);
                load_bar.lineStyle(2, 0xCBB59C)
                load_bar.drawRect(0, 0, (loaded_assets / added_assets.length) * load_bar_width, 50);
                load_bar.endFill();
                load_bar.position.set(-load_bar_width / 2, screen.height / 2);
                this.viewport.addChild(load_bar);

                let text = new PIXI.Text(progress_text, { fontSize: 250, fill: 0xFFFFFF });
                text.position.set(0, -50);
                this.viewport.addChild(text);
            }
        });
        // #endregion

        return promise;
    }

    private background: PIXI.Container = new PIXI.Container();
    private connections: PIXI.Container = new PIXI.Container();
    private skillIcons: PIXI.Container = new PIXI.Container();
    private skillIcons_compare: PIXI.Container = new PIXI.Container();
    private characterStarts: PIXI.Container = new PIXI.Container();

    public RenderBase = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.viewport.removeChildren();
        let backgroundContainer: PIXI.Container = new PIXI.Container();

        let backgroundSprite = PIXI.TilingSprite.from("Background1", this.skillTreeData.width * (this.skillTreeData.scale * 1.25), this.skillTreeData.height * (this.skillTreeData.scale * 1.25));
        backgroundSprite.anchor.set(.5);
        this.viewport.addChild(backgroundSprite);

        for (let id in this.skillTreeData.groups) {
            let group = this.skillTreeData.groups[id];
            if (group.n.find(id => this.skillTreeData.nodes[id].ascendancyName !== "") !== undefined || group.oo.length === 0) {
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
            sprite.position.set(Math.ceil(group.x * this.skillTreeData.scale), Math.ceil(group.y * this.skillTreeData.scale));
            sprite.anchor.set(.5);
            backgroundContainer.addChild(sprite);

            if (max === 3) {
                sprite.anchor.set(.5, 1);
                let sprite2 = PIXI.Sprite.from(`PSGroupBackground${max}`);
                sprite2.rotation = Math.PI;
                sprite2.position.set(Math.ceil(group.x * this.skillTreeData.scale), Math.ceil(group.y * this.skillTreeData.scale));
                sprite2.anchor.set(.5, 1);
                backgroundContainer.addChild(sprite2);
            }
        }

        for (let id in this.skillTreeData.groups) {
            let group = this.skillTreeData.groups[id];
            if (group.n.filter(id => this.skillTreeData.nodes[id].isAscendancyStart).length <= 0) {
                continue;
            }
            let ascendancyName = group.n.map(id => this.skillTreeData.nodes[id].ascendancyName)[0];
            let sprite = PIXI.Sprite.from(`Classes${ascendancyName}`);
            sprite.position.set(Math.ceil(group.x * this.skillTreeData.scale), Math.ceil(group.y * this.skillTreeData.scale));
            sprite.anchor.set(.5);
            backgroundContainer.addChild(sprite);

            for (let id in this.skillTreeData.skillTreeOptions.ascClasses) {
                let ascClasses = this.skillTreeData.skillTreeOptions.ascClasses[id];
                for (let classid in ascClasses.classes) {
                    let ascClass = ascClasses.classes[classid];
                    if (ascClass.name === ascendancyName) {
                        let rect = ascClass.flavourTextRect.split(",");
                        let x = Math.ceil((group.x + +rect[0]) * this.skillTreeData.scale) - sprite.width / 2;
                        let y = Math.ceil((group.y + +rect[1]) * this.skillTreeData.scale) - sprite.height / 2;
                        let c = ascClass.flavourTextColour.split(",");
                        let r = +c[0];
                        let g = +c[1];
                        let b = +c[2];
                        let colour = "0x" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                        let text = new PIXI.Text(ascClass.flavourText, { fill: colour, fontSize: 48, fontFamily: "serif", fontStyle: "italic", stroke: 0x000000, strokeThickness: 4 });
                        text.position.set(x, y);
                        text.scale.set(this.skillTreeData.scale);
                        backgroundContainer.addChild(text);
                    }
                }
            }
        }

        for (let id of this.skillTreeData.root.out) {
            let node = this.skillTreeData.nodes[id];
            if (node.spc.length !== 1) {
                // Root node with no/multiple classes?
                continue;
            }

            let graphic = PIXI.Sprite.from("PSStartNodeBackgroundInactive");
            graphic.position.set(node.group.x * this.skillTreeData.scale, node.group.y * this.skillTreeData.scale);
            graphic.anchor.set(.5);
            this.characterStarts.addChild(graphic);
        }

        // Render background as a texture
        this.background = this.createRenderTextureContainer(backgroundContainer);
        this.background.interactive = false;
        backgroundContainer.destroy();
        this.viewport.addChild(this.background);

        this.RenderBaseNodes();

        this.skillIcons_compare.interactive = false;
        this.skillIcons_compare.interactiveChildren = true;
        this.viewport.addChild(this.skillIcons_compare);

        this.skillIcons.interactive = false;
        this.skillIcons.interactiveChildren = true;
        this.viewport.addChild(this.skillIcons);

        this.characterStarts.interactive = false;
        this.characterStarts.interactiveChildren = false;
        this.viewport.addChild(this.characterStarts);
        this.UpdateJewelSocketHighlightPosition();
    }

    private RenderBaseNodes = () => {
        if (this.viewport.children.indexOf(this.connections) > 0) {
            this.viewport.removeChild(this.connections);
        }
        if (this.connections.children.length > 0) {
            this.connections.removeChildren();
        }

        let connectionsContainer: PIXI.Container = new PIXI.Container();
        let drawn_connections: { [id: number]: Array<number> } = {};
        for (let id in this.skillTreeData.nodes) {
            var node = this.skillTreeData.nodes[id];
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

                    return this.skillTreeData.nodes[outID]
                });
            connectionsContainer.addChild(this.SkillNodeRenderer.CreateConnections(node, nodes));

            this.skillIcons.addChild(this.SkillNodeRenderer.CreateIcon(node));
            let frame = this.SkillNodeRenderer.CreateFrame(node, node.out.map(x => this.skillTreeData.nodes[x]));
            if (frame !== null) {
                this.skillIcons.addChild(frame);
            }

            if (this.skillTreeData_compare !== undefined && this.skillTreeData_compare.nodes[node.id] === undefined) {
                let highlighter = this.SkillNodeRenderer.CreateHighlight(node, 0x00FF00);
                if (highlighter !== null) {
                    this.skillIcons.addChild(highlighter);
                }
            }
            if (this.skillTreeData_compare !== undefined && this.skillTreeData_compare.nodes[node.id] !== undefined) {
                let node2 = this.skillTreeData_compare.nodes[node.id];
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
                    let highlighter = this.SkillNodeRenderer.CreateHighlight(node, 0xFFB000);
                    if (highlighter !== null) {
                        this.skillIcons.addChild(highlighter);
                    }
                }
            }
        }

        if (this.skillTreeData_compare !== undefined) {
            for (let id in this.skillTreeData_compare.nodes) {
                var node = this.skillTreeData_compare.nodes[id];
                if (this.skillTreeData.nodes[node.id] === undefined) {
                    node.add(SkillNodeStates.Compared);
                    this.skillIcons_compare.addChild(this.SkillNodeRenderer.CreateIcon(node, "Compare"));
                    let frame = this.SkillNodeRenderer.CreateFrame(node, node.out.map(x => (<SkillTreeData>this.skillTreeData_compare).nodes[x]));
                    if (frame !== null) {
                        this.skillIcons_compare.addChild(frame);
                    }
                    let highlighter = this.SkillNodeRenderer.CreateHighlight(node, 0xFF0000, "Compare")
                    if (highlighter !== null) {
                        this.skillIcons_compare.addChild(highlighter);
                    }
                }
            }
        }

        // Render connections as a texture
        this.connections = this.createRenderTextureContainer(connectionsContainer);
        this.connections.interactive = false;
        connectionsContainer.destroy();
        this.viewport.addChildAt(this.connections, this.viewport.children.indexOf(this.background) + 1);
    }

    private connectionsActive: PIXI.Container = new PIXI.Container();
    private skillIconsActive: PIXI.Container = new PIXI.Container();
    public RenderActive = (): void => {
        if (!this.Initialized) {
            return;
        }

        if (this.viewport.children.indexOf(this.connectionsActive) > 0) {
            this.viewport.removeChild(this.connectionsActive);
        }
        if (this.viewport.children.indexOf(this.skillIconsActive) > 0) {
            this.viewport.removeChild(this.skillIconsActive);
        }

        if (this.connectionsActive.children.length > 0) {
            this.connectionsActive.removeChildren();
        }
        if (this.skillIconsActive.children.length > 0) {
            this.skillIconsActive.removeChildren();
        }

        let drawn_connections: { [id: number]: Array<number> } = {};
        for (let id in this.skillTreeData.nodes) {
            var node = this.skillTreeData.nodes[id];
            if ((!node.is(SkillNodeStates.Active) && node.alternate_ids === undefined) || node.spc.length > 0) {
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

                    return this.skillTreeData.nodes[outID]
                });

            this.connectionsActive.addChild(this.SkillNodeRenderer.CreateConnections(node, nodes));
            for (let out of nodes) {
                let frame = this.SkillNodeRenderer.CreateFrame(out, node.out.map(x => this.skillTreeData.nodes[x]));
                if (frame !== null) {
                    this.skillIconsActive.addChild(frame);
                }
            }

            this.skillIconsActive.addChild(this.SkillNodeRenderer.CreateIcon(node));
            let frame = this.SkillNodeRenderer.CreateFrame(node, node.out.map(x => this.skillTreeData.nodes[x]));
            if (frame !== null) {
                this.skillIconsActive.addChild(frame);
            }
        }

        this.connectionsActive.interactive = false;
        this.skillIconsActive.interactive = false;

        this.viewport.addChildAt(this.connectionsActive, this.viewport.children.indexOf(this.connections) + 1);
        this.viewport.addChildAt(this.skillIconsActive, this.viewport.children.indexOf(this.skillIcons) + 1);
        this.UpdateJewelSocketHighlightPosition();
    }

    private backgroundActive: PIXI.Container = new PIXI.Container();
    private characterStartsActive: PIXI.Container = new PIXI.Container();
    public RenderCharacterStartsActive = (): void => {
        if (!this.Initialized) {
            return;
        }

        if (this.viewport.children.indexOf(this.backgroundActive) > 0) {
            this.viewport.removeChild(this.backgroundActive);
        }
        if (this.viewport.children.indexOf(this.characterStartsActive) > 0) {
            this.viewport.removeChild(this.characterStartsActive);
        }

        if (this.backgroundActive.children.length > 0) {
            this.backgroundActive.removeChildren();
        }
        if (this.characterStartsActive.children.length > 0) {
            this.characterStartsActive.removeChildren();
        }

        for (let id of this.skillTreeData.root.out) {
            let node = this.skillTreeData.nodes[id];
            if (node.spc.length !== 1 || !node.is(SkillNodeStates.Active)) {
                continue;
            }
            let class_name = utils.getKeyByValue(this.skillTreeData.constants.classes, node.spc[0]);
            if (class_name === undefined) {
                throw new Error(`Couldn't find class name from constants: ${node.spc[0]}`);
            }

            let class_node_graphic = PIXI.Sprite.from(`Background${class_name.replace("Class", "")}`);
            class_node_graphic.anchor.set(.5)
            class_node_graphic.position.set(node.group.x * this.skillTreeData.scale, node.group.y * this.skillTreeData.scale);
            this.backgroundActive.addChild(class_node_graphic);

            let common_name = this.skillTreeData.constants.classesToName[class_name];
            let node_graphic = PIXI.Sprite.from(`center${common_name.toLocaleLowerCase()}`);
            node_graphic.anchor.set(.5)
            node_graphic.position.set(node.x, node.y);
            this.characterStartsActive.addChild(node_graphic);
        }

        this.viewport.addChildAt(this.backgroundActive, this.viewport.children.indexOf(this.background));
        this.viewport.addChild(this.characterStartsActive);
        this.UpdateJewelSocketHighlightPosition();
    }

    public StopRenderHover = (): void => {
        this.updateHover = false;
    }
    public StartRenderHover = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.updateHover = true;
        this.RenderHover();
    }

    private tooltip: PIXI.Graphics | undefined = undefined;
    private tooltip_compare: PIXI.Graphics | undefined = undefined;
    private pathing_connections: PIXI.Container = new PIXI.Container();
    private pathing_skillIcons: PIXI.Container = new PIXI.Container();
    private RenderHover = (): void => {
        if (this.viewport.children.indexOf(this.pathing_connections) > 0) {
            this.viewport.removeChild(this.pathing_connections);
        }
        if (this.viewport.children.indexOf(this.pathing_skillIcons) > 0) {
            this.viewport.removeChild(this.pathing_skillIcons);
        }
        if (this.tooltip !== undefined && this.viewport.children.indexOf(this.tooltip) > 0) {
            this.viewport.removeChild(this.tooltip);
        }
        if (this.tooltip_compare !== undefined && this.viewport.children.indexOf(this.tooltip_compare) > 0) {
            this.viewport.removeChild(this.tooltip_compare);
        }

        if (this.tooltip !== undefined && this.tooltip.children.length > 0) {
            this.tooltip.removeChildren();
            this.tooltip = undefined;
        }
        if (this.tooltip_compare !== undefined && this.tooltip_compare.children.length > 0) {
            this.tooltip_compare.removeChildren();
            this.tooltip_compare = undefined;
        }
        if (this.pathing_connections.children.length > 0) {
            this.pathing_connections.removeChildren();
        }
        if (this.pathing_skillIcons.children.length > 0) {
            this.pathing_skillIcons.removeChildren();
        }

        let drawn_connections: { [id: number]: Array<number> } = {};
        for (let id in this.skillTreeData.nodes) {
            let node = this.skillTreeData.nodes[id];
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

                        return this.skillTreeData.nodes[outID]
                    });

                this.pathing_connections.addChild(this.SkillNodeRenderer.CreateConnections(node, nodes));
                let frame = this.SkillNodeRenderer.CreateFrame(node, node.out.map(x => this.skillTreeData.nodes[x]));
                if (frame !== null) {
                    this.pathing_skillIcons.addChild(frame);
                }
            }
            if (node.is(SkillNodeStates.Hovered)) {
                let padding = 10;
                let text = this.SkillNodeRenderer.CreateTooltip(node, "Base");
                text.position.set(padding / 2, padding / 2);

                this.tooltip = new PIXI.Graphics();
                this.tooltip.beginFill(0x000000, .75);
                this.tooltip.lineStyle(2, 0xCBB59C)
                this.tooltip.drawRect(0, 0, text.width + padding, text.height + padding);
                this.tooltip.endFill();

                this.tooltip.addChild(text);
                let mouse = PIXI.utils.isMobile.phone
                    ? new PIXI.Point(node.x + 50, node.y - 15) :
                    this.pixi.renderer.plugins.interaction.mouse.getLocalPosition(this.viewport);
                this.tooltip.position.set(mouse.x + 10, mouse.y - 5);

                if (this.skillTreeData_compare !== undefined) {
                    for (let idc in this.skillTreeData_compare.nodes) {
                        let n = this.skillTreeData_compare.nodes[idc];
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

        if (this.skillTreeData_compare !== undefined) {
            for (let id in this.skillTreeData_compare.nodes) {
                let node = this.skillTreeData_compare.nodes[id];
                if (node.is(SkillNodeStates.Hovered)) {
                    let padding = 10;
                    let text = this.SkillNodeRenderer.CreateTooltip(node, "Compare");
                    text.position.set(padding / 2, padding / 2);

                    this.tooltip_compare = new PIXI.Graphics();
                    this.tooltip_compare.beginFill(0x000000, .75);
                    this.tooltip_compare.lineStyle(2, 0xFFB000)
                    this.tooltip_compare.drawRect(0, 0, text.width + padding, text.height + padding);
                    this.tooltip_compare.endFill();

                    this.tooltip_compare.addChild(text);
                    let mouse = PIXI.utils.isMobile.phone
                        ? new PIXI.Point(node.x + 50, node.y - 15) :
                        this.pixi.renderer.plugins.interaction.mouse.getLocalPosition(this.viewport);
                    this.tooltip_compare.position.set(mouse.x + 10, mouse.y - 5);
                }
            }
        }

        if (this.updateHover) {
            this.viewport.addChildAt(this.pathing_connections, Math.max(this.viewport.children.indexOf(this.connections), this.viewport.children.indexOf(this.connectionsActive)) + 1);
            this.viewport.addChildAt(this.pathing_skillIcons, Math.max(this.viewport.children.indexOf(this.skillIcons), this.viewport.children.indexOf(this.skillIconsActive)) + 1);
            if (this.tooltip !== undefined) {
                this.viewport.addChild(this.tooltip);
            }

            if (this.tooltip_compare !== undefined) {
                this.viewport.addChild(this.tooltip_compare);
            }

            if (this.tooltip !== undefined) {
                let bounds = this.tooltip.getBounds();
                if (this.tooltip.worldTransform.tx + bounds.width > screen.width) {
                    this.tooltip.x -= this.tooltip.width / (PIXI.utils.isMobile.phone ? 2 : 1);
                }
                if (this.tooltip.worldTransform.ty + bounds.height > screen.height) {
                    this.tooltip.y -= this.tooltip.height / (PIXI.utils.isMobile.phone ? 2 : 1);
                }
                if (!PIXI.utils.isMobile.phone) {
                    this.tooltip.scale.set(this.tooltip.width / bounds.width, this.tooltip.height / bounds.height);
                }
            }

            if (this.tooltip_compare !== undefined) {
                let bounds_compare = this.tooltip_compare.getBounds();
                if (this.tooltip !== undefined) {
                    this.tooltip_compare.y = this.tooltip.y;
                    this.tooltip_compare.x = this.tooltip.x + this.tooltip.width;
                }
                else {
                    if (this.tooltip_compare.worldTransform.tx + bounds_compare.width > screen.width) {
                        this.tooltip_compare.x -= this.tooltip_compare.width / (PIXI.utils.isMobile.phone ? 2 : 1);
                    }
                    if (this.tooltip_compare.worldTransform.ty + bounds_compare.height > screen.height) {
                        this.tooltip_compare.y -= this.tooltip_compare.height / (PIXI.utils.isMobile.phone ? 2 : 1);
                    }
                }

                if (!PIXI.utils.isMobile.phone) {
                    this.tooltip_compare.scale.set(this.tooltip_compare.width / bounds_compare.width, this.tooltip_compare.height / bounds_compare.height);
                }
            }

            this.UpdateJewelSocketHighlightPosition();
            requestAnimationFrame(this.RenderHover);
        }
    }

    private highlights: PIXI.Container = new PIXI.Container();
    public RenderHighlight = (): void => {
        if (!this.Initialized) {
            return;
        }

        if (this.viewport.children.indexOf(this.highlights) > 0) {
            this.viewport.removeChild(this.highlights);
        }
        if (this.highlights.children.length > 0) {
            this.highlights.removeChildren();
        }

        let highlightsContainer: PIXI.Container = new PIXI.Container();
        for (let id in this.skillTreeData.nodes) {
            let node = this.skillTreeData.nodes[id];
            let highlight = this.SkillNodeRenderer.CreateHighlight(node);
            if (highlight !== null) {
                highlightsContainer.addChild(highlight)
            }
        }

        this.highlights = this.createRenderTextureContainer(highlightsContainer);
        this.highlights.interactive = false;
        highlightsContainer.destroy();
        this.viewport.addChild(this.highlights);
        this.UpdateJewelSocketHighlightPosition();
    }

    public CreateScreenshot = (mimeType: 'image/jpeg' | 'image/webp'): string => {
        return this.pixi.renderer.plugins.extract.base64(this.viewport, mimeType, 1);
    }

    private MAX_COL_WIDTH: number = 2048;
    private MAX_ROW_HEIGHT: number = 2048;
    private createRenderTextureContainer = (obj: PIXI.Container, offset: PIXI.Rectangle | null = null): PIXI.Container => {
        const DEFAULT_OFFSET: PIXI.Rectangle = new PIXI.Rectangle(Math.abs(this.skillTreeData.min_x * this.skillTreeData.scale) * 1.25, Math.abs(this.skillTreeData.min_y * this.skillTreeData.scale) * 1.35, this.skillTreeData.width * this.skillTreeData.scale, this.skillTreeData.height * this.skillTreeData.scale);
        if (offset === null) {
            offset = DEFAULT_OFFSET;
        }

        let returnContainer = new PIXI.Container();
        obj.position.set(offset.x, offset.y);

        let cols = Math.ceil((offset.width * 1.15) / this.MAX_COL_WIDTH);
        let rows = Math.ceil((offset.height * 1.15) / this.MAX_ROW_HEIGHT);

        for (let i = 0; i < cols; i++) {
            var x = i * this.MAX_COL_WIDTH;
            obj.position.x = offset.x - x;

            for (let j = 0; j < rows; j++) {
                var y = j * this.MAX_ROW_HEIGHT;
                obj.position.y = offset.y - y;

                let sprite = new PIXI.Sprite(this.createRenderTexture(obj, this.MAX_ROW_HEIGHT, this.MAX_COL_WIDTH));
                sprite.position.set(-obj.position.x, -obj.position.y);
                returnContainer.addChild(sprite);
            }
        }

        return returnContainer;
    }

    private createRenderTexture = (obj: PIXI.Container, width: number, height: number): PIXI.RenderTexture => {
        let renderTexture = PIXI.RenderTexture.create({ height: height, width: width, scaleMode: PIXI.SCALE_MODES.LINEAR, resolution: 1 });
        this.pixi.renderer.render(obj, renderTexture);
        return renderTexture;
    }

}