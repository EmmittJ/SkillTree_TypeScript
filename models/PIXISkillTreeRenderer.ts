import { SkillTreeData } from './SkillTreeData';
import Viewport = require("pixi-viewport");
import PIXI = require("pixi.js");
import { utils } from "../app/utils";
import { SkillTreeEvents } from "./SkillTreeEvents";
import { SkillNodeStates, SkillNode, ConnectionStyle } from "./SkillNode";
import { PIXISkillNodeRenderer } from "./PIXISkillNodeRenderer";
import { SpatialHash } from 'pixi-cull';
import { BaseSkillTreeRenderer, RenderLayers } from "./BaseSkillTreeRenderer";
import { IConnnection } from "./types/IConnection";

export class PIXISkillTreeRenderer extends BaseSkillTreeRenderer {
    SkillNodeRenderer: PIXISkillNodeRenderer;

    private _dirty = true;
    private updateHover = false;
    private pixi: PIXI.Application;
    private viewport: Viewport.Viewport;
    private cull: SpatialHash;
    private DO_NOT_CULL = [RenderLayers.Tooltip, RenderLayers.TooltipCompare];
    LayerContainers: { [layer in RenderLayers]: PIXI.Container } = {
        [RenderLayers.BackgroundColor]: new PIXI.Container(),
        [RenderLayers.Background]: new PIXI.Container(),
        [RenderLayers.BackgroundActive]: new PIXI.Container(),
        [RenderLayers.Connections]: new PIXI.Container(),
        [RenderLayers.SkillIconsActiveEffects]: new PIXI.Container(),
        [RenderLayers.ConnectionsActive]: new PIXI.Container(),
        [RenderLayers.ConnectionsPathing]: new PIXI.Container(),
        [RenderLayers.SkillIcons]: new PIXI.Container(),
        [RenderLayers.SkillIconsPathing]: new PIXI.Container(),
        [RenderLayers.SkillIconsActive]: new PIXI.Container(),
        [RenderLayers.CharacterStarts]: new PIXI.Container(),
        [RenderLayers.CharacterStartsActive]: new PIXI.Container(),
        [RenderLayers.JewelSocketActive]: new PIXI.Container(),
        [RenderLayers.JewelSocketHighlights]: new PIXI.Container(),
        [RenderLayers.SkillIconsCompare]: new PIXI.Container(),
        [RenderLayers.Highlights]: new PIXI.Container(),
        [RenderLayers.NodeMoveCompare]: new PIXI.Container(),
        [RenderLayers.AtlasMasteryHighlight]: new PIXI.Container(),
        [RenderLayers.Tooltip]: new PIXI.Container(),
        [RenderLayers.TooltipCompare]: new PIXI.Container(),
    };

    constructor(container: HTMLElement, skillTreeData: SkillTreeData, skillTreeDataCompare: SkillTreeData | undefined) {
        super(container, skillTreeData, skillTreeDataCompare);

        this.pixi = new PIXI.Application({ resizeTo: window, resolution: devicePixelRatio, sharedTicker: true });
        PIXI.Ticker.shared.stop();
        PIXI.Ticker.system.stop();
        container.appendChild(this.pixi.view);

        PIXI.settings.SORTABLE_CHILDREN = false;
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
        PIXI.settings.ROUND_PIXELS = false;
        PIXI.settings.RESOLUTION = devicePixelRatio;
        PIXI.utils.destroyTextureCache();
        PIXI.Loader.shared.reset();

        this.skillTreeData = skillTreeData;
        this.skillTreeDataCompare = skillTreeDataCompare;

        this.SkillNodeRenderer = new PIXISkillNodeRenderer(this.skillTreeData.skillSprites, this.skillTreeDataCompare !== undefined ? this.skillTreeDataCompare.skillSprites : undefined, this.skillTreeData.imageZoomLevels.length - 1);
        SkillTreeEvents.on("skilltree", "hovered-nodes-end", (node: SkillNode) => this.SkillNodeRenderer.DestroyTooltip(node, "Base"));
        SkillTreeEvents.on("skilltree", "hovered-nodes-end", (node: SkillNode) => this.SkillNodeRenderer.DestroyTooltip(node, "Compare"));

        const zoomPercent = this.skillTreeData.imageZoomLevels.length > 2 ? this.skillTreeData.imageZoomLevels[1] - this.skillTreeData.imageZoomLevels[0] : .1;
        this.viewport = new Viewport.Viewport({
            screenWidth: this.pixi.screen.width,
            screenHeight: this.pixi.screen.height,
            worldWidth: this.skillTreeData.width * (this.skillTreeData.scale * 1.25),
            worldHeight: this.skillTreeData.height * (this.skillTreeData.scale * 1.25),
            interaction: this.pixi.renderer.plugins.interaction,
            noTicker: true,
            stopPropagation: true
        });
        this.viewport.drag().wheel({ percent: zoomPercent }).pinch({ percent: zoomPercent * 10 });
        this.viewport.clampZoom({ minWidth: this.skillTreeData.width * (zoomPercent / 8), minHeight: this.skillTreeData.height * (zoomPercent / 8) });
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

        window.onresize = () => {
            this.pixi.renderer.resize(window.innerWidth, window.innerHeight);
            this.viewport.resize(this.pixi.renderer.width, this.pixi.renderer.height, this.skillTreeData.width * (this.skillTreeData.scale * 1.25), this.skillTreeData.height * (this.skillTreeData.scale * 1.25));
            this.viewport.clampZoom({ minWidth: this.skillTreeData.width * (zoomPercent / 8), minHeight: this.skillTreeData.height * (zoomPercent / 8) });
        };

        this.cull = new SpatialHash({ size: 512 });

        super.Tick();
    }

    IsDirty(): boolean {
        return this._dirty || this.viewport.dirty;
    }

    PreUpdate(delta: number): void {
        this.viewport.update(delta);
    }

    Update(_: number): void {
        this.cull.cull(this.viewport.getVisibleBounds());
        this.pixi.render();
        this._dirty = this.viewport.dirty = false;
    }

    PostUpdate(_: number): void { }

    protected SetupLayers() {
        this.viewport.removeChildren();

        for (const key in this.LayerContainers) {
            const layer = Number(key) as RenderLayers;
            const object = this.LayerContainers[layer];

            if (this.DO_NOT_CULL.indexOf(layer) === -1) {
                this.cull.addContainer(object);
            }

            this.viewport.addChild(object);
        }
    }

    protected SetLayer(layer: RenderLayers, object: PIXI.Container) {
        this._dirty = true;
        this.LayerContainers[layer] = object;

        const current = this.viewport.getChildAt(layer) as PIXI.Container;
        if (this.DO_NOT_CULL.indexOf(layer) === -1) {
            this.cull.removeContainer(current);
        }

        if (this.DO_NOT_CULL.indexOf(layer) === -1) {
            this.cull.addContainer(object);
        }

        if (object === current) {
            return;
        }

        this.viewport.addChild(object);
        this.viewport.swapChildren(current, object);
        this.viewport.removeChild(current);
    }

    protected GetLayer(layer: RenderLayers): PIXI.Container {
        return this.viewport.getChildAt(layer) as PIXI.Container;
    }

    protected ClearLayer(layer: RenderLayers) {
        this.SetLayer(layer, new PIXI.Container());
    }

    async Initialize(): Promise<boolean> {
        if (this.Initialized) {
            return true;
        }

        await this.LoadAssets([this.skillTreeData, this.skillTreeDataCompare]);
        this.Initialized = true;

        return this.SkillNodeRenderer.Initialize();
    }

    private HandleZoomClick = (click: PIXI.InteractionEvent, zoom: number) => {
        if (!click.data.originalEvent.ctrlKey) {
            return;
        }

        this.viewport.zoomPercent(zoom, false);
    }

    private HandleShiftClick = (click: PIXI.InteractionEvent) => {
        if (!click.data.originalEvent.shiftKey) {
            return;
        }

        const interactiveObject = this.pixi.renderer.plugins.interaction.hitTest(click.data.global, this.viewport.getChildAt(RenderLayers.SkillIcons));
        if (interactiveObject === null || interactiveObject.name === undefined || interactiveObject.name === null || interactiveObject.name === "") {
            return;
        }

        const node = this.skillTreeData.nodes[+interactiveObject.name];
        if (node.isKeystone) {
            return;
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

    protected DrawAsset = (layer: RenderLayers, asset: string, x: number, y: number, half: boolean): { width: number, height: number } => {
        const container = this.GetLayer(layer);

        const sprite = PIXI.Sprite.from(asset);
        sprite.position.set(x, y);
        sprite.anchor.set(.5);
        container.addChild(sprite);

        if (half) {
            sprite.anchor.set(.5, 1);
            const sprite2 = PIXI.Sprite.from(asset);
            sprite2.rotation = Math.PI;
            sprite2.position.set(x, y);
            sprite2.anchor.set(.5, 1);
            container.addChild(sprite2);
        }

        this.SetLayer(layer, container);
        return { width: sprite.width, height: sprite.height * (half ? 2 : 1) };
    }

    protected DrawText = (layer: RenderLayers, _text: string, colour: string, x: number, y: number): void => {
        const container = this.GetLayer(layer);

        const text = new PIXI.Text(_text, { fill: colour, fontSize: 48, fontFamily: "serif", fontStyle: "italic", stroke: 0x000000, strokeThickness: 4 });
        text.position.set(x, y);
        text.scale.set(this.skillTreeData.scale);
        container.addChild(text);

        this.SetLayer(layer, container);
    }

    protected DrawBackground = (layer: RenderLayers, asset: "AtlasPassiveBackground" | "Background2" | "Background1"): void => {
        const container = this.GetLayer(layer);

        let backgroundSprite: PIXI.Sprite = PIXI.Sprite.from(asset);
        if (asset === "AtlasPassiveBackground") {
            backgroundSprite.scale.set(2.8173)
            backgroundSprite.anchor.set(.504, .918);
        } else {
            const texture = backgroundSprite.texture;
            texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
            backgroundSprite = PIXI.TilingSprite.from(texture.baseTexture, { width: this.skillTreeData.width * (this.skillTreeData.scale * 1.25), height: this.skillTreeData.height * (this.skillTreeData.scale * 1.25) });
            backgroundSprite.anchor.set(.5);
        }

        container.addChild(backgroundSprite);
        this.SetLayer(layer, container);
    }

    protected DrawConnections = (layer: RenderLayers, connections: IConnnection[]): void => {
        const container = this.GetLayer(layer);

        const connectionContainer = new PIXI.Container();
        for (const connection of connections) {
            switch (connection.style) {
                case ConnectionStyle.Arc:
                    connectionContainer.addChild(this.SkillNodeRenderer.CreateArcConnection(connection.asset, connection.node, connection.other, connection.removing));
                    break;
                case ConnectionStyle.Line:
                    connectionContainer.addChild(this.SkillNodeRenderer.CreateLineConnection(connection.asset, connection.node, connection.other, connection.removing));
                    break;
            }
        }

        container.addChild(connectionContainer);
        this.SetLayer(layer, container);
    }

    protected RenderBaseRest = (): void => {
        this.RenderBaseNodes();
    }

    private RenderBaseNodes = () => {
        const skillIcons: PIXI.Container = this.GetLayer(RenderLayers.SkillIcons);
        const skillIcons_compare: PIXI.Container = this.GetLayer(RenderLayers.SkillIconsCompare);

        for (const id in this.skillTreeData.nodes) {
            const node = this.skillTreeData.nodes[id];
            if (node.nodeGroup === undefined || node.classStartIndex !== undefined) {
                continue;
            }

            const icon = this.SkillNodeRenderer.CreateIcon(node);
            if (icon !== null) {
                skillIcons.addChild(icon);
            }

            const frame = this.SkillNodeRenderer.CreateFrame(node, node.out.map(x => this.skillTreeData.nodes[x]).filter(x => x.classStartIndex === undefined));
            if (frame !== null) {
                skillIcons.addChild(frame);
            }

            if (this.skillTreeDataCompare !== undefined && this.skillTreeDataCompare.nodes[node.GetId()] === undefined) {
                const highlighter = this.SkillNodeRenderer.CreateHighlight(node, 0x00FF00);
                if (highlighter !== null) {
                    skillIcons.addChild(highlighter);
                }
            }
            
            if (this.skillTreeDataCompare !== undefined && this.skillTreeDataCompare.nodes[node.GetId()] !== undefined) {
                const nodeSize = this.SkillNodeRenderer.GetNodeSize(node);
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
                        skillIcons.addChild(highlighter);
                    }
                }
            }
        }

        if (this.skillTreeDataCompare !== undefined) {
            for (const id in this.skillTreeDataCompare.nodes) {
                const node = this.skillTreeDataCompare.nodes[id];
                if (this.skillTreeData.nodes[node.GetId()] === undefined) {
                    this.skillTreeDataCompare.addState(node, SkillNodeStates.Compared);
                    const icon = this.SkillNodeRenderer.CreateIcon(node, "Compare")
                    if (icon !== null) {
                        skillIcons_compare.addChild(icon);
                    }
                    const frame = this.SkillNodeRenderer.CreateFrame(node, node.out.map(x => (this.skillTreeDataCompare as SkillTreeData).nodes[x]));
                    if (frame !== null) {
                        skillIcons_compare.addChild(frame);
                    }
                    const highlighter = this.SkillNodeRenderer.CreateHighlight(node, 0xFF0000, "Compare")
                    if (highlighter !== null) {
                        skillIcons_compare.addChild(highlighter);
                    }
                }
            }
        }
    }

    protected RenderActiveRest = (): void => {
        this.RenderHover();

        const skillIconActiveEffects: PIXI.Container = this.GetLayer(RenderLayers.SkillIconsActiveEffects);
        const skillIconsActive: PIXI.Container = this.GetLayer(RenderLayers.SkillIconsActive);

        const activeNodes = this.skillTreeData.getNodes(SkillNodeStates.Active);
        for (const id in activeNodes) {
            const node = activeNodes[id];
            const nodes = node.out.map(x => this.skillTreeData.nodes[x]);

            const effect = this.SkillNodeRenderer.CreateIconEffect(node);
            if (effect !== null) {
                skillIconActiveEffects.addChild(effect);
            }

            for (const out of nodes) {
                const frame = this.SkillNodeRenderer.CreateFrame(out, out.in.map(x => this.skillTreeData.nodes[x]));
                if (frame !== null) {
                    skillIconsActive.addChild(frame);
                }
            }

            const icon = this.SkillNodeRenderer.CreateIcon(node);
            if (icon !== null) {
                skillIconsActive.addChild(icon);
            }
            const frame = this.SkillNodeRenderer.CreateFrame(node, node.out.map(x => this.skillTreeData.nodes[x]));
            if (frame !== null) {
                skillIconsActive.addChild(frame);
            }
        }

        skillIconActiveEffects.interactive = false;
        skillIconActiveEffects.interactiveChildren = false;
        skillIconActiveEffects.containerUpdateTransform = () => { };
        this.SetLayer(RenderLayers.SkillIconsActiveEffects, skillIconActiveEffects);

        skillIconsActive.interactive = false;
        skillIconsActive.interactiveChildren = false;
        skillIconsActive.containerUpdateTransform = () => { };
        this.SetLayer(RenderLayers.SkillIconsActive, skillIconsActive);
    }

    public RenderCharacterStartsActive = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayers.BackgroundActive);
        this.ClearLayer(RenderLayers.CharacterStartsActive);

        const backgroundActive: PIXI.Container = new PIXI.Container();
        const characterStartsActive: PIXI.Container = new PIXI.Container();

        for (const id of this.skillTreeData.root.out) {
            const node = this.skillTreeData.nodes[id];
            const classId = node.classStartIndex;
            if (classId === undefined || !node.is(SkillNodeStates.Active) || node.nodeGroup === undefined) {
                continue;
            }

            const className = utils.getKeyByValue(this.skillTreeData.constants.classes, classId);
            if (className === undefined && Object.keys(this.skillTreeData.constants.classes).length === 0) {
                const nodeGraphic = PIXI.Sprite.from("AtlasStart");
                nodeGraphic.anchor.set(.5)
                nodeGraphic.position.set(node.x, node.y);
                characterStartsActive.addChild(nodeGraphic);
            } else if (className === undefined) {
                throw new Error(`Couldn't find class name from constants: ${classId}`);
            } else {
                const commonName = this.skillTreeData.constants.classesToName[className];
                if (this.skillTreeData.extraImages !== undefined) {
                    const extraImage = this.skillTreeData.extraImages[commonName]
                    if (extraImage) {
                        const classNodeGraphic = PIXI.Sprite.from(`Background${className.replace("Class", "")}`);
                        classNodeGraphic.anchor.set(0)
                        classNodeGraphic.position.set(extraImage.x * this.skillTreeData.scale, extraImage.y * this.skillTreeData.scale);
                        backgroundActive.addChild(classNodeGraphic);
                    }
                }

                const nodeGraphic = PIXI.Sprite.from(`center${commonName.toLocaleLowerCase()}`);
                nodeGraphic.anchor.set(.5)
                nodeGraphic.position.set(node.x, node.y);
                characterStartsActive.addChild(nodeGraphic);
            }
        }

        backgroundActive.interactive = false;
        backgroundActive.interactiveChildren = false;
        backgroundActive.containerUpdateTransform = () => { };
        this.SetLayer(RenderLayers.BackgroundActive, backgroundActive);

        characterStartsActive.interactive = false;
        characterStartsActive.interactiveChildren = false;
        characterStartsActive.containerUpdateTransform = () => { };
        this.SetLayer(RenderLayers.CharacterStartsActive, characterStartsActive);
    }

    public StopRenderHover = (): void => {
        this.updateHover = false;
        if (!this.Initialized) {
            return;
        }

        this.RenderHover();
        this.RenderTooltip();
    }

    public StartRenderHover = (hovered: SkillNode): void => {
        this.updateHover = true;
        if (!this.Initialized) {
            return;
        }

        this.RenderTooltip(hovered);
        this.RenderHover();
    }

    private RenderHover = async (): Promise<void> => {
        this.ClearLayer(RenderLayers.ConnectionsPathing);
        this.ClearLayer(RenderLayers.SkillIconsPathing);
        this.ClearLayer(RenderLayers.NodeMoveCompare);
        this.ClearLayer(RenderLayers.AtlasMasteryHighlight);

        if (!this.updateHover) {
            return;
        }

        let nodeMoveCompare: PIXI.Graphics | undefined = undefined;
        let atlasMasteryHighlight: PIXI.Container | undefined = undefined;
        const pathingConnections: PIXI.Container = new PIXI.Container();
        const pathingSkillIcons: PIXI.Container = new PIXI.Container();

        const drawnConnections: { [id: string]: boolean } = {};
        const pathingNodes = this.skillTreeData.getHoveredNodes();
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

            const connection = this.SkillNodeRenderer.CreateConnections(node, nodes);
            if (connection !== null) {
                pathingConnections.addChild(connection);
            }

            if (node.is(SkillNodeStates.Hovered)) {
                const icon = this.SkillNodeRenderer.CreateIcon(node);
                if (icon !== null) {
                    if (this.skillTreeData.tree === "Atlas" && node.isMastery) {
                        if (atlasMasteryHighlight === undefined) {
                            atlasMasteryHighlight = new PIXI.Container();
                        }
                        icon.scale.set(2.5);
                        atlasMasteryHighlight.addChild(icon);
                    } else {
                        pathingSkillIcons.addChild(icon);
                    }
                }
            }

            const frame = this.SkillNodeRenderer.CreateFrame(node, node.out.map(x => this.skillTreeData.nodes[x]));
            if (frame !== null) {
                pathingSkillIcons.addChild(frame);
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

                if (other) {
                    if (other.is(SkillNodeStates.Compared)) {
                        this.skillTreeDataCompare.addState(other, SkillNodeStates.Hovered);
                    }

                    if (other.nodeGroup !== undefined && other.is(SkillNodeStates.Moved)) {
                        const highlighter = this.SkillNodeRenderer.CreateHighlight(other, 0xFF1493)
                        if (highlighter !== null) {
                            nodeMoveCompare = highlighter;
                        }
                    }
                }
            }
        }

        pathingConnections.interactive = false;
        pathingConnections.interactiveChildren = false;
        pathingConnections.containerUpdateTransform = () => { };
        this.SetLayer(RenderLayers.ConnectionsPathing, pathingConnections);

        pathingSkillIcons.interactive = false;
        pathingSkillIcons.interactiveChildren = false;
        pathingSkillIcons.containerUpdateTransform = () => { };
        this.SetLayer(RenderLayers.SkillIconsPathing, pathingSkillIcons);

        if (nodeMoveCompare !== undefined) {
            nodeMoveCompare.interactive = false;
            nodeMoveCompare.interactiveChildren = false;
            nodeMoveCompare.containerUpdateTransform = () => { };
            this.SetLayer(RenderLayers.NodeMoveCompare, nodeMoveCompare);
        }

        if (atlasMasteryHighlight !== undefined) {
            atlasMasteryHighlight.interactive = false;
            atlasMasteryHighlight.interactiveChildren = false;
            atlasMasteryHighlight.containerUpdateTransform = () => { };
            this.SetLayer(RenderLayers.AtlasMasteryHighlight, atlasMasteryHighlight);
        }
    }

    private RenderTooltip = async (hovered: SkillNode | undefined = undefined): Promise<void> => {
        this.ClearLayer(RenderLayers.Tooltip);
        this.ClearLayer(RenderLayers.TooltipCompare);

        let tooltip: PIXI.Graphics | undefined = undefined;
        let tooltipCompare: PIXI.Graphics | undefined = undefined;

        if (!this.updateHover || hovered === undefined) {
            return
        }

        const padding = 10;
        const text = this.SkillNodeRenderer.CreateTooltip(hovered, "Base");
        text.position.set(padding / 2, padding / 2);

        tooltip = new PIXI.Graphics();
        tooltip.beginFill(0x000000, .75);
        tooltip.lineStyle(2, 0xCBB59C)
        tooltip.drawRect(0, 0, text.width + padding, text.height + padding);
        tooltip.endFill();

        tooltip.addChild(text);

        let hoveredCompareNode: SkillNode | undefined = undefined;
        if (this.skillTreeDataCompare !== undefined) {
            const nodes = this.skillTreeDataCompare.getNodes(SkillNodeStates.Hovered);
            for (const id in nodes) {
                const node = nodes[id];
                if (node.nodeGroup === undefined) {
                    continue;
                }
                hoveredCompareNode = node;

                const padding = 10;
                const text = this.SkillNodeRenderer.CreateTooltip(node, "Compare");
                text.position.set(padding / 2, padding / 2);

                tooltipCompare = new PIXI.Graphics();
                tooltipCompare.beginFill(0x000000, .75);
                tooltipCompare.lineStyle(2, 0xFFB000)
                tooltipCompare.drawRect(0, 0, text.width + padding, text.height + padding);
                tooltipCompare.endFill();

                tooltipCompare.addChild(text);
            }
        }

        if (tooltip === undefined && tooltipCompare !== undefined) {
            tooltip = tooltipCompare;
            hovered = hoveredCompareNode;

            tooltipCompare = undefined;
            hoveredCompareNode = undefined;
        }

        if (tooltip !== undefined) {
            tooltip.interactive = false;
            tooltip.interactiveChildren = false;
            tooltip.containerUpdateTransform = () => { };
            this.SetLayer(RenderLayers.Tooltip, tooltip);
        }

        if (tooltipCompare !== undefined) {
            tooltipCompare.interactive = false;
            tooltipCompare.interactiveChildren = false;
            tooltipCompare.containerUpdateTransform = () => { };
            this.SetLayer(RenderLayers.TooltipCompare, tooltipCompare);
        }

        if (tooltip !== undefined && hovered !== undefined) {
            const bounds = tooltip.getBounds();
            const size = hovered.GetTargetSize();
            const scaleX = tooltip.width / bounds.width / devicePixelRatio;
            const scaleY = tooltip.height / bounds.height / devicePixelRatio;

            if (tooltip.worldTransform.tx + bounds.width > screen.width) {
                tooltip.x = hovered.x - tooltip.width * scaleX - size.width;
            } else {
                tooltip.x = hovered.x + size.width;
            }

            if (tooltip.worldTransform.ty + bounds.height > screen.height) {
                tooltip.y = hovered.y - tooltip.height * scaleY + size.height / 2;
            } else {
                tooltip.y = hovered.y - size.height / 2;
            }

            tooltip.scale.set(scaleX, scaleY);

            if (tooltipCompare !== undefined && hoveredCompareNode !== undefined) {
                const boundsCompare = tooltipCompare.getBounds();

                tooltipCompare.y = tooltip.y;
                tooltipCompare.x = tooltip.x + tooltip.width;

                tooltipCompare.scale.set(tooltipCompare.width / boundsCompare.width / devicePixelRatio, tooltipCompare.height / boundsCompare.height / devicePixelRatio);
            }
        }
    }

    public RenderHighlight = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayers.Highlights);

        const highlights = new PIXI.Container();

        const nodes = this.skillTreeData.getNodes(SkillNodeStates.Highlighted);
        for (const id in nodes) {
            const node = nodes[id];
            const highlight = this.SkillNodeRenderer.CreateHighlight(node);
            if (highlight !== null) {
                highlights.addChild(highlight)
            }
        }

        highlights.interactive = false;
        highlights.interactiveChildren = false;
        highlights.containerUpdateTransform = () => { };
        this.SetLayer(RenderLayers.Highlights, highlights);
    }

    public CreateScreenshot = (mimeType: 'image/jpeg' | 'image/webp'): string => {
        return this.pixi.renderer.plugins.extract.base64(this.viewport, mimeType, 1);
    }
}