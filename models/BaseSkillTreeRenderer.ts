import { utils } from "../app/utils";
import { ConnectionStyle, SkillNode, SkillNodeStates } from "./SkillNode";
import { SkillTreeData } from "./SkillTreeData";
import { IConnnection } from "./types/IConnection";
import { ISkillNodeRenderer } from "./types/ISkillNodeRenderer";
import { ISkillTreeRenderer } from "./types/ISkillTreeRenderer";

export abstract class BaseSkillTreeRenderer implements ISkillTreeRenderer {
    Initialized: boolean = false;
    abstract SkillNodeRenderer: ISkillNodeRenderer;
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
    abstract CreateScreenshot(mimeType: "image/jpeg" | "image/webp"): string;

    protected abstract DrawAsset(layer: RenderLayer, asset: IAsset): { width: number, height: number };
    protected abstract DrawAssets(layer: RenderLayer, assets: IAsset[]): void;
    protected abstract DrawText(layer: RenderLayer, text: string, colour: string, x: number, y: number): void;
    protected abstract DrawBackgroundAsset(layer: RenderLayer, asset: "AtlasPassiveBackground" | "Background2" | "Background1"): void;

    protected abstract RenderBaseRest(): void;
    public RenderBase = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.SetupLayers();
        this.GenerateCompare();

        this.ClearLayer(RenderLayer.BackgroundColor);
        this.DrawBackground();

        this.ClearLayer(RenderLayer.Background);
        this.DrawGroupBackgrounds();
        this.DrawAscendacyBackgrounds();

        this.ClearLayer(RenderLayer.CharacterStarts);
        this.DrawInactiveCharacters();

        this.ClearLayer(RenderLayer.Connections);
        this.DrawConnectionsForNodes(RenderLayer.Connections, this.skillTreeData.nodes);

        this.ClearLayer(RenderLayer.SkillIcons);
        this.ClearLayer(RenderLayer.SkillIconsCompare);
        this.RenderBaseRest();
        this.DrawInactiveNodes();
        this.DrawCompareHighlights();
    }

    private DrawBackground = (): void => {
        if (this.skillTreeData.assets["AtlasPassiveBackground"] !== undefined) {
            this.DrawBackgroundAsset(RenderLayer.BackgroundColor, "AtlasPassiveBackground");
        } else if (this.skillTreeData.assets["Background2"] !== undefined) {
            this.DrawBackgroundAsset(RenderLayer.BackgroundColor, "Background2");
        } else {
            this.DrawBackgroundAsset(RenderLayer.BackgroundColor, "Background1");
        }
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

            const nodeSize = node.GetTargetSize();
            const moved = nodeSize.width !== 0 && nodeSize.height !== 0 && (Math.abs(node.x - other.x) > nodeSize.width || Math.abs(node.y - other.y) > nodeSize.height);
            if (moved) {
                this.skillTreeDataCompare.addState(other, SkillNodeStates.Moved);
            }
        }
    }

    private DrawGroupBackgrounds = (): void => {
        const assets: Array<IAsset> = [];
        for (const id in this.skillTreeData.groups) {
            const group = this.skillTreeData.groups[id];
            const nodes = group.nodes || [];
            if (nodes.length === 0 || nodes.find(id => this.skillTreeData.nodes[id].ascendancyName !== "") !== undefined) {
                continue;
            }

            let orbits = group.orbits || [];
            orbits = orbits.filter(x => x <= 3);
            const max = group.backgroundOverride !== undefined && group.backgroundOverride !== 0 ? group.backgroundOverride : Math.max(...orbits);
            if (max <= 0 || max > 3) continue;

            assets.push({
                name: `PSGroupBackground${max}`,
                x: Math.ceil(group.x * this.skillTreeData.scale),
                y: Math.ceil(group.y * this.skillTreeData.scale),
                half: max === 3 && this.skillTreeData.uiArtOptions.largeGroupUsesHalfImage
            });
        }
        this.DrawAssets(RenderLayer.Background, assets);
    }

    private DrawAscendacyBackgrounds = (): void => {
        for (const id in this.skillTreeData.ascedancyNodes) {
            const node = this.skillTreeData.ascedancyNodes[id];
            if (!node.isAscendancyStart || node.nodeGroup === undefined) {
                continue;
            }
            const group = node.nodeGroup;

            const ascendancyName = node.ascendancyName;
            const asset = {
                name: `Classes${ascendancyName}`,
                x: Math.ceil(group.x * this.skillTreeData.scale),
                y: Math.ceil(group.y * this.skillTreeData.scale)
            };
            const sprite = this.DrawAsset(RenderLayer.Background, asset);

            if (this.skillTreeData.classes === undefined) {
                continue;
            }

            for (const id in this.skillTreeData.classes) {
                const ascClasses = this.skillTreeData.classes[id];
                for (const classid in ascClasses.ascendancies) {
                    const ascClass = ascClasses.ascendancies[classid];
                    if (ascClass.name !== ascendancyName || ascClass.flavourTextRect === undefined) {
                        continue;
                    }

                    const rect = typeof ascClass.flavourTextRect === "string" ? ascClass.flavourTextRect.split(",") : [ascClass.flavourTextRect.x, ascClass.flavourTextRect.y];
                    const x = Math.ceil((group.x + +rect[0]) * this.skillTreeData.scale) - sprite.width / 2;
                    const y = Math.ceil((group.y + +rect[1]) * this.skillTreeData.scale) - sprite.height / 2;

                    const [r, g, b] = this.ExtractColour(ascClass.flavourTextColour);
                    const colour = "0x" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                    this.DrawText(RenderLayer.Background, ascClass.flavourText, colour, x, y);
                }
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
        if (this.skillTreeData.assets["PSStartNodeBackgroundInactive"] === undefined) {
            return;
        }

        const assets: Array<IAsset> = [];
        for (const id of this.skillTreeData.root.out) {
            const node = this.skillTreeData.nodes[id];
            if (node.classStartIndex === undefined || node.nodeGroup === undefined) {
                continue;
            }

            assets.push({
                name: "PSStartNodeBackgroundInactive",
                x: node.nodeGroup.x * this.skillTreeData.scale,
                y: node.nodeGroup.y * this.skillTreeData.scale
            });
        }
        this.DrawAssets(RenderLayer.CharacterStarts, assets);
    }

    private DrawInactiveNodes = (): void => {
        this.DrawNodes(RenderLayer.SkillIcons, this.skillTreeData.nodes, this.skillTreeData.nodes, { filterClassIndex: true });

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

        this.DrawNodes(RenderLayer.SkillIconsCompare, nodes, this.skillTreeDataCompare.nodes, { filterClassIndex: true });
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
        this.DrawHighlights(RenderLayer.SkillIcons, highlights);

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
                    asset: asset,
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

        if ((node.is(SkillNodeStates.Pathing) || node.is(SkillNodeStates.Hovered)) && !(other.is(SkillNodeStates.Pathing) || other.is(SkillNodeStates.Hovered) || other.is(SkillNodeStates.Active))) {
            return false;
        }

        return true;
    }

    private DrawNodes = (layer: RenderLayer, nodes: { [id: string]: SkillNode }, all: { [id: string]: SkillNode }, options: DrawNodeOptions): void => {
        const frames: Array<IAsset> = [];
        for (const id in nodes) {
            const node = nodes[id];
            if (node.nodeGroup === undefined || node.classStartIndex !== undefined) {
                continue;
            }

            let others = node.out.map(x => all[x]).filter(x => x);
            if (options.filterClassIndex) {
                others = others.filter(x => x.classStartIndex === undefined)
            }

            if (options.outFrames) {
                for (const out of others) {
                    const ins = out.in.map(x => all[x]);
                    const asset = out.GetFrameAssetKey(ins);
                    if (asset === null) {
                        continue;
                    }

                    frames.push({
                        name: asset,
                        x: out.x,
                        y: out.y
                    });
                }
            }

            const asset = node.GetFrameAssetKey(others);
            if (asset === null) {
                continue;
            }

            frames.push({
                name: asset,
                x: node.x,
                y: node.y,
                node: node
            });
        }
        this.DrawAssets(layer, frames);
    }

    protected abstract RenderActiveRest(): void;
    public RenderActive = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayer.ConnectionsActive);
        this.DrawConnectionsForNodes(RenderLayer.ConnectionsActive, this.skillTreeData.getNodes(SkillNodeStates.Active));

        this.ClearLayer(RenderLayer.SkillIconsActive);
        this.ClearLayer(RenderLayer.SkillIconsActiveEffects);
        this.RenderActiveRest();
        this.DrawNodes(RenderLayer.SkillIconsActive, this.skillTreeData.getNodes(SkillNodeStates.Active), this.skillTreeData.nodes, { outFrames: true });
    }

    RenderCharacterStartsActive = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayer.BackgroundActive);
        this.ClearLayer(RenderLayer.CharacterStartsActive);

        const backgroundAssets: Array<IAsset> = [];
        const startAssets: Array<IAsset> = [];
        for (const id of this.skillTreeData.root.out) {
            const node = this.skillTreeData.nodes[id];
            const classId = node.classStartIndex;
            if (classId === undefined || !node.is(SkillNodeStates.Active) || node.nodeGroup === undefined) {
                continue;
            }

            const className = utils.getKeyByValue(this.skillTreeData.constants.classes, classId);
            if (className === undefined && Object.keys(this.skillTreeData.constants.classes).length === 0) {
                startAssets.push({
                    name: "AtlasStart",
                    x: node.x,
                    y: node.y
                });
            } else if (className !== undefined) {
                const commonName = this.skillTreeData.constants.classesToName[className];
                if (this.skillTreeData.extraImages !== undefined) {
                    const extraImage = this.skillTreeData.extraImages[classId];
                    if (extraImage) {
                        backgroundAssets.push({
                            name: `Background${className.replace("Class", "")}`,
                            x: extraImage.x * this.skillTreeData.scale,
                            y: extraImage.y * this.skillTreeData.scale,
                            offsetX: 0
                        });
                    }
                }

                startAssets.push({
                    name: `center${commonName.toLocaleLowerCase()}`,
                    x: node.x,
                    y: node.y
                });

            }
        }
        this.DrawAssets(RenderLayer.BackgroundActive, backgroundAssets);
        this.DrawAssets(RenderLayer.CharacterStartsActive, startAssets);
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

    protected abstract RenderHoverRest(hovered: SkillNode): void;
    StartRenderHover = (hovered: SkillNode): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayer.ConnectionsPathing);
        this.DrawConnectionsForNodes(RenderLayer.ConnectionsPathing, this.skillTreeData.getHoveredNodes());

        this.ClearLayer(RenderLayer.SkillIconsPathing);
        this.ClearLayer(RenderLayer.AtlasMasteryHighlight);
        this.RenderHoverRest(hovered);
        this.DrawNodes(RenderLayer.SkillIconsPathing, this.skillTreeData.getHoveredNodes(), this.skillTreeData.nodes, {});

        this.ClearLayer(RenderLayer.NodeMoveCompare);
        this.DrawCompareMovedHighlights();
    }

    StopRenderHover = (_: SkillNode): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayer.ConnectionsPathing);
        this.ClearLayer(RenderLayer.SkillIconsPathing);
        this.ClearLayer(RenderLayer.NodeMoveCompare);
        this.ClearLayer(RenderLayer.AtlasMasteryHighlight);
        this.ClearLayer(RenderLayer.Tooltip);
        this.ClearLayer(RenderLayer.TooltipCompare);
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
    filterClassIndex?: boolean;
    outFrames?: boolean;
}

export enum RenderLayer {
    BackgroundColor = 0,
    Background = 1,
    BackgroundActive = 2,
    Connections = 3,
    SkillIconsActiveEffects = 4,
    ConnectionsActive = 5,
    ConnectionsPathing = 6,
    SkillIcons = 7,
    SkillIconsPathing = 8,
    SkillIconsActive = 9,
    CharacterStarts = 10,
    CharacterStartsActive = 11,
    JewelSocketActive = 12,
    JewelSocketHighlights = 13,
    SkillIconsCompare = 14,
    Highlights = 15,
    NodeMoveCompare = 16,
    AtlasMasteryHighlight = 17,
    Tooltip = 18,
    TooltipCompare = 19
};

export enum HighlightColor {
    Added = 0x00FF00,
    Changed = 0xFFB000,
    Removed = 0xFF0000,
    Moved = 0xFF1493,
    Searched = 0x7F00FF
};

export interface IAsset {
    name: string;
    x: number;
    y: number;
    half?: boolean | undefined;
    offsetX?: number | undefined;
    offsetY?: number | undefined;
    node?: SkillNode | undefined;
};

export interface IHighlight {
    node: SkillNode,
    color: number
};