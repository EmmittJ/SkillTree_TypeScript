import { utils } from "../app/utils";
import { ConnectionStyle, SkillNode, SkillNodeStates } from "./SkillNode";
import { SkillTreeData } from "./SkillTreeData";
import { IConnnection } from "./types/IConnection";
import { ISkillNodeRenderer } from "./types/ISkillNodeRenderer";
import { ISkillTreeRenderer } from "./types/ISkillTreeRenderer";

export enum RenderLayers {
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
}

export interface IAsset {
    name: string;
    x: number;
    y: number;
    half?: boolean | undefined;
    offsetX?: number | undefined;
    offsetY?: number | undefined;
}

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

    protected abstract DrawAsset(layer: RenderLayers, asset: IAsset): { width: number, height: number };
    protected abstract DrawText(layer: RenderLayers, text: string, colour: string, x: number, y: number): void;
    protected abstract DrawBackground(layer: RenderLayers, asset: "AtlasPassiveBackground" | "Background2" | "Background1"): void;

    protected abstract RenderBaseRest(): void;
    public RenderBase = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.SetupLayers();

        this.ClearLayer(RenderLayers.BackgroundColor);
        if (this.skillTreeData.assets["AtlasPassiveBackground"] !== undefined) {
            this.DrawBackground(RenderLayers.BackgroundColor, "AtlasPassiveBackground");
        } else if (this.skillTreeData.assets["Background2"] !== undefined) {
            this.DrawBackground(RenderLayers.BackgroundColor, "Background2");
        } else {
            this.DrawBackground(RenderLayers.BackgroundColor, "Background1");
        }

        this.ClearLayer(RenderLayers.Background);
        this.DrawGroupBackgrounds();
        this.DrawAscendacyBackgrounds();

        this.ClearLayer(RenderLayers.CharacterStarts);
        this.DrawInactiveCharacters();

        this.ClearLayer(RenderLayers.Connections);
        this.DrawConnectionsForNodes(RenderLayers.Connections, this.skillTreeData.nodes);

        this.ClearLayer(RenderLayers.SkillIcons);
        this.ClearLayer(RenderLayers.SkillIconsCompare);
        this.RenderBaseRest();
    }

    private DrawGroupBackgrounds = (): void => {
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

            const asset = {
                name: `PSGroupBackground${max}`,
                x: Math.ceil(group.x * this.skillTreeData.scale),
                y: Math.ceil(group.y * this.skillTreeData.scale),
                half: max === 3 && this.skillTreeData.uiArtOptions.largeGroupUsesHalfImage
            };
            this.DrawAsset(RenderLayers.Background, asset);
        }
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
            const sprite = this.DrawAsset(RenderLayers.Background, asset);

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
                    this.DrawText(RenderLayers.Background, ascClass.flavourText, colour, x, y);
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

        for (const id of this.skillTreeData.root.out) {
            const node = this.skillTreeData.nodes[id];
            if (node.classStartIndex === undefined || node.nodeGroup === undefined) {
                continue;
            }

            const asset = {
                name: "PSStartNodeBackgroundInactive",
                x: node.nodeGroup.x * this.skillTreeData.scale,
                y: node.nodeGroup.y * this.skillTreeData.scale
            };
            this.DrawAsset(RenderLayers.CharacterStarts, asset);
        }
    }

    protected abstract DrawConnections(layer: RenderLayers, connections: IConnnection[]): void;
    private DrawConnectionsForNodes = (layer: RenderLayers, nodes: { [id: string]: SkillNode }): void => {
        const connections: Array<IConnnection> = [];
        const drawnConnections: { [id: string]: boolean } = {};
        for (const id in nodes) {
            const node = nodes[id];
            if (node.nodeGroup === undefined || (layer === RenderLayers.Connections && node.classStartIndex !== undefined)) {
                continue;
            }

            let others = node.in
                .filter(outID => !drawnConnections[`${+id}-${outID}`] || !drawnConnections[`${outID}-${+id}`])
                .map((outID) => {
                    drawnConnections[`${+id}-${outID}`] = true;
                    drawnConnections[`${outID}-${+id}`] = true;
                    return this.skillTreeData.nodes[outID]
                });
            if (layer === RenderLayers.Connections) {
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

    protected abstract RenderActiveRest(): void;
    public RenderActive = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayers.ConnectionsActive);
        this.DrawConnectionsForNodes(RenderLayers.ConnectionsActive, this.skillTreeData.getNodes(SkillNodeStates.Active));

        this.ClearLayer(RenderLayers.SkillIconsActive);
        this.ClearLayer(RenderLayers.SkillIconsActiveEffects);
        this.RenderActiveRest();
    }

    RenderCharacterStartsActive = (): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayers.BackgroundActive);
        this.ClearLayer(RenderLayers.CharacterStartsActive);

        for (const id of this.skillTreeData.root.out) {
            const node = this.skillTreeData.nodes[id];
            const classId = node.classStartIndex;
            if (classId === undefined || !node.is(SkillNodeStates.Active) || node.nodeGroup === undefined) {
                continue;
            }

            const className = utils.getKeyByValue(this.skillTreeData.constants.classes, classId);
            if (className === undefined && Object.keys(this.skillTreeData.constants.classes).length === 0) {
                const asset = {
                    name: "AtlasStart",
                    x: node.x,
                    y: node.y
                };
                this.DrawAsset(RenderLayers.CharacterStartsActive, asset);
            } else if (className !== undefined) {
                const commonName = this.skillTreeData.constants.classesToName[className];
                if (this.skillTreeData.extraImages !== undefined) {
                    const extraImage = this.skillTreeData.extraImages[classId];
                    if (extraImage) {
                        const asset = {
                            name: `Background${className.replace("Class", "")}`,
                            x: extraImage.x * this.skillTreeData.scale,
                            y: extraImage.y * this.skillTreeData.scale,
                            offsetX: 0
                        };
                        this.DrawAsset(RenderLayers.BackgroundActive, asset);
                    }
                }

                const asset = {
                    name: `center${commonName.toLocaleLowerCase()}`,
                    x: node.x,
                    y: node.y
                };
                this.DrawAsset(RenderLayers.CharacterStartsActive, asset);
            }
        }
    }

    abstract RenderHighlight(): void;

    protected abstract RenderHoverRest(hovered: SkillNode): void;
    StartRenderHover = (hovered: SkillNode): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayers.ConnectionsPathing);
        this.DrawConnectionsForNodes(RenderLayers.ConnectionsPathing, this.skillTreeData.getHoveredNodes());

        this.ClearLayer(RenderLayers.SkillIconsPathing);
        this.ClearLayer(RenderLayers.NodeMoveCompare);
        this.ClearLayer(RenderLayers.AtlasMasteryHighlight);

        this.RenderHoverRest(hovered);
    }

    StopRenderHover = (_: SkillNode): void => {
        if (!this.Initialized) {
            return;
        }

        this.ClearLayer(RenderLayers.ConnectionsPathing);
        this.ClearLayer(RenderLayers.SkillIconsPathing);
        this.ClearLayer(RenderLayers.NodeMoveCompare);
        this.ClearLayer(RenderLayers.AtlasMasteryHighlight);
        this.ClearLayer(RenderLayers.Tooltip);
        this.ClearLayer(RenderLayers.TooltipCompare);

    }
    protected abstract SetupLayers(): void;
    protected abstract SetLayer(layer: RenderLayers, object: any): void;
    protected abstract ClearLayer(layer: RenderLayers): void;
}
