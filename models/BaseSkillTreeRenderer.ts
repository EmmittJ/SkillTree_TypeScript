import { SemVer } from "semver";
import { utils } from "../app/utils";
import { ConnectionStyle, DrawType, SkillNode, SkillNodeStates } from "./SkillNode";
import { SkillTreeData } from "./SkillTreeData";
import { ISkillTreeRenderer } from "./types/ISkillTreeRenderer";

export abstract class BaseSkillTreeRenderer implements ISkillTreeRenderer {
    Initialized: boolean = false;
    protected container: HTMLElement;
    protected skillTreeData: SkillTreeData;
    protected skillTreeDataCompare: SkillTreeData | undefined;

    private _lastTick = Date.now();

    constructor(container: HTMLElement, skillTreeData: SkillTreeData, skillTreeDataCompare: SkillTreeData | undefined) {
        this.container = container;
        this.skillTreeData = skillTreeData;
        this.skillTreeDataCompare = skillTreeDataCompare;
    }

    abstract IsDirty(): boolean;
    abstract PreUpdate(delta: number): void;
    abstract Update(delta: number): void;
    abstract PostUpdate(delta: number): void;
    protected Tick() {
        const tick = Date.now();;
        const delta = this._lastTick - tick;
        this._lastTick = tick;

        this.PreUpdate(delta);
        if (this.IsDirty()) {
            this.Update(delta)
        }
        this.PostUpdate(delta);

        requestAnimationFrame(() => { this.Tick() });
    }

    abstract Initialize(): Promise<boolean>;
    abstract CreateScreenshot(mimeType: "image/jpeg" | "image/webp"): Promise<string>;

    protected abstract DrawSpriteSheetAsset(layer: RenderLayer, asset: ISpriteSheetAsset): { width: number, height: number };
    protected abstract DrawSpriteSheetAssets(layer: RenderLayer, assets: ISpriteSheetAsset[]): { width: number, height: number }[];
    protected abstract DrawText(layer: RenderLayer, text: string, colour: string, x: number, y: number): void;
    protected abstract DrawBackgroundAsset(layer: RenderLayer, asset: ISpriteSheetAsset): void;

    public RenderBase = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.SetupLayers();
        this.GenerateCompare();

        this.ClearLayer(RenderLayer.Background);
        this.DrawBackground();

        this.ClearLayer(RenderLayer.GroupBackground);
        this.DrawGroupBackgrounds();
        this.DrawAscendancyBackgrounds();

        this.ClearLayer(RenderLayer.CharacterStarts);
        this.DrawInactiveCharacters();

        this.ClearLayer(RenderLayer.Connections);
        this.DrawConnectionsForNodes(RenderLayer.Connections, this.skillTreeData.nodes);

        this.ClearLayer(RenderLayer.SkillIcons);
        this.ClearLayer(RenderLayer.SkillIconsFrames);
        this.ClearLayer(RenderLayer.SkillIconsCompare);
        this.DrawInactiveNodes();
        this.DrawCompareHighlights();
    }

    private DrawBackground = (): void => {
        var background = this.skillTreeData.hasSprite("background", "Background1") ? "Background1" : "Background2";
        var asset: ISpriteSheetAsset = {
            patch: this.skillTreeData.patch,
            key: this.skillTreeData.tree === "Atlas" ? "atlasBackground" : "background",
            icon: this.skillTreeData.tree === "Atlas" ? "AtlasPassiveBackground" : background
        }
        this.DrawBackgroundAsset(RenderLayer.Background, asset);
    }

    private GenerateCompare = (): void => {
        if (this.skillTreeDataCompare === undefined) {
            return;
        }

        for (const id in this.skillTreeData.nodes) {
            const node = this.skillTreeData.nodes[id];
            if (node.nodeGroup === undefined || node.classStartIndex !== undefined) {
                continue;
            }

            if (this.skillTreeDataCompare.nodes[node.GetId()] === undefined) {
                continue;
            }

            const other = this.skillTreeDataCompare.nodes[node.GetId()];

            let diff = node.stats.length !== other.stats.length;
            for (const s of node.stats) {
                let found = false;
                for (const s2 of other.stats) {
                    if (s.toUpperCase() === s2.toUpperCase()) {
                        found = true;
                    }
                }

                if (!found) {
                    diff = true;
                    break;
                }
            }
            if (diff) {
                this.skillTreeDataCompare.addState(other, SkillNodeStates.Compared);
            }

            const nodeSize = node.targetSize;
            const moved = nodeSize.width !== 0 && nodeSize.height !== 0 && (Math.abs(node.x - other.x) > nodeSize.width || Math.abs(node.y - other.y) > nodeSize.height);
            if (moved) {
                this.skillTreeDataCompare.addState(other, SkillNodeStates.Moved);
            }
        }
    }

    private DrawGroupBackgrounds = (): void => {
        const assets: Array<ISpriteSheetAsset> = [];
        for (const id in this.skillTreeData.groups) {
            const group = this.skillTreeData.groups[id];
            const background = group.background;
            if (background === undefined) {
                continue;
            }

            assets.push({
                patch: this.skillTreeData.patch,
                key: "groupBackground",
                icon: background.image,
                x: Math.ceil(group.x * this.skillTreeData.scale) + (background.offsetX ? background.offsetX * this.skillTreeData.scale : 0),
                y: Math.ceil(group.y * this.skillTreeData.scale) + (background.offsetY ? background.offsetY * this.skillTreeData.scale : 0),
                half: background.isHalfImage
            });
        }
        this.DrawSpriteSheetAssets(RenderLayer.GroupBackground, assets);
    }

    private DrawAscendancyBackgrounds = (): void => {
        for (const id in this.skillTreeData.ascendancyNodes) {
            const node = this.skillTreeData.ascendancyNodes[id];
            if (!node.isAscendancyStart || node.nodeGroup === undefined) {
                continue;
            }

            this.DrawAscendancyBackground(node.nodeGroup, node.ascendancyName, "ascendancyBackground", `Classes${node.ascendancyName}`);
        }
    }

    private DrawAscendancyBackground = (group: IGroup, ascendancyName: string, key: SpriteSheetKey, icon: string) => {
        if (!this.skillTreeData.hasSprite(key, icon)) {
            return;
        }

        const asset: ISpriteSheetAsset = {
            patch: this.skillTreeData.patch,
            key: key,
            icon: icon,
            x: Math.ceil(group.x * this.skillTreeData.scale),
            y: Math.ceil(group.y * this.skillTreeData.scale),
            mask: "circle"
        };
        const sprite = this.DrawSpriteSheetAsset(RenderLayer.GroupBackground, asset);

        if (this.skillTreeData.classes === undefined) {
            return;
        }

        for (const id in this.skillTreeData.classes) {
            const ascClasses = this.skillTreeData.classes[id];
            for (const classid in ascClasses.ascendancies) {
                const ascClass = ascClasses.ascendancies[classid];
                if (ascClass.name !== ascendancyName || ascClass.flavourTextRect === undefined) {
                    continue;
                }

                const rect = [ascClass.flavourTextRect.x, ascClass.flavourTextRect.y];
                const x = Math.ceil((group.x + +rect[0]) * this.skillTreeData.scale) - sprite.width / 2;
                const y = Math.ceil((group.y + +rect[1]) * this.skillTreeData.scale) - sprite.height / 2;

                const [r, g, b] = this.ExtractColour(ascClass.flavourTextColour);
                const colour = "0x" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                this.DrawText(RenderLayer.GroupBackground, ascClass.flavourText, colour, x, y);
            }
        }
    }

    private ExtractColour = (colour: string): [number, number, number] => {
        let r = 0;
        let g = 0;
        let b = 0;
        if (colour.indexOf(',') > 0) {
            const c = colour.split(",");
            r = +c[0];
            g = +c[1];
            b = +c[2];
        } else {
            const c = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec("#" + colour);
            if (c && c.length === 4) {
                r = parseInt(c[1], 16);
                g = parseInt(c[2], 16);
                b = parseInt(c[3], 16);
            }
        }

        return [r, g, b];
    }

    private DrawInactiveCharacters = (): void => {
        if (!this.skillTreeData.hasSprite("startNode", "PSStartNodeBackgroundInactive")) {
            return;
        }

        const assets: Array<ISpriteSheetAsset> = [];
        for (const id of this.skillTreeData.root.out) {
            const node = this.skillTreeData.nodes[id];
            if (node.classStartIndex === undefined || node.nodeGroup === undefined || node.ascendancyName !== undefined) {
                continue;
            }

            assets.push({
                patch: this.skillTreeData.patch,
                key: "startNode",
                icon: "PSStartNodeBackgroundInactive",
                x: node.nodeGroup.x * this.skillTreeData.scale,
                y: node.nodeGroup.y * this.skillTreeData.scale
            });
        }
        this.DrawSpriteSheetAssets(RenderLayer.CharacterStarts, assets);
    }

    private DrawInactiveNodes = (): void => {
        this.DrawNodes(RenderLayer.SkillIcons, this.skillTreeData.nodes, this.skillTreeData.nodes, { filterClassIndex: true, bindEvents: true });

        if (this.skillTreeDataCompare === undefined) {
            return;
        }

        const nodes: { [id: string]: SkillNode } = {};
        for (const id in this.skillTreeDataCompare.nodes) {
            const node = this.skillTreeDataCompare.nodes[id];
            if (this.skillTreeData.nodes[node.GetId()] !== undefined) {
                continue;
            }
            nodes[id] = node;
        }

        this.DrawNodes(RenderLayer.SkillIconsCompare, nodes, this.skillTreeDataCompare.nodes, { filterClassIndex: true, bindEvents: true });
    }

    private DrawCompareHighlights = (): void => {
        if (this.skillTreeDataCompare === undefined) {
            return;
        }

        const highlights: Array<IHighlight> = [];
        for (const id in this.skillTreeData.nodes) {
            const node = this.skillTreeData.nodes[id];
            if (node.nodeGroup === undefined || node.classStartIndex !== undefined) {
                continue;
            }

            const other = this.skillTreeDataCompare.nodes[node.GetId()];
            if (other === undefined) {
                highlights.push({ node: node, color: HighlightColor.Added });
            } else {
                if (!(other.is(SkillNodeStates.Compared) || other.is(SkillNodeStates.Moved))) {
                    continue;
                }

                highlights.push({ node: node, color: HighlightColor.Changed });
            }
        }
        this.DrawHighlights(RenderLayer.SkillIconsFrames, highlights);

        const compareHighlights: Array<IHighlight> = [];
        for (const id in this.skillTreeDataCompare.nodes) {
            const node = this.skillTreeDataCompare.nodes[id];
            if (this.skillTreeData.nodes[node.GetId()] !== undefined) {
                continue;
            }

            this.skillTreeDataCompare.addState(node, SkillNodeStates.Compared);
            compareHighlights.push({ node: node, color: HighlightColor.Removed });
        }
        this.DrawHighlights(RenderLayer.SkillIconsCompare, compareHighlights);
    }

    protected abstract DrawConnections(layer: RenderLayer, connections: IConnnection[]): void;
    private DrawConnectionsForNodes = (layer: RenderLayer, nodes: { [id: string]: SkillNode }): void => {
        const connections: Array<IConnnection> = [];
        const drawnConnections: { [id: string]: boolean } = {};
        for (const id in nodes) {
            const node = nodes[id];
            if (node.nodeGroup === undefined || (layer === RenderLayer.Connections && node.classStartIndex !== undefined)) {
                continue;
            }

            let others = node.in
                .filter(outID => !drawnConnections[`${+id}-${outID}`] || !drawnConnections[`${outID}-${+id}`])
                .map((outID) => {
                    drawnConnections[`${+id}-${outID}`] = true;
                    drawnConnections[`${outID}-${+id}`] = true;
                    return this.skillTreeData.nodes[outID]
                });
            if (layer === RenderLayer.Connections) {
                others = others.filter(x => x.classStartIndex === undefined);
            }

            for (const other of others) {
                if (!this.IsValidConnection(node, other)) {
                    continue;
                }

                const connectionType = node.GetConnectionType(other);
                const style = node.group === other.group && node.orbit === other.orbit
                    ? ConnectionStyle.Arc
                    : ConnectionStyle.Line;
                const asset = style === ConnectionStyle.Arc
                    ? `Orbit${node.orbit}${connectionType}`
                    : `LineConnector${connectionType}`;
                const removing = node.is(SkillNodeStates.Active | SkillNodeStates.Pathing) && other.is(SkillNodeStates.Active | SkillNodeStates.Pathing);
                connections.push({
                    patch: node.patch,
                    key: "line",
                    icon: asset,
                    style: style,
                    node: node,
                    other: other,
                    removing: removing
                })
            }
        }

        this.DrawConnections(layer, connections);
    }

    private IsValidConnection = (node: SkillNode, other: SkillNode): boolean => {
        if ((node.ascendancyName !== "" && other.ascendancyName === "") || (node.ascendancyName === "" && other.ascendancyName !== "")) {
            return false;
        }

        if (node.classStartIndex !== undefined || other.classStartIndex !== undefined) {
            const start = this.skillTreeData.getStartClass();
            return node.classStartIndex === start || other.classStartIndex === start;
        }

        if (node.isMastery || other.isMastery) {
            return false;
        }

        if (node.isWormhole && other.isWormhole) {
            return false;
        }

        if ((node.is(SkillNodeStates.Pathing) || node.is(SkillNodeStates.Hovered)) && !(other.is(SkillNodeStates.Pathing) || other.is(SkillNodeStates.Hovered) || other.is(SkillNodeStates.Active))) {
            return false;
        }

        return true;
    }

    private DrawNodes = (layer: RenderLayer, nodes: { [id: string]: SkillNode }, all: { [id: string]: SkillNode }, options: DrawNodeOptions): void => {
        const effects: Array<ISpriteSheetAsset> = [];
        const icons: Array<ISpriteSheetAsset> = [];
        const atlasMastery: Array<ISpriteSheetAsset> = [];
        const frames: Array<ISpriteSheetAsset> = [];
        for (const id in nodes) {
            const node = nodes[id];
            if (node.nodeGroup === undefined || (options.filterClassIndex && node.classStartIndex !== undefined)) {
                continue;
            }

            if (node.activeEffectImage !== "" && node.is(SkillNodeStates.Active)) {
                effects.push({
                    patch: node.patch,
                    key: "masteryActiveEffect",
                    icon: node.activeEffectImage,
                    x: node.x,
                    y: node.y
                })
            }

            const icon = node.GetIcon();
            if (!node.isAscendancyStart && icon !== "") {
                if (this.skillTreeData.tree === "Atlas" && node.isMastery && node.is(SkillNodeStates.Hovered)) {
                    if (this.skillTreeData.hasSprite('masteryOverlay', icon)) {
                        atlasMastery.push({
                            patch: node.patch,
                            key: 'masteryOverlay',
                            icon: icon,
                            x: node.x,
                            y: node.y
                        });
                    } else {
                        atlasMastery.push({
                            patch: node.patch,
                            key: 'mastery',
                            icon: icon,
                            x: node.x,
                            y: node.y,
                            scale: 2.5
                        });
                    }
                } else {
                    icons.push({
                        patch: node.patch,
                        key: node.GetSpriteSheetKey(),
                        icon: icon,
                        x: node.x,
                        y: node.y,
                        node: options.bindEvents ? node : undefined
                    });
                }
            }

            let others = node.out.map(x => all[x]).filter(x => x);
            if (options.filterClassIndex) {
                others = others.filter(x => x.classStartIndex === undefined)
            }

            if (options.outFrames) {
                for (const out of others) {
                    if (out.classStartIndex !== undefined) continue;
                    const ins = out.in.map(x => all[x]);
                    const frame = out.GetFrameAssetKey(ins);
                    const key = frame?.startsWith('Ascendancy') ? 'ascendancy' : 'frame';
                    if (frame !== null) {
                        frames.push({
                            patch: node.patch,
                            key: key,
                            icon: frame,
                            x: out.x,
                            y: out.y
                        });
                    }
                }
            }

            const frame = node.GetFrameAssetKey(others);
            const key = frame?.startsWith('Ascendancy') ? 'ascendancy' : 'frame';
            if (frame !== null) {
                frames.push({
                    patch: node.patch,
                    key: key,
                    icon: frame,
                    x: node.x,
                    y: node.y,
                    node: options.bindEvents ? node : undefined
                });
            }
        }

        this.DrawSpriteSheetAssets(RenderLayer.SkillIconsActiveEffects, effects);
        this.DrawSpriteSheetAssets(RenderLayer.AtlasMasteryHighlight, atlasMastery);
        this.DrawSpriteSheetAssets(layer, icons);
        this.DrawSpriteSheetAssets(layer + 3, frames);
    }

    public RenderActive = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayer.ConnectionsPathing);
        this.ClearLayer(RenderLayer.ConnectionsActive);
        this.DrawConnectionsForNodes(RenderLayer.ConnectionsActive, this.skillTreeData.getNodes(SkillNodeStates.Active));

        this.ClearLayer(RenderLayer.SkillIconsPathing);
        this.ClearLayer(RenderLayer.SkillIconsPathingFrames);
        this.ClearLayer(RenderLayer.SkillIconsActive);
        this.ClearLayer(RenderLayer.SkillIconsActiveFrames);
        this.ClearLayer(RenderLayer.SkillIconsActiveEffects);
        this.DrawNodes(RenderLayer.SkillIconsActive, this.skillTreeData.getNodes(SkillNodeStates.Active), this.skillTreeData.nodes, { outFrames: true });
    }

    RenderCharacterStartsActive = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayer.BackgroundActive);
        this.ClearLayer(RenderLayer.CharacterStartsActive);

        const backgroundAssets: Array<ISpriteSheetAsset> = [];
        const startAssets: Array<ISpriteSheetAsset> = [];
        for (const id of this.skillTreeData.root.out) {
            const node = this.skillTreeData.nodes[id];
            const classId = node.classStartIndex;
            if (classId === undefined || !node.is(SkillNodeStates.Active) || node.nodeGroup === undefined) {
                continue;
            }

            const className = utils.getKeyByValue(this.skillTreeData.constants.classes, classId);
            if (this.skillTreeData.hasSprite("startNode", "AtlasPassiveSkillScreenStart")) {
                startAssets.push({
                    patch: node.patch,
                    key: "startNode",
                    icon: "AtlasPassiveSkillScreenStart",
                    x: node.x,
                    y: node.y
                });
            } else if (className !== undefined) {
                const commonName = this.skillTreeData.constants.classesToName[className];
                var asset = `Background${className.replace("Class", "")}`;
                if (this.skillTreeData.extraImages !== undefined && this.skillTreeData.hasSprite("startNode", asset)) {
                    const extraImage = this.skillTreeData.extraImages[classId];
                    if (extraImage) {
                        backgroundAssets.push({
                            patch: node.patch,
                            key: "startNode",
                            icon: asset,
                            x: extraImage.x * this.skillTreeData.scale,
                            y: extraImage.y * this.skillTreeData.scale,
                            offsetX: 0
                        });
                    }
                }

                startAssets.push({
                    patch: node.patch,
                    key: "startNode",
                    icon: `center${commonName.toLocaleLowerCase()}`,
                    x: node.x,
                    y: node.y
                });

            }
        }
        this.DrawSpriteSheetAssets(RenderLayer.BackgroundActive, backgroundAssets);
        this.DrawSpriteSheetAssets(RenderLayer.CharacterStartsActive, startAssets);
    }

    protected abstract DrawHighlights(layer: RenderLayer, highlights: IHighlight[]): void;
    RenderHighlight = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayer.Highlights);

        const highlights: Array<IHighlight> = [];
        const nodes = this.skillTreeData.getNodes(SkillNodeStates.Highlighted);
        for (const id in nodes) {
            highlights.push({ node: nodes[id], color: HighlightColor.Searched });
        }

        this.DrawHighlights(RenderLayer.Highlights, highlights);
    }

    protected abstract RenderTooltip(hovered: SkillNode): void;
    protected abstract DestroyTooltips(): void;
    StartRenderHover = (hovered: SkillNode): void => {
        if (!this.Initialized) {
            return;
        }
        this.StopRenderHover(hovered);

        this.DrawConnectionsForNodes(RenderLayer.ConnectionsPathing, this.skillTreeData.getHoveredNodes());
        this.DrawNodes(RenderLayer.SkillIconsPathing, this.skillTreeData.getHoveredNodes(), this.skillTreeData.nodes, {});
        this.DrawCompareMovedHighlights();
        if (this.skillTreeDataCompare !== undefined && hovered.is(SkillNodeStates.Compared)) {
            this.skillTreeDataCompare.addState(hovered, SkillNodeStates.Hovered);
        }
        this.RenderTooltip(hovered);
    }

    StopRenderHover = (hovered: SkillNode): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayer.ConnectionsPathing);
        this.ClearLayer(RenderLayer.SkillIconsPathing);
        this.ClearLayer(RenderLayer.SkillIconsPathingFrames);
        this.ClearLayer(RenderLayer.AtlasMasteryHighlight);
        this.ClearLayer(RenderLayer.NodeMoveCompare);
        this.ClearLayer(RenderLayer.Tooltip);
        this.ClearLayer(RenderLayer.TooltipCompare);
        this.DestroyTooltips();
    }

    private DrawCompareMovedHighlights = (): void => {
        if (this.skillTreeDataCompare === undefined) {
            return;
        }
        this.skillTreeDataCompare.clearState(SkillNodeStates.Hovered);

        const hoveredNodes = this.skillTreeData.getNodes(SkillNodeStates.Hovered);
        const highlights: Array<IHighlight> = [];
        for (const id in hoveredNodes) {
            const node = hoveredNodes[id];

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
                    highlights.push({ node: other, color: HighlightColor.Moved });
                }
            }
        }
        this.DrawHighlights(RenderLayer.NodeMoveCompare, highlights);
    }

    protected abstract SetupLayers(): void;
    protected abstract SetLayer(layer: RenderLayer, object: any): void;
    protected abstract ClearLayer(layer: RenderLayer): void;
}

interface DrawNodeOptions {
    bindEvents?: boolean;
    filterClassIndex?: boolean;
    outFrames?: boolean;
}

export enum RenderLayer {
    Background = 0,
    BackgroundActive = 1,
    GroupBackground = 2,
    Connections = 3,
    SkillIconsActiveEffects = 4,
    ConnectionsActive = 5,
    ConnectionsPathing = 6,
    SkillIcons = 7,
    SkillIconsActive = 8,
    SkillIconsPathing = 9,
    SkillIconsFrames = 10,
    SkillIconsActiveFrames = 11,
    SkillIconsPathingFrames = 12,
    CharacterStarts = 13,
    CharacterStartsActive = 14,
    JewelSocketActive = 15,
    JewelSocketHighlights = 16,
    SkillIconsCompare = 17,
    Highlights = 18,
    NodeMoveCompare = 19,
    AtlasMasteryHighlight = 20,
    Tooltip = 21,
    TooltipCompare = 22
};

export enum HighlightColor {
    Added = 0x00FF00,
    Changed = 0xFFB000,
    Removed = 0xFF0000,
    Moved = 0xFF1493,
    Searched = 0xB452FF
};

export interface ISpriteSheetAsset {
    patch: SemVer;
    key: SpriteSheetKey;
    icon: string;
    x?: number | undefined;
    y?: number | undefined;
    half?: boolean | undefined;
    offsetX?: number | undefined;
    offsetY?: number | undefined;
    scale?: number | undefined;
    node?: SkillNode | undefined;
    mask?: "circle" | undefined;
};

export interface IConnnection extends ISpriteSheetAsset {
    style: ConnectionStyle;
    node: SkillNode;
    other: SkillNode;
    removing: boolean
}

export interface IHighlight {
    node: SkillNode,
    color: number
};