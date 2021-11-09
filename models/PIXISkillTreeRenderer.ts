import { ISkillTreeRenderer } from "./types/ISkillTreeRenderer";
import { SkillTreeData } from './SkillTreeData';
import Viewport = require("pixi-viewport");
import PIXI = require("pixi.js");
import { utils } from "../app/utils";
import { SkillTreeEvents } from "./SkillTreeEvents";
import { SkillNodeStates, SkillNode } from "./SkillNode";
import { PIXISkillNodeRenderer } from "./PIXISkillNodeRenderer";
import { SkillTreeAlternate } from "./SkillTreeAlternate";

export class PIXISkillTreeRenderer implements ISkillTreeRenderer {
    Initialized = false;
    SkillNodeRenderer!: PIXISkillNodeRenderer;
    private updateHover = false;
    private pixi: PIXI.Application;
    private viewport!: Viewport.Viewport;
    private skillTreeData!: SkillTreeData;
    private skillTreeDataCompare!: SkillTreeData | undefined;
    private skillTreeAlternate!: SkillTreeAlternate;

    constructor() {
        this.pixi = new PIXI.Application({ resizeTo: window, resolution: devicePixelRatio });

        PIXI.utils.destroyTextureCache();
        PIXI.Loader.shared.reset();
    }

    async Initialize(container: HTMLElement, skillTreeData: SkillTreeData, skillTreeAlternate: SkillTreeAlternate, skillTreeDataCompare: SkillTreeData | undefined): Promise<boolean> {
        if (this.Initialized) {
            return true;
        }

        this.skillTreeData = skillTreeData;
        this.skillTreeDataCompare = skillTreeDataCompare;
        this.skillTreeAlternate = skillTreeAlternate;
        this.SkillNodeRenderer = new PIXISkillNodeRenderer(this.skillTreeData.skillSprites, skillTreeAlternate, this.skillTreeDataCompare !== undefined ? this.skillTreeDataCompare.skillSprites : undefined, this.skillTreeData.imageZoomLevels.length - 1);
        SkillTreeEvents.on("skilltree", "hovered-nodes-end", (node: SkillNode) => this.SkillNodeRenderer.DestroyTooltip(node, "Base"));
        SkillTreeEvents.on("skilltree", "hovered-nodes-end", (node: SkillNode) => this.SkillNodeRenderer.DestroyTooltip(node, "Compare"));
        SkillTreeEvents.on("skilltree", "jewel-click-end", this.CreateJewelSocketHightlights);
        SkillTreeEvents.on("skilltree", "faction-node-end", this.UpdateFactionNode);
        container.appendChild(this.pixi.view);

        // #region Setup pixi-viewport
        const zoomPercent = skillTreeData.imageZoomLevels.length > 2 ? skillTreeData.imageZoomLevels[1] - skillTreeData.imageZoomLevels[0] : .1;
        this.viewport = new Viewport.Viewport({
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

        const promise = this.LoadAssets([skillTreeData, skillTreeDataCompare]);
        promise.then(() => this.Initialized = true);
        //promise.catch(_ => this.Initialized = false);
        return promise;
    }

    private HandleZoomClick = (click: PIXI.InteractionEvent, zoom: number) => {
        if (!click.data.originalEvent.ctrlKey) {
            return;
        }

        this.viewport.zoomPercent(zoom, false);
    }

    private jewelSocketHighlights: PIXI.Container = new PIXI.Container();
    private HandleShiftClick = (click: PIXI.InteractionEvent) => {
        if (!click.data.originalEvent.shiftKey) {
            return;
        }

        const interactiveObject = this.pixi.renderer.plugins.interaction.hitTest(click.data.global, this.skillIcons);
        if (interactiveObject === null || interactiveObject.name === undefined || interactiveObject.name === null || interactiveObject.name === "") {
            return;
        }

        const node = this.skillTreeData.nodes[+interactiveObject.name];
        if (node.isKeystone) {
            return;
        }

        if (node.isJewelSocket) {
            let settings = this.skillTreeData.Build.JewelSettings[node.GetId()];
            if (settings === undefined) {
                settings = { nodeId: node.GetId() } as ISkillTreeAlternateJewelSettings;
            }
            SkillTreeEvents.fire("skilltree", "jewel-click-start", settings);
        } else if (node.faction !== 0) {
            SkillTreeEvents.fire("skilltree", "faction-node-start", { node: node, choices: this.skillTreeAlternate.nodesByPassiveType[node.GetPassiveType()].filter(x => x.faction === node.faction) });
        }
    }

    private UpdateFactionNode = (event: { nodeId: number; alteranteIds: ISkillNodeAlternateState[] }) => {
        const node = this.skillTreeData.nodes[event.nodeId];
        node.alternateIds = event.alteranteIds.length > 0 ? event.alteranteIds : undefined;

        this.CreateJewelSocketHightlights();
    }

    private CreateJewelSocketHightlights = (newSettings: ISkillTreeAlternateJewelSettings | undefined = undefined) => {
        if (newSettings !== undefined && this.skillTreeData.Build.JewelSettings[newSettings.nodeId] === undefined) {
            this.skillTreeData.Build.JewelSettings[newSettings.nodeId] = JSON.parse(JSON.stringify(newSettings));
        }

        const usedNodes: string[] = [];
        for (const i in this.skillTreeData.Build.JewelSettings) {
            let settings = this.skillTreeData.Build.JewelSettings[i];
            if (settings === undefined) {
                continue;
            }

            if (settings.extraData instanceof PIXI.Container) {
                this.pixi.ticker.remove(this.RotateJewelHighlights, settings.extraData);
                this.jewelSocketHighlights.removeChild(settings.extraData);
                settings.extraData.destroy({ children: true });
                settings.extraData = undefined;
            }

            if (newSettings !== undefined && settings.nodeId === newSettings.nodeId) {
                this.skillTreeData.Build.JewelSettings[newSettings.nodeId] = JSON.parse(JSON.stringify(newSettings)) as ISkillTreeAlternateJewelSettings;
                settings = this.skillTreeData.Build.JewelSettings[newSettings.nodeId];
                if (settings === undefined) {
                    continue;
                }
            }

            if (settings.size !== "None" && settings.extraData === undefined) {
                const node = this.skillTreeData.nodes[settings.nodeId];
                if (node === undefined) {
                    continue;
                }
                const sizes = this.skillTreeData.circles[settings.size];
                const index = this.skillTreeData.imageZoomLevels.length - 1;
                if (index >= sizes.length) {
                    continue;
                }
                const jewelWidth = sizes[index].width;
                const factionCircleName = this.skillTreeAlternate.getJewelCircleNameFromFaction(settings.factionId);
                const sprite1 = PIXI.Sprite.from(`${factionCircleName}JewelCircle1`);
                const sprite2 = PIXI.Sprite.from(`${factionCircleName}JewelCircle${factionCircleName === "" ? 1 : 2}`);
                sprite1.width = sprite1.height = sprite2.width = sprite2.height = jewelWidth;
                sprite1.x = sprite2.x = node.x;
                sprite1.y = sprite2.y = node.y;
                sprite1.anchor.set(.5);
                sprite2.anchor.set(.5);

                const container = new PIXI.Container();
                container.addChild(sprite2);
                container.addChild(sprite1);

                this.jewelSocketHighlights.addChild(container);
                settings.extraData = container;

                const singleNodes: { [id: number]: ISkillNodeAlternateState[] | undefined } = {};
                if (settings.factionId in this.skillTreeAlternate.alternate_tree_keystones) {
                    const keystoneId = this.skillTreeAlternate.alternate_tree_keystones[settings.factionId][settings.name];
                    singleNodes[4] = [{ id: keystoneId, values: [] } as ISkillNodeAlternateState];
                }

                for (const passiveType in this.skillTreeAlternate.passiveTypes) {
                    if (this.skillTreeAlternate.nodesByPassiveType[+passiveType] === undefined) {
                        continue;
                    }
                    const ns = this.skillTreeAlternate.nodesByPassiveType[+passiveType].filter(x => x.faction === (settings as ISkillTreeAlternateJewelSettings).factionId);
                    if (ns.length === 1) {
                        singleNodes[+passiveType] = [{ id: ns[0].id, values: ns[0].stats.map(x => x.min === x.max ? x.min : `${x.min}-${x.max}`) } as ISkillNodeAlternateState];
                    }
                }

                for (const o of this.skillTreeData.getNodesInRange(node.x, node.y, jewelWidth / 2)) {
                    if (o.isJewelSocket) {
                        continue;
                    }
                    usedNodes.push(o.GetId());
                    o.faction = settings.factionId;

                    if (o.alternateIds !== undefined && o.alternateIds.filter(x => this.skillTreeAlternate.nodes[typeof x === "string" ? x : x.id].faction !== (settings as ISkillTreeAlternateJewelSettings).factionId).length > 0) {
                        o.alternateIds = undefined;
                    }

                    if (o.alternateIds === undefined || o.GetPassiveType() === 4) {
                        o.alternateIds = singleNodes[o.GetPassiveType()];
                    }
                }

                if (settings.extraData instanceof PIXI.Container) {
                    this.pixi.ticker.add(this.RotateJewelHighlights, settings.extraData);
                }
            }
        }

        this.skillTreeData.clearAlternates(usedNodes);
        this.UpdateJewelSocketHighlightPosition();
        this.RenderActive();
        SkillTreeEvents.fire("skilltree", "encode-url");
    }

    private RotateJewelHighlights(delta: number) {
        if (this instanceof PIXI.Container) {
            let rotation = 0.0005;
            for (const sprite of this.children) {
                sprite.rotation += rotation * delta;
                rotation *= -1;
            }
        }
    }

    private UpdateJewelSocketHighlightPosition = async (): Promise<void> => {
        this.jewelSocketHighlights.interactive = false;
        this.jewelSocketHighlights.interactiveChildren = false;
        this.jewelSocketHighlights.containerUpdateTransform = () => { };

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
        const filteredData = data.filter(utils.NotUndefined);
        if (filteredData.length <= 0) {
            throw new Error("SkillTreeData has not been defined. Could not load assets.");
        }

        const promise = new Promise<boolean>((resolve) => {
            PIXI.Loader.shared.onComplete.add(() => resolve(true));
            //PIXI.Loader.shared.onError.add(() => reject(false));
        });

        // #region Load Assets
        const addedAssets = new Array<string>();
        for (const i of filteredData) {
            for (const id in i.assets) {
                const asset = i.assets[id];
                if ((asset[i.scale] || asset["1"]) && addedAssets.indexOf(id) < 0) {
                    addedAssets.push(id);
                    PIXI.Loader.shared.add(id.replace("PassiveSkillScreen", ""), `${utils.SKILL_TREES_URI}/${i.patch}/assets/${id}.png`);
                }
            }

            for (const id in i.skillSprites) {
                const sprites = i.skillSprites[id];
                const sprite = sprites[sprites.length - 1];
                const filename = sprite.filename.replace("https://web.poecdn.com/image/passive-skill/", "");
                if (sprite && addedAssets.indexOf(filename) < 0) {
                    addedAssets.push(filename);
                    PIXI.Loader.shared.add(filename.replace("PassiveSkillScreen", ""), `${utils.SKILL_TREES_URI}/${i.patch}/assets/${filename}`);
                }
            }
        }

        if (this.skillTreeAlternate.version !== "") {
            for (const id in this.skillTreeAlternate.skillSprites) {
                const sprites = this.skillTreeAlternate.skillSprites[id];
                const sprite = sprites[sprites.length - 1];
                const filename = sprite.filename.replace("https://web.poecdn.com/image/passive-skill/", "");
                if (sprite && addedAssets.indexOf(filename) < 0) {
                    addedAssets.push(filename);
                    PIXI.Loader.shared.add(filename.replace("PassiveSkillScreen", ""), `${utils.SKILL_TREES_URI}/${this.skillTreeAlternate.version}/assets/${filename}`);
                }
            }
        }
        // #endregion

        // #region Display Loading Bar
        const skillTreeData = filteredData[0];
        PIXI.Loader.shared.load();
        let loadedAssets = 0;
        const loadbarWidth = skillTreeData.width / 2;
        let progressText = "";
        PIXI.Loader.shared.onProgress.add(() => {
            loadedAssets++;
            const newText = `${Math.ceil(loadedAssets / addedAssets.length * 1000) / 10}%`;
            if (newText !== progressText) {
                this.viewport.removeChildren();
                progressText = newText;

                const loadbar = new PIXI.Graphics();
                loadbar.moveTo(0, 0);
                loadbar.beginFill(0xFFFFFF, .75);
                loadbar.lineStyle(2, 0xCBB59C)
                loadbar.drawRect(0, 0, (loadedAssets / addedAssets.length) * loadbarWidth, 50);
                loadbar.endFill();
                loadbar.position.set(-loadbarWidth / 2, screen.height / 2);
                this.viewport.addChild(loadbar);

                const text = new PIXI.Text(progressText, { fontSize: 250, fill: 0xFFFFFF });
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
        const backgroundAsset = this.skillTreeData.assets["Background1"] ? "Background1" : "Background2";
        const background = PIXI.Sprite.from(backgroundAsset);
        const backgroundSprite = new PIXI.TilingSprite(background.texture, this.skillTreeData.width * (this.skillTreeData.scale * 1.25), this.skillTreeData.height * (this.skillTreeData.scale * 1.25));
        backgroundSprite.anchor.set(.5);
        this.viewport.addChild(backgroundSprite);

        for (const id in this.skillTreeData.groups) {
            const group = this.skillTreeData.groups[id];
            const nodes = (group.n || group.nodes || []);
            if (nodes.length === 0 || nodes.find(id => this.skillTreeData.nodes[id].ascendancyName !== "") !== undefined) {
                continue;
            }

            let orbits = group.orbits || [];
            if (group.oo) {
                if (Array.isArray(group.oo)) {
                    group.oo = { "0": group.oo[0] };
                }

                for (const id in group.oo) {
                    orbits.push(+id);
                }
            }

            orbits = orbits.filter(x => x <= 3);
            const max = Math.max(...orbits);
            if (max <= 0) continue;

            const sprite = PIXI.Sprite.from(`PSGroupBackground${max}`);
            sprite.position.set(Math.ceil(group.x * this.skillTreeData.scale), Math.ceil(group.y * this.skillTreeData.scale));
            sprite.anchor.set(.5);
            this.background.addChild(sprite);

            if (max === 3) {
                sprite.anchor.set(.5, 1);
                const sprite2 = PIXI.Sprite.from(`PSGroupBackground${max}`);
                sprite2.rotation = Math.PI;
                sprite2.position.set(Math.ceil(group.x * this.skillTreeData.scale), Math.ceil(group.y * this.skillTreeData.scale));
                sprite2.anchor.set(.5, 1);
                this.background.addChild(sprite2);
            }
        }

        for (const id in this.skillTreeData.groups) {
            const group = this.skillTreeData.groups[id];
            const nodes = (group.n || group.nodes || []);
            if (nodes.filter(id => this.skillTreeData.nodes[id].isAscendancyStart).length <= 0) {
                continue;
            }
            const ascendancyName = nodes.map(id => this.skillTreeData.nodes[id].ascendancyName)[0];
            const sprite = PIXI.Sprite.from(`Classes${ascendancyName}`);
            sprite.position.set(Math.ceil(group.x * this.skillTreeData.scale), Math.ceil(group.y * this.skillTreeData.scale));
            sprite.anchor.set(.5);
            this.background.addChild(sprite);

            if (this.skillTreeData.classes === undefined) {
                continue;
            }
            for (const id in this.skillTreeData.classes) {
                const ascClasses = this.skillTreeData.classes[id];
                for (const classid in ascClasses.ascendancies) {
                    const ascClass = ascClasses.ascendancies[classid];
                    if (ascClass.name === ascendancyName && ascClass.flavourTextRect !== undefined) {
                        const rect = typeof ascClass.flavourTextRect === "string" ? ascClass.flavourTextRect.split(",") : [ascClass.flavourTextRect.x, ascClass.flavourTextRect.y];
                        const x = Math.ceil((group.x + +rect[0]) * this.skillTreeData.scale) - sprite.width / 2;
                        const y = Math.ceil((group.y + +rect[1]) * this.skillTreeData.scale) - sprite.height / 2;

                        let r = 0;
                        let g = 0;
                        let b = 0;
                        if (ascClass.flavourTextColour.indexOf(',') > 0) {
                            const c = ascClass.flavourTextColour.split(",");
                            r = +c[0];
                            g = +c[1];
                            b = +c[2];
                        } else {
                            const c = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec("#" + ascClass.flavourTextColour);
                            if (c && c.length === 4) {
                                r = parseInt(c[1], 16);
                                g = parseInt(c[2], 16);
                                b = parseInt(c[3], 16);
                            }
                        }

                        const colour = "0x" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                        const text = new PIXI.Text(ascClass.flavourText, { fill: colour, fontSize: 48, fontFamily: "serif", fontStyle: "italic", stroke: 0x000000, strokeThickness: 4 });
                        text.position.set(x, y);
                        text.scale.set(this.skillTreeData.scale);
                        this.background.addChild(text);
                    }
                }
            }
        }

        for (const id of this.skillTreeData.root.out) {
            const node = this.skillTreeData.nodes[id];
            if (node.classStartIndex === undefined || node.nodeGroup === undefined) {
                continue;
            }

            const graphic = PIXI.Sprite.from("PSStartNodeBackgroundInactive");
            graphic.position.set(node.nodeGroup.x * this.skillTreeData.scale, node.nodeGroup.y * this.skillTreeData.scale);
            graphic.anchor.set(.5);
            this.characterStarts.addChild(graphic);
        }

        // Render background as a texture
        this.background.interactive = false;
        this.background.interactiveChildren = false;
        this.background.containerUpdateTransform = () => { };
        this.viewport.addChild(this.background);

        this.RenderBaseNodes();

        this.skillIcons_compare.interactive = false;
        this.skillIcons_compare.interactiveChildren = true;
        this.skillIcons_compare.containerUpdateTransform = () => { };
        this.viewport.addChild(this.skillIcons_compare);

        this.skillIcons.interactive = false;
        this.skillIcons.interactiveChildren = true;
        this.skillIcons.containerUpdateTransform = () => { };
        this.viewport.addChild(this.skillIcons);

        this.characterStarts.interactive = false;
        this.characterStarts.interactiveChildren = false;
        this.characterStarts.containerUpdateTransform = () => { };
        this.viewport.addChild(this.characterStarts);
        this.UpdateJewelSocketHighlightPosition();
    }

    private RenderBaseNodes = () => {
        if (this.viewport.children.indexOf(this.connections) > 0) {
            this.viewport.removeChild(this.connections);
        }
        if (this.connections.children.length > 0) {
            this.connections = new PIXI.Container();
        }

        const drawnConnections: { [id: string]: boolean } = {};
        for (const id in this.skillTreeData.nodes) {
            const node = this.skillTreeData.nodes[id];
            if (node.nodeGroup === undefined) {
                continue;
            }
            const nodes = node.in
                .filter((outID) => {
                    return !drawnConnections[`${+id}-${outID}`] || !drawnConnections[`${outID}-${+id}`];
                })
                .map((outID) => {
                    drawnConnections[`${+id}-${outID}`] = true;
                    drawnConnections[`${outID}-${+id}`] = true;
                    return this.skillTreeData.nodes[outID]
                });

            this.connections.addChild(this.SkillNodeRenderer.CreateConnections(node, nodes));

            this.skillIcons.addChild(this.SkillNodeRenderer.CreateIcon(node));
            const frame = this.SkillNodeRenderer.CreateFrame(node, node.out.map(x => this.skillTreeData.nodes[x]));
            if (frame !== null) {
                this.skillIcons.addChild(frame);
            }

            if (this.skillTreeDataCompare !== undefined && this.skillTreeDataCompare.nodes[node.GetId()] === undefined) {
                const highlighter = this.SkillNodeRenderer.CreateHighlight(node, 0x00FF00);
                if (highlighter !== null) {
                    this.skillIcons.addChild(highlighter);
                }
            }
            const nodeSize = this.SkillNodeRenderer.GetNodeSize(node);
            if (this.skillTreeDataCompare !== undefined && this.skillTreeDataCompare.nodes[node.GetId()] !== undefined) {
                const node2 = this.skillTreeDataCompare.nodes[node.GetId()];
                let sDiff = node.stats.length !== node2.stats.length;
                const moved = nodeSize && (Math.abs(node.x - node2.x) > nodeSize.width || Math.abs(node.y - node2.y) > nodeSize.height);

                for (const s of node.stats) {
                    let found = false;
                    for (const s2 of node2.stats) {
                        if (s.toUpperCase() === s2.toUpperCase()) {
                            found = true;
                        }
                    }

                    if (!found) {
                        sDiff = true;
                        break;
                    }
                }

                if (sDiff || moved) {
                    this.skillTreeDataCompare.addState(node2, SkillNodeStates.Compared);
                    if (moved) this.skillTreeDataCompare.addState(node2, SkillNodeStates.Moved);
                    const highlighter = this.SkillNodeRenderer.CreateHighlight(node, 0xFFB000);
                    if (highlighter !== null) {
                        this.skillIcons.addChild(highlighter);
                    }
                }
            }
        }

        if (this.skillTreeDataCompare !== undefined) {
            for (const id in this.skillTreeDataCompare.nodes) {
                const node = this.skillTreeDataCompare.nodes[id];
                if (this.skillTreeData.nodes[node.GetId()] === undefined) {
                    this.skillTreeDataCompare.addState(node, SkillNodeStates.Compared);
                    this.skillIcons_compare.addChild(this.SkillNodeRenderer.CreateIcon(node, "Compare"));
                    const frame = this.SkillNodeRenderer.CreateFrame(node, node.out.map(x => (this.skillTreeDataCompare as SkillTreeData).nodes[x]));
                    if (frame !== null) {
                        this.skillIcons_compare.addChild(frame);
                    }
                    const highlighter = this.SkillNodeRenderer.CreateHighlight(node, 0xFF0000, "Compare")
                    if (highlighter !== null) {
                        this.skillIcons_compare.addChild(highlighter);
                    }
                }
            }
        }

        // Render connections as a texture
        this.connections.interactive = false;
        this.connections.interactiveChildren = false;
        this.connections.containerUpdateTransform = () => { };
        this.viewport.addChildAt(this.connections, this.viewport.children.indexOf(this.background) + 1);
    }

    private skillIconActiveEffects: PIXI.Container = new PIXI.Container();
    private connectionsActive: PIXI.Container = new PIXI.Container();
    private skillIconsActive: PIXI.Container = new PIXI.Container();
    public RenderActive = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.RenderHover();

        if (this.viewport.children.indexOf(this.skillIconActiveEffects) > 0) {
            this.viewport.removeChild(this.skillIconActiveEffects);
        }
        if (this.viewport.children.indexOf(this.connectionsActive) > 0) {
            this.viewport.removeChild(this.connectionsActive);
        }
        if (this.viewport.children.indexOf(this.skillIconsActive) > 0) {
            this.viewport.removeChild(this.skillIconsActive);
        }

        if (this.skillIconActiveEffects.children.length > 0) {
            this.skillIconActiveEffects = new PIXI.Container();
        }
        if (this.connectionsActive.children.length > 0) {
            this.connectionsActive = new PIXI.Container();
        }
        if (this.skillIconsActive.children.length > 0) {
            this.skillIconsActive = new PIXI.Container();
        }

        const drawnConnections: { [id: string]: boolean } = {};
        const activeNodes = this.skillTreeData.getNodes(SkillNodeStates.Active);
        for (const id in activeNodes) {
            const node = activeNodes[id];
            if (node.classStartIndex !== undefined) {
                continue;
            }

            const nodes = node.in
                .filter((outID) => {
                    return !drawnConnections[`${+id}-${outID}`] || !drawnConnections[`${outID}-${+id}`];
                })
                .map((outID) => {
                    drawnConnections[`${+id}-${outID}`] = true;
                    drawnConnections[`${outID}-${+id}`] = true;
                    return this.skillTreeData.nodes[outID]
                });

            const effect = this.SkillNodeRenderer.CreateIconEffect(node);
            if (effect !== null) {
                this.skillIconActiveEffects.addChild(effect);
            }

            this.connectionsActive.addChild(this.SkillNodeRenderer.CreateConnections(node, nodes));
            for (const out of nodes) {
                const frame = this.SkillNodeRenderer.CreateFrame(out, node.out.map(x => this.skillTreeData.nodes[x]));
                if (frame !== null) {
                    this.skillIconsActive.addChild(frame);
                }
            }

            this.skillIconsActive.addChild(this.SkillNodeRenderer.CreateIcon(node));
            const frame = this.SkillNodeRenderer.CreateFrame(node, node.out.map(x => this.skillTreeData.nodes[x]));
            if (frame !== null) {
                this.skillIconsActive.addChild(frame);
            }
        }

        this.skillIconActiveEffects.interactive = false;
        this.skillIconActiveEffects.interactiveChildren = false;
        this.skillIconActiveEffects.containerUpdateTransform = () => { };
        this.viewport.addChildAt(this.skillIconActiveEffects, this.viewport.children.indexOf(this.connections) + 1);

        this.connectionsActive.interactive = false;
        this.connectionsActive.interactiveChildren = false;
        this.connectionsActive.containerUpdateTransform = () => { };
        this.viewport.addChildAt(this.connectionsActive, this.viewport.children.indexOf(this.skillIconActiveEffects) + 1);

        this.skillIconsActive.interactive = false;
        this.skillIconsActive.interactiveChildren = false;
        this.skillIconsActive.containerUpdateTransform = () => { };
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
            this.backgroundActive = new PIXI.Container();
        }
        if (this.characterStartsActive.children.length > 0) {
            this.characterStartsActive = new PIXI.Container();
        }

        for (const id of this.skillTreeData.root.out) {
            const node = this.skillTreeData.nodes[id];
            const classId = node.classStartIndex;
            if (classId === undefined || !node.is(SkillNodeStates.Active) || node.nodeGroup === undefined) {
                continue;
            }

            const className = utils.getKeyByValue(this.skillTreeData.constants.classes, classId);
            if (className === undefined) {
                throw new Error(`Couldn't find class name from constants: ${classId}`);
            }

            const commonName = this.skillTreeData.constants.classesToName[className];
            const extraImage = this.skillTreeData.extraImages[commonName]
            if (extraImage) {
                const classNodeGraphic = PIXI.Sprite.from(`Background${className.replace("Class", "")}`);
                classNodeGraphic.anchor.set(0)
                classNodeGraphic.position.set(extraImage.x * this.skillTreeData.scale, extraImage.y * this.skillTreeData.scale);
                this.backgroundActive.addChild(classNodeGraphic);
            }

            const nodeGraphic = PIXI.Sprite.from(`center${commonName.toLocaleLowerCase()}`);
            nodeGraphic.anchor.set(.5)
            nodeGraphic.position.set(node.x, node.y);
            this.characterStartsActive.addChild(nodeGraphic);
        }

        this.backgroundActive.interactive = false;
        this.backgroundActive.interactiveChildren = false;
        this.backgroundActive.containerUpdateTransform = () => { };
        this.viewport.addChildAt(this.backgroundActive, this.viewport.children.indexOf(this.background));

        this.characterStartsActive.interactive = false;
        this.characterStartsActive.interactiveChildren = false;
        this.characterStartsActive.containerUpdateTransform = () => { };
        this.viewport.addChild(this.characterStartsActive);

        this.UpdateJewelSocketHighlightPosition();
    }

    public StopRenderHover = (): void => {
        this.updateHover = false;
        if (!this.Initialized) {
            return;
        }

        this.RenderHover();
    }
    public StartRenderHover = (): void => {
        this.updateHover = true;
        if (!this.Initialized) {
            return;
        }

        this.RenderHover();
        this.RenderTooltip();
    }

    private nodeMoveCompare: PIXI.Graphics | undefined = undefined;
    private pathingConnections: PIXI.Container = new PIXI.Container();
    private pathingSkillIcons: PIXI.Container = new PIXI.Container();
    private RenderHover = async (): Promise<void> => {
        if (this.viewport.children.indexOf(this.pathingConnections) > 0) {
            this.viewport.removeChild(this.pathingConnections);
        }

        if (this.viewport.children.indexOf(this.pathingSkillIcons) > 0) {
            this.viewport.removeChild(this.pathingSkillIcons);
        }

        if (this.nodeMoveCompare !== undefined && this.viewport.children.indexOf(this.nodeMoveCompare) > 0) {
            this.viewport.removeChild(this.nodeMoveCompare);

        }
        this.nodeMoveCompare = undefined;

        if (this.pathingConnections.children.length > 0) {
            this.pathingConnections = new PIXI.Container();
        }

        if (this.pathingSkillIcons.children.length > 0) {
            this.pathingSkillIcons = new PIXI.Container();
        }

        if (!this.updateHover) {
            return;
        }

        const drawnConnections: { [id: string]: boolean } = {};
        const pathingNodes = this.skillTreeData.getNodes(SkillNodeStates.Pathing);
        for (const id in pathingNodes) {
            const node = pathingNodes[id];
            const nodes = node.in
                .filter((outID) => {
                    return !drawnConnections[`${+id}-${outID}`] || !drawnConnections[`${outID}-${+id}`];
                })
                .map((outID) => {
                    drawnConnections[`${+id}-${outID}`] = true;
                    drawnConnections[`${outID}-${+id}`] = true;
                    return this.skillTreeData.nodes[outID]
                });

            this.pathingConnections.addChild(this.SkillNodeRenderer.CreateConnections(node, nodes));
            const frame = this.SkillNodeRenderer.CreateFrame(node, node.out.map(x => this.skillTreeData.nodes[x]));
            if (frame !== null) {
                this.pathingSkillIcons.addChild(frame);
            }
        }

        if (this.skillTreeDataCompare !== undefined) {
            const hoveredNodes = this.skillTreeData.getNodes(SkillNodeStates.Hovered);
            for (const id in hoveredNodes) {
                const node = hoveredNodes[id];

                this.skillTreeDataCompare.clearState(SkillNodeStates.Hovered);

                let other = this.skillTreeDataCompare.nodes[node.GetId()];
                if (other === undefined) {
                    for (const idc in this.skillTreeDataCompare.nodes) {
                        const n = this.skillTreeDataCompare.nodes[idc];
                        if ((Math.abs(n.x - node.x) < 5 && Math.abs(n.y - node.y) < 5)) {
                            other = n;
                        }
                    }
                }

                if (other && other.is(SkillNodeStates.Compared)) {
                    this.skillTreeDataCompare.addState(other, SkillNodeStates.Hovered);
                }

                if (node.nodeGroup !== undefined && node.is(SkillNodeStates.Moved)) {
                    const highlighter = this.SkillNodeRenderer.CreateHighlight(node, 0xFF1493)
                    if (highlighter !== null) {
                        this.nodeMoveCompare = highlighter;
                    }
                }
            }
        }

        this.pathingConnections.interactive = false;
        this.pathingConnections.interactiveChildren = false;
        this.pathingConnections.containerUpdateTransform = () => { };
        this.viewport.addChildAt(this.pathingConnections, Math.max(this.viewport.children.indexOf(this.connections), this.viewport.children.indexOf(this.connectionsActive)) + 1);

        this.pathingSkillIcons.interactive = false;
        this.pathingSkillIcons.interactiveChildren = false;
        this.pathingSkillIcons.containerUpdateTransform = () => { };
        this.viewport.addChildAt(this.pathingSkillIcons, Math.max(this.viewport.children.indexOf(this.skillIcons), this.viewport.children.indexOf(this.skillIconsActive)) + 1);

        if (this.nodeMoveCompare !== undefined) {
            this.nodeMoveCompare.interactive = false;
            this.nodeMoveCompare.interactiveChildren = false;
            this.nodeMoveCompare.containerUpdateTransform = () => { };
            this.viewport.addChild(this.nodeMoveCompare);
        }

        this.UpdateJewelSocketHighlightPosition();
    }

    private tooltip: PIXI.Graphics | undefined = undefined;
    private tooltipCompare: PIXI.Graphics | undefined = undefined;
    private RenderTooltip = async (): Promise<void> => {
        if (this.tooltip !== undefined && this.viewport.children.indexOf(this.tooltip) > 0) {
            this.viewport.removeChild(this.tooltip);
        }

        if (this.tooltipCompare !== undefined && this.viewport.children.indexOf(this.tooltipCompare) > 0) {
            this.viewport.removeChild(this.tooltipCompare);
        }

        this.tooltip = undefined;
        this.tooltipCompare = undefined;

        if (!this.updateHover) {
            return
        }

        const nodes = this.skillTreeData.getNodes(SkillNodeStates.Hovered);
        for (const id in nodes) {
            const node = nodes[id];

            const padding = 10;
            const text = this.SkillNodeRenderer.CreateTooltip(node, "Base");
            text.position.set(padding / 2, padding / 2);

            this.tooltip = new PIXI.Graphics();
            this.tooltip.beginFill(0x000000, .75);
            this.tooltip.lineStyle(2, 0xCBB59C)
            this.tooltip.drawRect(0, 0, text.width + padding, text.height + padding);
            this.tooltip.endFill();

            this.tooltip.addChild(text);
            const mouse = PIXI.utils.isMobile.phone
                ? new PIXI.Point(node.x + 50, node.y - 15) :
                this.pixi.renderer.plugins.interaction.mouse.getLocalPosition(this.viewport);
            this.tooltip.position.set(mouse.x + 10, mouse.y - 5);
        }

        if (this.skillTreeDataCompare !== undefined) {
            const nodes = this.skillTreeDataCompare.getNodes(SkillNodeStates.Hovered);
            for (const id in nodes) {
                const node = nodes[id];
                if (node.nodeGroup === undefined) {
                    continue;
                }

                const padding = 10;
                const text = this.SkillNodeRenderer.CreateTooltip(node, "Compare");
                text.position.set(padding / 2, padding / 2);

                this.tooltipCompare = new PIXI.Graphics();
                this.tooltipCompare.beginFill(0x000000, .75);
                this.tooltipCompare.lineStyle(2, 0xFFB000)
                this.tooltipCompare.drawRect(0, 0, text.width + padding, text.height + padding);
                this.tooltipCompare.endFill();

                this.tooltipCompare.addChild(text);
                const mouse = PIXI.utils.isMobile.phone
                    ? new PIXI.Point(node.x + 50, node.y - 15) :
                    this.pixi.renderer.plugins.interaction.mouse.getLocalPosition(this.viewport);
                this.tooltipCompare.position.set(mouse.x + 10, mouse.y - 5);
            }
        }

        if (this.tooltip !== undefined) {
            this.tooltip.interactive = false;
            this.tooltip.interactiveChildren = false;
            this.tooltip.containerUpdateTransform = () => { };
            this.viewport.addChild(this.tooltip);
        }

        if (this.tooltipCompare !== undefined) {
            this.tooltipCompare.interactive = false;
            this.tooltipCompare.interactiveChildren = false;
            this.tooltipCompare.containerUpdateTransform = () => { };
            this.viewport.addChild(this.tooltipCompare);
        }

        if (this.tooltip !== undefined) {
            const bounds = this.tooltip.getBounds();
            if (this.tooltip.worldTransform.tx + bounds.width > screen.width) {
                this.tooltip.x -= this.tooltip.width / devicePixelRatio;
            }
            if (this.tooltip.worldTransform.ty + bounds.height > screen.height) {
                this.tooltip.y -= this.tooltip.height / devicePixelRatio;
            }

            this.tooltip.scale.set(this.tooltip.width / bounds.width / devicePixelRatio, this.tooltip.height / bounds.height / devicePixelRatio);
        }

        if (this.tooltipCompare !== undefined) {
            const boundsCompare = this.tooltipCompare.getBounds();
            if (this.tooltip !== undefined) {
                this.tooltipCompare.y = this.tooltip.y;
                this.tooltipCompare.x = this.tooltip.x + this.tooltip.width;
            }
            else {
                if (this.tooltipCompare.worldTransform.tx + boundsCompare.width > screen.width) {
                    this.tooltipCompare.x -= this.tooltipCompare.width / devicePixelRatio;
                }
                if (this.tooltipCompare.worldTransform.ty + boundsCompare.height > screen.height) {
                    this.tooltipCompare.y -= this.tooltipCompare.height / devicePixelRatio;
                }
            }

            this.tooltipCompare.scale.set(this.tooltipCompare.width / boundsCompare.width / devicePixelRatio, this.tooltipCompare.height / boundsCompare.height / devicePixelRatio);
        }

        this.UpdateJewelSocketHighlightPosition();
        requestAnimationFrame(this.RenderTooltip);
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
            this.highlights = new PIXI.Container();
        }

        for (const id in this.skillTreeData.nodes) {
            const node = this.skillTreeData.nodes[id];
            const highlight = this.SkillNodeRenderer.CreateHighlight(node);
            if (highlight !== null) {
                this.highlights.addChild(highlight)
            }
        }

        this.highlights.interactive = false;
        this.highlights.interactiveChildren = false;
        this.highlights.containerUpdateTransform = () => { };
        this.viewport.addChild(this.highlights);
        this.UpdateJewelSocketHighlightPosition();
    }

    public CreateScreenshot = (mimeType: 'image/jpeg' | 'image/webp'): string => {
        return this.pixi.renderer.plugins.extract.base64(this.viewport, mimeType, 1);
    }
}