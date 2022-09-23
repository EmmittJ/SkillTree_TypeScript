import { SkillTreeData } from './SkillTreeData';
import { Viewport } from 'pixi-viewport';
import * as PIXI from 'pixi.js';
import { Assets } from '@pixi/assets';
import { utils } from "../app/utils";
import { SkillTreeEvents } from "./SkillTreeEvents";
import { SkillNodeStates, SkillNode, ConnectionStyle } from "./SkillNode";
import { SpatialHash } from 'pixi-cull';
import { BaseSkillTreeRenderer, RenderLayer, IHighlight, ISpriteSheetAsset, IConnnection } from "./BaseSkillTreeRenderer";

export class PIXISkillTreeRenderer extends BaseSkillTreeRenderer {
    private NodeTooltips: { [id: string]: PIXI.Container | undefined };
    private NodeSpritesheets: { [id: string]: PIXI.Spritesheet[] | undefined };
    private _dirty = true;
    private pixi: PIXI.Application;
    private viewport: Viewport;
    private cull: SpatialHash;
    private DO_NOT_CULL = [RenderLayer.Tooltip, RenderLayer.TooltipCompare];
    LayerContainers: { [layer in RenderLayer]: PIXI.Container } = {
        [RenderLayer.Background]: new PIXI.Container(),
        [RenderLayer.BackgroundActive]: new PIXI.Container(),
        [RenderLayer.GroupBackground]: new PIXI.Container(),
        [RenderLayer.Connections]: new PIXI.Container(),
        [RenderLayer.SkillIconsActiveEffects]: new PIXI.Container(),
        [RenderLayer.ConnectionsActive]: new PIXI.Container(),
        [RenderLayer.ConnectionsPathing]: new PIXI.Container(),
        [RenderLayer.SkillIcons]: new PIXI.Container(),
        [RenderLayer.SkillIconsPathing]: new PIXI.Container(),
        [RenderLayer.SkillIconsActive]: new PIXI.Container(),
        [RenderLayer.CharacterStarts]: new PIXI.Container(),
        [RenderLayer.CharacterStartsActive]: new PIXI.Container(),
        [RenderLayer.JewelSocketActive]: new PIXI.Container(),
        [RenderLayer.JewelSocketHighlights]: new PIXI.Container(),
        [RenderLayer.SkillIconsCompare]: new PIXI.Container(),
        [RenderLayer.Highlights]: new PIXI.Container(),
        [RenderLayer.NodeMoveCompare]: new PIXI.Container(),
        [RenderLayer.AtlasMasteryHighlight]: new PIXI.Container(),
        [RenderLayer.Tooltip]: new PIXI.Container(),
        [RenderLayer.TooltipCompare]: new PIXI.Container(),
    };

    constructor(container: HTMLElement, skillTreeData: SkillTreeData, skillTreeDataCompare: SkillTreeData | undefined) {
        super(container, skillTreeData, skillTreeDataCompare);
        this.NodeTooltips = {};
        this.NodeSpritesheets = {};

        this.pixi = new PIXI.Application({ resizeTo: window, resolution: devicePixelRatio, sharedTicker: true });
        PIXI.Ticker.shared.stop();
        PIXI.Ticker.system.stop();
        container.appendChild(this.pixi.view);

        PIXI.settings.SORTABLE_CHILDREN = false;
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
        PIXI.settings.ROUND_PIXELS = false;
        PIXI.settings.RESOLUTION = devicePixelRatio;
        PIXI.utils.destroyTextureCache();
        Assets.reset();

        const zoomPercent = this.skillTreeData.imageZoomLevels.length > 2 ? this.skillTreeData.imageZoomLevels[1] - this.skillTreeData.imageZoomLevels[0] : .1;
        this.viewport = new Viewport({
            screenWidth: this.pixi.screen.width,
            screenHeight: this.pixi.screen.height,
            worldWidth: this.skillTreeData.width * (this.skillTreeData.scale * 1.25),
            worldHeight: this.skillTreeData.height * (this.skillTreeData.scale * 1.25),
            interaction: this.pixi.renderer.plugins.interaction,
            noTicker: true,
            stopPropagation: true
        });
        this.viewport.name = 'viewport';
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

        const interactiveObject = this.pixi.renderer.plugins.interaction.hitTest(click.data.global, this.viewport.getChildAt(RenderLayer.SkillIcons));
        if (interactiveObject === null || interactiveObject.name === undefined || interactiveObject.name === null || interactiveObject.name === "") {
            return;
        }

        const node = this.skillTreeData.nodes[interactiveObject.name];
        if (node.isKeystone) {
            return;
        }
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
            const layer = Number(key) as RenderLayer;
            const object = this.LayerContainers[layer];

            if (this.DO_NOT_CULL.indexOf(layer) === -1) {
                this.cull.addContainer(object);
            }

            this.viewport.addChild(object);
        }
    }

    protected SetLayer(layer: RenderLayer, object: PIXI.Container) {
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

    protected GetLayer(layer: RenderLayer): PIXI.Container {
        return this.viewport.getChildAt(layer) as PIXI.Container;
    }

    protected ClearLayer(layer: RenderLayer) {
        this.SetLayer(layer, new PIXI.Container());
    }

    async Initialize(): Promise<boolean> {
        if (this.Initialized) {
            return true;
        }

        await this.LoadAssets([this.skillTreeData, this.skillTreeDataCompare]);

        return this.InitializeSpriteSheets();
    }

    private LoadAssets = (data: (SkillTreeData | undefined)[]): Promise<boolean> => {
        const filteredData = data.filter(utils.NotUndefined);
        if (filteredData.length <= 0) {
            throw new Error("SkillTreeData has not been defined. Could not load assets.");
        }

        // #region Load Assets
        const addedAssets = new Array<string>();
        for (const i of filteredData) {
            for (const id in i.sprites) {
                const sprites = i.sprites[id];
                const sheet = sprites[i.scale.toString()] || sprites['1'];
                if (sheet === undefined)
                    continue;

                const filename = sheet.filename;
                if (filename === 'LOAD_COORDS') {
                    for (const coord in sheet.coords) {
                        if (addedAssets.indexOf(coord) < 0) {
                            addedAssets.push(coord);
                            Assets.add(coord, `${utils.SKILL_TREES_URI}/${i.patch}/assets/${coord}.png`);
                        }
                    }
                } else {
                    if (addedAssets.indexOf(filename) < 0) {
                        addedAssets.push(filename);
                        Assets.add(filename, `${utils.SKILL_TREES_URI}/${i.patch}/assets/${filename}`);
                    }
                }
            }
        }
        // #endregion
        const skillTreeData = filteredData[0];
        const loadbarWidth = skillTreeData.width / 2;
        let progressText = "";

        return Assets.load(addedAssets, (progress: number) => {
            const newText = `${progress * 100}%`;
            if (newText !== progressText) {
                this.viewport.removeChildren();
                progressText = newText;

                const loadbar = new PIXI.Graphics();
                loadbar.moveTo(0, 0);
                loadbar.beginFill(0xFFFFFF, .75);
                loadbar.lineStyle(2, 0xCBB59C)
                loadbar.drawRect(0, 0, progress * loadbarWidth, 50);
                loadbar.endFill();
                //loadbar.position.set(screen.width - (loadbarWidth / 2), screen.height / 2);
                this.viewport.addChild(loadbar);

                const text = new PIXI.Text(progressText, { fontSize: 250, fill: 0xFFFFFF });
                text.position.set(0, -50);
                this.viewport.addChild(text);
                this.Tick();
            }
        }).then(_ => true);
    }

    async InitializeSpriteSheets(): Promise<boolean> {
        if (this.Initialized) {
            return true;
        }

        const promise = new Promise<boolean>(resolve => {
            this.LoadSpriteSheetAssets([this.skillTreeData, this.skillTreeDataCompare]).then(() => resolve(true));
        })
        promise.then(() => this.Initialized = true);
        return promise;
    }

    private LoadSpriteSheetAssets = (data: (SkillTreeData | undefined)[]): Promise<boolean[]> => {
        for (const tree of data) {
            if (tree === undefined) continue;

            const dict = tree.sprites
            for (const id in dict) {
                const key = this.GetSpritesheetKey(tree.patch, id);
                if (this.NodeSpritesheets[key] === undefined) {
                    this.NodeSpritesheets[key] = []
                }

                const sheet = dict[id][tree.scale.toString()] || dict[id]['1'];
                if (sheet === undefined)
                    continue;

                const filename = sheet.filename;
                if (filename === 'LOAD_COORDS') {
                    for (const coord in sheet.coords) {
                        const texture = PIXI.Texture.from(coord);
                        const spritesheetData = this.GetCoordSpritesheetData(sheet, key, coord, texture);
                        this.NodeSpritesheets[key]?.push(new PIXI.Spritesheet(texture.baseTexture, spritesheetData));
                    }
                } else {
                    const texture = PIXI.Texture.from(filename);
                    const spritesheetData = this.GetSpritesheetData(sheet, key);
                    this.NodeSpritesheets[key]?.push(new PIXI.Spritesheet(texture.baseTexture, spritesheetData));
                }
            }
        }

        const promises = new Array<Promise<boolean>>();
        for (const key in this.NodeSpritesheets) {
            const sheets = this.NodeSpritesheets[key];
            if (sheets !== undefined) {
                for (const i in sheets) {
                    const promise = new Promise<boolean>(resolve => this.NodeSpritesheets[key]![i].parse().then(_ => resolve(true)));
                    promises.push(promise);
                }

            }
        }
        return Promise.all(promises);
    }

    private GetSpritesheetData = (spriteSheet: ISpriteSheet, key: string): PIXI.ISpritesheetData => {
        let data: PIXI.ISpritesheetData = {
            frames: {},
            animations: undefined,
            meta: {
                scale: "1"
            }
        };

        for (const id in spriteSheet.coords) {
            const coord = spriteSheet.coords[id];
            const frame = this.GetSpritesheetFrameKey(key, id);
            data.frames[frame] = {
                frame: coord,
                rotated: false,
                trimmed: false,
                spriteSourceSize: {
                    x: 0,
                    y: 0
                },
                sourceSize: {
                    w: coord.w,
                    h: coord.h
                }
            };
        }

        return data;
    }

    private GetCoordSpritesheetData = (spriteSheet: ISpriteSheet, key: string, id: string, texture: PIXI.Texture): PIXI.ISpritesheetData => {
        let data: PIXI.ISpritesheetData = {
            frames: {},
            animations: undefined,
            meta: {
                scale: "1"
            }
        };

        const coord = spriteSheet.coords[id];
        const frame = this.GetSpritesheetFrameKey(key, id);
        if (coord.w === -1 && coord.h === -1) {
            coord.w = texture.width;
            coord.h = texture.height;
        }

        data.frames[frame] = {
            frame: coord,
            rotated: false,
            trimmed: false,
            spriteSourceSize: {
                x: 0,
                y: 0
            },
            sourceSize: {
                w: coord.w,
                h: coord.h
            }
        };

        return data;
    }

    private GetSpritesheetKey = (patch: string, id: string): string => {
        return `${patch}/${id}`;
    }

    private GetSpritesheetFrameKey = (key: string, id: string): string => {
        return `${key}/${id.startsWith('PassiveSkillScreen') ? id.replace('PassiveSkillScreen', '') : id}`

    }
    protected DrawSpriteSheetAsset = (layer: RenderLayer, asset: ISpriteSheetAsset): { width: number, height: number } => {
        return this.DrawSpriteSheetAssets(layer, [asset])[0];
    }

    protected DrawSpriteSheetAssets = (layer: RenderLayer, assets: ISpriteSheetAsset[]): { width: number, height: number }[] => {
        const sizes: { width: number, height: number }[] = [];
        const container = this.GetLayer(layer);

        for (var asset of assets) {
            const texture = this.GetSpritesheetTexture(asset.patch, asset.key, asset.icon);
            if (texture === null || !texture.valid) {
                continue;
            }

            const sprite = PIXI.Sprite.from(texture);
            sprite.name = `${asset.patch}/${asset.key}/${asset.icon}`;
            sprite.position.set(asset.x, asset.y);
            const offset = asset.offsetX === undefined ? .5 : asset.offsetX;
            sprite.anchor.set(offset, asset.offsetY);
            if (asset.scale !== undefined) sprite.scale.set(asset.scale);
            container.addChild(sprite);

            if (asset.half) {
                sprite.anchor.set(offset, 1);
                const sprite2 = PIXI.Sprite.from(texture);
                sprite2.name = `${sprite.name}-half`;
                sprite2.rotation = Math.PI;
                sprite2.position.set(asset.x, asset.y);
                sprite2.anchor.set(offset, 1);
                sprite2.scale = sprite.scale;
                container.addChild(sprite2);
            }

            if (asset.mask == 'circle') {
                const mask = new PIXI.Graphics();
                mask.beginFill(0x00FF00);
                mask.drawCircle(sprite.x, sprite.y, sprite.height / 2);
                mask.endFill();

                sprite.mask = mask;
                container.addChild(mask);
            }

            if (asset.node && (asset.key === "frame" || asset.key === "ascendancy" || asset.node.isMastery)) {
                this.RebindNodeEvents(asset.node, sprite);
            } else {
                sprite.interactive = false;
                sprite.interactiveChildren = false;
            }

            sizes.push({ width: sprite.width, height: sprite.height * (asset.half ? 2 : 1) });
        }

        this.SetLayer(layer, container);
        return sizes;
    }

    protected DrawText = (layer: RenderLayer, _text: string, colour: string, x: number, y: number): void => {
        const container = this.GetLayer(layer);

        const text = new PIXI.Text(_text, { fill: colour, fontSize: 48, fontFamily: "serif", fontStyle: "italic", stroke: 0x000000, strokeThickness: 4 });
        text.name = _text;
        text.position.set(x, y);
        text.scale.set(this.skillTreeData.scale);
        container.addChild(text);

        this.SetLayer(layer, container);
    }

    protected DrawBackgroundAsset = (layer: RenderLayer, asset: ISpriteSheetAsset): void => {
        const container = this.GetLayer(layer);

        const texture = this.GetSpritesheetTexture(asset.patch, asset.key, asset.icon);
        if (texture === null || !texture.valid) {
            return;
        }

        let backgroundSprite: PIXI.Sprite = PIXI.Sprite.from(texture);
        backgroundSprite.name = asset.icon;
        if (asset.icon === "AtlasPassiveBackground") {
            backgroundSprite.scale.set(2.8173)
            backgroundSprite.anchor.set(.504, .918);
        } else {
            texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
            backgroundSprite = PIXI.TilingSprite.from(texture.baseTexture, { width: this.skillTreeData.width * (this.skillTreeData.scale * 1.25), height: this.skillTreeData.height * (this.skillTreeData.scale * 1.25) });
            backgroundSprite.anchor.set(.5);
        }

        container.addChild(backgroundSprite);
        this.SetLayer(layer, container);
    }

    protected DrawConnections = (layer: RenderLayer, connections: IConnnection[]): void => {
        const container = this.GetLayer(layer);

        const connectionContainer = new PIXI.Container();
        for (const connection of connections) {
            const drawn = this.DrawConnection(connection)
            if (drawn) {
                connectionContainer.addChild(drawn);
            }
        }

        container.addChild(connectionContainer);
        this.SetLayer(layer, container);
    }

    private DrawConnection = (connection: IConnnection): PIXI.Container | null => {
        switch (connection.style) {
            case ConnectionStyle.Arc:
                return this.DrawArcConnection(connection);
            case ConnectionStyle.Line:
                return this.DrawLineConnection(connection);
        }
    }

    private DrawArcConnection = (connection: IConnnection): PIXI.Container | null => {
        const texture = this.GetSpritesheetTexture(connection.patch, connection.key, connection.icon);
        if (texture === null || !texture.valid) {
            return null;
        }

        const node = connection.node;
        const other = connection.other;

        if (node.nodeGroup === undefined)
            return null;

        let startAngle = node.arc < other.arc ? node.arc : other.arc;
        let endAngle = node.arc < other.arc ? other.arc : node.arc;

        const diff = endAngle - startAngle;
        if (diff >= Math.PI) {
            const c = 2 * Math.PI - diff;
            startAngle = endAngle;
            endAngle = startAngle + c;
        }
        startAngle -= Math.PI / 2;
        endAngle -= Math.PI / 2;

        let angle = endAngle - startAngle;
        const arcsNeeded = Math.ceil(angle / (Math.PI / 2));
        const initialRotation = Math.PI / 2 + startAngle;

        const arcContainer = new PIXI.Container();
        const mask = new PIXI.Graphics();
        mask.lineStyle(50 * node.scale, 0xFFC0CB);
        mask.arc(node.nodeGroup.x * node.scale, node.nodeGroup.y * node.scale, node.orbitRadii[node.orbit] * node.scale, startAngle, endAngle, false);
        arcContainer.addChild(mask);

        for (let i = 0; i < arcsNeeded; ++i) {
            const sprite = PIXI.Sprite.from(texture);
            sprite.rotation = angle + initialRotation;
            sprite.position.set(node.nodeGroup.x * node.scale, node.nodeGroup.y * node.scale);
            sprite.anchor.set(1);

            if (connection.removing) {
                sprite.tint = 0xFF0000;
            }

            sprite.mask = mask;
            arcContainer.addChild(sprite);

            if (angle < Math.PI / 2) {
                continue
            }
            angle -= Math.PI / 2
        }

        return arcContainer;
    }

    private DrawLineConnection = (connection: IConnnection): PIXI.Container | null => {
        const node = connection.node.skill > connection.other.skill ? connection.node : connection.other;
        const other = connection.node.skill > connection.other.skill ? connection.other : connection.node;

        const texture = this.GetSpritesheetTexture(connection.patch, connection.key, connection.icon);
        if (texture === null || !texture.valid) {
            return null;
        }

        const container = new PIXI.Container();
        const rotation = Math.atan2(other.y - node.y, other.x - node.x);
        let length = Math.hypot(node.x - other.x, node.y - other.y);
        var current = { x: node.x, y: node.y };
        var linesNeeded = Math.ceil(length / texture.frame.width);
        for (let i = 0; i < linesNeeded; ++i) {
            const lineTexure = length >= texture.frame.width
                ? texture
                : new PIXI.Texture(texture.baseTexture, new PIXI.Rectangle(texture.frame.x, texture.frame.y, length, texture.frame.height));

            const line = PIXI.Sprite.from(lineTexure);
            line.anchor.set(0, 0.5);
            line.position.set(current.x, current.y);
            line.rotation = rotation;

            if (connection.removing) {
                line.tint = 0xFF0000;
            }

            container.addChild(line);
            current = {
                x: current.x + (line.width * Math.cos(rotation)),
                y: current.y + (line.width * Math.sin(rotation))
            };
            length -= texture.frame.width;
        }

        return container;
    }

    protected DrawHighlights = (layer: RenderLayer, highlights: IHighlight[]): void => {
        const container = this.GetLayer(layer);

        for (var highlight of highlights) {
            const size = highlight.node.GetTargetSize();
            if (size.width === 0 || size.height === 0) {
                continue;
            }

            const graphic = new PIXI.Graphics();
            graphic.name = `highlight-${highlight.node.id}`
            graphic.beginFill(0x000000, 0);
            graphic.lineStyle(5, highlight.color);
            graphic.drawCircle(0, 0, Math.max(size.width, size.height) * .85);
            graphic.endFill();
            graphic.position.set(highlight.node.x, highlight.node.y);
            container.addChild(graphic);
        }

        this.SetLayer(layer, container);
    }

    public CreateScreenshot = (mimeType: 'image/jpeg' | 'image/webp'): string => {
        return this.pixi.renderer.plugins.extract.base64(this.viewport, mimeType, 1);
    }

    private GetSpritesheetTexture = (patch: string, spriteSheetKey: string, icon: string): PIXI.Texture | null => {
        const key = this.GetSpritesheetKey(patch, spriteSheetKey);
        const frame = this.GetSpritesheetFrameKey(key, icon);
        const pixiSpritesheets = this.NodeSpritesheets[key];
        if (pixiSpritesheets !== undefined) {
            for (const pixiSpritesheet of pixiSpritesheets) {
                const texture = pixiSpritesheet.textures[frame];
                if (texture !== undefined) {
                    return texture
                }
            }
        }

        console.warn(`Texture not found for ${frame}`);
        return null;
    }

    private RebindNodeEvents = (node: SkillNode, sprite: PIXI.Sprite) => {
        sprite.removeAllListeners();
        sprite.hitArea = new PIXI.Circle(0, 0, Math.max(sprite.texture.width, sprite.texture.height) / 2);
        sprite.name = `${sprite.name}-${node.GetId()}`;

        if (SkillTreeEvents.events["node"] !== undefined) {
            sprite.interactive = true;

            for (const event in SkillTreeEvents.events["node"]) {
                sprite.on(event, (interaction: PIXI.InteractionEvent) => {
                    if ((event === "click" || event === "tap") && (interaction.data.originalEvent.shiftKey || interaction.data.originalEvent.ctrlKey || interaction.data.originalEvent.altKey)) {
                        return;
                    }

                    SkillTreeEvents.fire("node", event, node);
                });
            }
        }
    }

    protected RenderTooltip = (hovered: SkillNode): void => {
        const container = this.GetLayer(RenderLayer.Tooltip);
        const containerCompare = this.GetLayer(RenderLayer.TooltipCompare);

        let tooltip: PIXI.Graphics | undefined = undefined;
        let tooltipCompare: PIXI.Graphics | undefined = undefined;

        const padding = 10;
        const text = this.CreateTooltip(hovered);
        text.position.set(padding / 2, padding / 2);

        if (this.skillTreeData.patch === hovered.patch) {
            tooltip = new PIXI.Graphics();
            tooltip.beginFill(0x000000, .75);
            tooltip.lineStyle(2, 0xCBB59C)
            tooltip.drawRect(0, 0, text.width + padding, text.height + padding);
            tooltip.endFill();

            tooltip.addChild(text);
        }

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
                const text = this.CreateTooltip(node);
                text.position.set(padding / 2, padding / 2);

                tooltipCompare = new PIXI.Graphics();
                tooltipCompare.beginFill(0x000000, .75);
                tooltipCompare.lineStyle(2, 0xFFB000)
                tooltipCompare.drawRect(0, 0, text.width + padding, text.height + padding);
                tooltipCompare.endFill();

                tooltipCompare.addChild(text);
            }
        }

        if (tooltip === undefined && tooltipCompare !== undefined && hoveredCompareNode !== undefined) {
            tooltip = tooltipCompare;
            hovered = hoveredCompareNode;

            tooltipCompare = undefined;
            hoveredCompareNode = undefined;
        }

        if (tooltip !== undefined) {
            container.addChild(tooltip);
        }

        if (tooltipCompare !== undefined) {
            containerCompare.addChild(tooltipCompare);
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

        this.SetLayer(RenderLayer.Tooltip, container);
        this.SetLayer(RenderLayer.TooltipCompare, containerCompare);
    }

    private CreateTooltip = (node: SkillNode) => {
        let tooltip: PIXI.Container | undefined = this.NodeTooltips[`${node.GetId()}_${node.patch}`];

        if (tooltip === undefined) {
            let title: PIXI.Text | null = node.name.length > 0 ? new PIXI.Text(`${node.name} [${node.id}]`, { fill: 0xFFFFFF, fontSize: 18 }) : null;
            let stats: PIXI.Text | null = node.stats.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${node.stats.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0xFFFFFF, fontSize: 14 }) : null;
            let flavour: PIXI.Text | null = node.flavourText.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${node.flavourText.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0xAF6025, fontSize: 14 }) : null;
            let reminder: PIXI.Text | null = node.reminderText.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${node.reminderText.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0x808080, fontSize: 14 }) : null;

            tooltip = new PIXI.Container();
            tooltip.position.set(0, 0);
            let height = 0;
            if (title !== null) {
                tooltip.addChild(title);
                title.position.set(0, height);
                height += title.height;
            }

            if (stats !== null) {
                tooltip.addChild(stats);
                stats.position.set(0, height);
                height += stats.height;
            }

            if (flavour !== null) {
                tooltip.addChild(flavour);
                flavour.position.set(0, height);
                height += flavour.height;
            }

            if (reminder !== null) {
                tooltip.addChild(reminder);
                reminder.position.set(0, height);
                height += reminder.height;
            }

            tooltip.interactive = false;
            tooltip.interactiveChildren = false;
            tooltip.containerUpdateTransform = () => { };
            this.NodeTooltips[`${node.GetId()}_${node.patch}`] = tooltip;
        }

        return tooltip;
    }

    protected DestroyTooltips = () => {
        for (const id in this.NodeTooltips) {
            const tooltip = this.NodeTooltips[id];
            if (tooltip === undefined) {
                continue;
            }

            tooltip.destroy({ children: true, texture: true, baseTexture: true });
            delete this.NodeTooltips[id];
        }
    }
}