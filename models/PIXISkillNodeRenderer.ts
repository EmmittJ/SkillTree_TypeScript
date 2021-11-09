import { ISkillNodeRenderer } from "./types/ISkillNodeRenderer";
import { SkillNode, SkillNodeStates } from './SkillNode'
import * as PIXI from "pixi.js";
import { SkillTreeEvents } from "./SkillTreeEvents";
import { SkillTreeAlternate } from "./SkillTreeAlternate";
import { utils } from "../app/utils";
import { Sprite } from "pixi.js";

export class PIXISkillNodeRenderer implements ISkillNodeRenderer {
    private SkillSprites: { [id: string]: Array<ISpriteSheet> };
    private SkillSpritesCompare: { [id: string]: Array<ISpriteSheet> };
    private skillTreeAlternate: SkillTreeAlternate;
    private ZoomLevel: number;

    private NodeSprites: { [id: string]: PIXI.Sprite | undefined };
    private NodeSpriteTextures: { [id: string]: PIXI.Texture | undefined };
    private NodeFrameTextures: { [id: string]: PIXI.Texture | undefined };
    private NodeTooltips: { [id: string]: PIXI.Container | undefined };
    private NodeConnectionTextures: { [id: string]: PIXI.Texture | undefined };

    constructor(skillSprites: { [id: string]: Array<ISpriteSheet> }, skillTreeAlternate: SkillTreeAlternate, skillSpritesCompare: { [id: string]: Array<ISpriteSheet> } | undefined, zoomLevel = 3) {
        this.SkillSprites = skillSprites;
        this.SkillSpritesCompare = skillSpritesCompare || {};
        this.skillTreeAlternate = skillTreeAlternate;
        this.ZoomLevel = zoomLevel;

        this.NodeSprites = {};
        this.NodeSpriteTextures = {};
        this.NodeFrameTextures = {};
        this.NodeTooltips = {};
        this.NodeConnectionTextures = {};
    }

    private GetNodeKey = (node: SkillNode, source: "Base" | "Compare"): string => {
        return `${node.GetId()}_${node.alternateIds}_${node.is(SkillNodeStates.Active)}_${source}`;
    }

    private GetNodeSpriteKey = (node: SkillNode, source: "Base" | "Compare"): string => {
        return `${node.GetIcon()}_${node.alternateIds}_${node.isNotable}_${node.isMastery}_${node.isKeystone}_${node.is(SkillNodeStates.Active)}_${source}`;
    }

    public GetNodeSize = (node: SkillNode, source: "Base" | "Compare" = "Base"): { width: number; height: number } | null => {
        const sprite = this.NodeSprites[this.GetNodeKey(node, source)];
        if (sprite === undefined) {
            return null;
        }

        return { width: sprite.texture.width, height: sprite.texture.height };
    }

    public CreateFrame = (node: SkillNode, others: SkillNode[]): PIXI.Sprite | null => {
        const asset = node.GetFrameAssetKey(others);
        if (asset === null) {
            return null;
        }

        let texture: PIXI.Texture | undefined = this.NodeFrameTextures[asset];
        if (texture === undefined) {
            texture = PIXI.Texture.from(asset);
            if (!texture.valid) texture = PIXI.Texture.from(asset);
            this.NodeFrameTextures[asset] = texture;
        }

        const frame = new PIXI.Sprite(texture);
        frame.position.set(node.x, node.y);
        frame.anchor.set(.5);
        frame.hitArea = new PIXI.Circle(0, 0, Math.max(frame.texture.width, frame.texture.height) / 2);
        if (node.is(SkillNodeStates.Active | SkillNodeStates.Hovered)
            || (node.is(SkillNodeStates.Active | SkillNodeStates.Pathing) && (node.isMultipleChoice || node.isMultipleChoiceOption))) {
            frame.tint = 0xFF0000;
        }

        this.RebindNodeEvents(node, frame);
        return frame;
    }

    public CreateIcon = (node: SkillNode, source: "Base" | "Compare" = "Base"): PIXI.Sprite => {
        let texture: PIXI.Texture | undefined = this.NodeSpriteTextures[this.GetNodeSpriteKey(node, source)];

        if (texture === undefined) {
            let icon = node.GetIcon();
            if (source !== "Compare" && node.alternateIds !== undefined) {
                const alternate = node.alternateIds.find(x => this.skillTreeAlternate.nodes[typeof x === "string" ? x : x.id].icon !== "");
                if (alternate !== undefined) {
                    icon = this.skillTreeAlternate.nodes[typeof alternate === "string" ? alternate : alternate.id].icon;
                }
            }

            const spriteSheetKey = this.getSpriteSheetKey(node);
            const spriteSheet = this.getSpriteSheet(node, spriteSheetKey, source);
            const coords = spriteSheet.coords[icon];
            if (coords === undefined) {
                throw Error(`Sprite Sheet (${spriteSheetKey}) did not have coords for Node[${node.GetId()}]: ${icon} | ${node.activeIcon} | ${node.inactiveIcon}`);
            }

            const spriteSheetTexture = this.getSpriteSheetTexture(spriteSheet);
            texture = new PIXI.Texture(spriteSheetTexture.baseTexture, new PIXI.Rectangle(coords.x, coords.y, coords.w, coords.h));
            this.NodeSpriteTextures[this.GetNodeSpriteKey(node, source)] = texture;
        }

        let nodeSprite: PIXI.Sprite | undefined = this.NodeSprites[this.GetNodeKey(node, source)];
        if (nodeSprite === undefined) {
            nodeSprite = node.isAscendancyStart ? new PIXI.Sprite() : new PIXI.Sprite(texture);
            nodeSprite.position.set(node.x, node.y);
            nodeSprite.anchor.set(.5);
            nodeSprite.hitArea = new PIXI.Circle(0, 0, Math.max(nodeSprite.texture.width, nodeSprite.texture.height) / 2);
            this.NodeSprites[this.GetNodeKey(node, source)] = nodeSprite;
            this.RebindNodeEvents(node, nodeSprite);
        }

        return nodeSprite;
    }

    public CreateIconEffect = (node: SkillNode, source: "Base" | "Compare" = "Base"): PIXI.Sprite | null => {
        if (node.activeEffectImage === "" || !node.is(SkillNodeStates.Active)) {
            return null;
        }

        const effectSpriteSheet = this.getSpriteSheet(node, "masteryActiveEffect", source);
        const effectCoords = effectSpriteSheet.coords[node.activeEffectImage];
        const effectSpriteSheetTexture = this.getSpriteSheetTexture(effectSpriteSheet);
        const effectTexture = new PIXI.Texture(effectSpriteSheetTexture.baseTexture, new PIXI.Rectangle(effectCoords.x, effectCoords.y, effectCoords.w, effectCoords.h));

        const effectSprite = new PIXI.Sprite(effectTexture);
        effectSprite.position.set(node.x, node.y);
        effectSprite.anchor.set(.5);
        effectSprite.interactive = false;
        effectSprite.interactiveChildren = false;
        return effectSprite;
    }

    private getSpriteSheetKey = (node: SkillNode): string => {
        const drawType = node.is(SkillNodeStates.Active) ? "Active" : "Inactive";
        if (node.isKeystone) {
            return `keystone${drawType}`;
        } else if (node.isNotable) {
            return `notable${drawType}`;
        } else if (node.isMastery) {
            if (node.activeEffectImage !== "") {
                if (node.is(SkillNodeStates.Active) || node.is(SkillNodeStates.Hovered)) {
                    return "masteryActiveSelected";
                } else if (node.is(SkillNodeStates.Hovered) || node.is(SkillNodeStates.Pathing)) {
                    return "masteryConnected";
                } else {
                    return "masteryInactive";
                }
            } else {
                return "mastery";
            }
        } else {
            return `normal${drawType}`;
        }
    }

    private getSpriteSheet = (node: SkillNode, key: string, source: "Base" | "Compare" = "Base"): ISpriteSheet => {
        let skillSprites = this.SkillSprites;
        if (source === "Compare") {
            skillSprites = this.SkillSpritesCompare;
        } else if (node.alternateIds !== undefined) {
            const alternate = node.alternateIds.find(x => this.skillTreeAlternate.nodes[typeof x === "string" ? x : x.id].icon !== "");
            if (alternate !== undefined) {
                skillSprites = this.skillTreeAlternate.skillSprites;
            }
        }

        let spriteSheets = skillSprites[key];
        if (spriteSheets === undefined || this.ZoomLevel >= spriteSheets.length) {
            const drawType = node.is(SkillNodeStates.Active) ? "Active" : "Inactive";
            if (skillSprites[drawType.toLowerCase()] && skillSprites[drawType.toLowerCase()].length - 1 <= this.ZoomLevel) {
                spriteSheets = new Array<ISpriteSheet>();
                for (let i = 0; i < skillSprites[drawType.toLowerCase()].length; i++) {
                    const oldStyleSprites = skillSprites[drawType.toLowerCase()][i] as ISpriteSheetOld;
                    if (node.isKeystone && oldStyleSprites.keystoneCoords !== undefined) {
                        spriteSheets.push({ filename: oldStyleSprites.filename, coords: oldStyleSprites.keystoneCoords });
                    } else if (node.isNotable && oldStyleSprites.notableCoords !== undefined) {
                        spriteSheets.push({ filename: oldStyleSprites.filename, coords: oldStyleSprites.notableCoords });
                    } else {
                        spriteSheets.push({ filename: oldStyleSprites.filename, coords: oldStyleSprites.coords });
                    }
                }
            }
            else {
                throw Error(`No sprite sheet for at zoomLevel: ${this.ZoomLevel} for key: ${key}`);
            }
        }

        const spriteSheet = spriteSheets[this.ZoomLevel];
        if (!spriteSheet) {
            throw Error(`Sprite Sheet (${key}) not found in SpriteSheets (${spriteSheets})`);
        }
        return spriteSheet;
    }

    private getSpriteSheetTexture = (spriteSheet: ISpriteSheet): PIXI.Texture => {
        const filename = spriteSheet.filename.replace("PassiveSkillScreen", "").replace("https://web.poecdn.com/image/passive-skill/", "");
        return PIXI.Texture.from(filename);
    }

    private RebindNodeEvents = (node: SkillNode, sprite: PIXI.Sprite) => {
        sprite.removeAllListeners();
        sprite.name = `${node.GetId()}`;

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

    public CreateHighlight = (node: SkillNode, color: number | undefined = undefined, source: "Base" | "Compare" = "Base"): PIXI.Graphics | null => {
        if ((!node.is(SkillNodeStates.Highlighted)) && color === undefined) {
            return null;
        }
        const size = this.GetNodeSize(node, source);
        if (size === null) {
            return null;
        }

        if (color === undefined) {
            color = 0x00FFCC;
        }

        const graphic = new PIXI.Graphics();
        graphic.beginFill(0x000000, 0);
        graphic.lineStyle(5, color);
        graphic.drawCircle(0, 0, Math.max(size.width, size.height) * .75 * (node.isMastery ? .5 : 1));
        graphic.endFill();
        graphic.position.set(node.x, node.y);

        graphic.interactive = false;
        graphic.interactiveChildren = false;
        graphic.containerUpdateTransform = () => { };

        return graphic;
    }

    public CreateTooltip = (node: SkillNode, source: "Base" | "Compare") => {
        let tooltip: PIXI.Container | undefined = this.NodeTooltips[`${node.GetId()}_${source}`];

        if (tooltip === undefined) {
            let title: PIXI.Text | null = node.name.length > 0 ? new PIXI.Text(`${node.name}`, { fill: 0xFFFFFF, fontSize: 18 }) : null;
            let stats: PIXI.Text | null = node.stats.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${node.stats.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0xFFFFFF, fontSize: 14 }) : null;
            let flavour: PIXI.Text | null = node.flavourText.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${node.flavourText.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0xAF6025, fontSize: 14 }) : null;
            let reminder: PIXI.Text | null = node.reminderText.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${node.reminderText.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0x808080, fontSize: 14 }) : null;

            if (node.alternateIds !== undefined) {
                const text: string[] = [];
                for (const state of node.alternateIds) {
                    const alternate = this.skillTreeAlternate.nodes[typeof state === "string" ? state : state.id];
                    for (const stat of alternate.stats) {
                        text.push(stat.text.replace(/#/g, stat.min === stat.max ? stat.min : `${stat.min}-${stat.max}`));
                    }
                }

                const state = node.alternateIds.find(x => !this.skillTreeAlternate.nodes[typeof x === "string" ? x : x.id].isAddition)
                if (state !== undefined) {
                    const alternate = this.skillTreeAlternate.nodes[typeof state === "string" ? state : state.id];
                    title = alternate.name.length > 0 ? new PIXI.Text(`${alternate.name}`, { fill: 0xFFFFFF, fontSize: 18 }) : null;
                    stats = text.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${text.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0xFFFFFF, fontSize: 14 }) : null;
                    flavour = alternate.flavourText.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${alternate.flavourText.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0xAF6025, fontSize: 14 }) : null;
                    reminder = null;
                }
                else {
                    for (const stat of node.stats) {
                        text.push(stat);
                    }
                    stats = text.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${text.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0xFFFFFF, fontSize: 14 }) : null;
                }
            }

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
            this.NodeTooltips[`${node.GetId()}_${source}`] = tooltip;
        }

        return tooltip;
    }

    public DestroyTooltip = (node: SkillNode, source: "Base" | "Compare") => {
        const tooltip: PIXI.Container | undefined = this.NodeTooltips[`${node.GetId()}_${source}`];
        if (tooltip === undefined) {
            return;
        }

        tooltip.destroy({ children: true, texture: true, baseTexture: true });
        this.NodeTooltips[`${node.GetId()}_${source}`] = undefined;
    }

    public CreateConnections = (node: SkillNode, others: SkillNode[]) => {
        const container = new PIXI.Container();
        for (const other of others) {
            const connection = this.CreateConnection(node, other);
            if (connection !== null) {
                container.addChild(connection);
            }
        }

        container.interactive = false;
        container.interactiveChildren = false;
        container.containerUpdateTransform = () => { };
        return container;
    }

    public CreateConnection = (node: SkillNode, other: SkillNode): PIXI.Sprite | PIXI.Container | null => {
        if ((node.ascendancyName !== "" && other.ascendancyName === "") || (node.ascendancyName === "" && other.ascendancyName !== "")) {
            return null;
        }

        if (node.classStartIndex !== undefined || other.classStartIndex !== undefined) {
            return null;
        }

        if ((node.is(SkillNodeStates.Pathing) || node.is(SkillNodeStates.Hovered)) && (!other.is(SkillNodeStates.Pathing) && !other.is(SkillNodeStates.Hovered) && !other.is(SkillNodeStates.Active))) {
            return null;
        }

        if (node.isMastery || other.isMastery) {
            return null;
        }

        const container = node.group === other.group && node.orbit === other.orbit ? this.createArcConnection(node, other) : this.createLineConnection(node, other);
        container.interactive = false;
        container.interactiveChildren = false;
        container.containerUpdateTransform = () => { };
        return container;
    }

    private createArcConnection = (node: SkillNode, other: SkillNode): PIXI.Container => {
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

        for (let i = 0; i < arcsNeeded; ++i) {
            if (node.nodeGroup === undefined) {
                continue
            }
            const mask = new PIXI.Graphics();
            mask.lineStyle(50 * node.scale, 0x00FF00);
            mask.arc(node.nodeGroup.x * node.scale, node.nodeGroup.y * node.scale, node.orbitRadii[node.orbit] * node.scale, startAngle, endAngle, false);
            arcContainer.addChild(mask);

            const asset = `Orbit${node.orbit}${node.GetConnectionType(other)}`;
            let texture: PIXI.Texture | undefined = this.NodeConnectionTextures[asset];
            if (texture === undefined) {
                texture = PIXI.Texture.from(asset);
                this.NodeConnectionTextures[asset] = texture;
            }

            const sprite = new PIXI.Sprite(texture);
            sprite.rotation = angle + initialRotation;
            sprite.position.set(node.nodeGroup.x * node.scale, node.nodeGroup.y * node.scale);
            sprite.anchor.set(1);
            sprite.mask = mask;
            arcContainer.addChild(sprite);

            if (node.is(SkillNodeStates.Active | SkillNodeStates.Pathing) && other.is(SkillNodeStates.Active | SkillNodeStates.Pathing)) {
                sprite.tint = 0xFF0000;
            }

            if (angle < Math.PI / 2) {
                continue
            }
            angle -= Math.PI / 2
        }

        return arcContainer;
    }

    private createLineConnection = (node: SkillNode, other: SkillNode): PIXI.Sprite => {
        const asset = `LineConnector${node.GetConnectionType(other)}`;
        let texture: PIXI.Texture | undefined = this.NodeConnectionTextures[asset];
        if (texture === undefined) {
            texture = PIXI.Texture.from(asset);
            this.NodeConnectionTextures[asset] = texture;
        }

        const length = Math.hypot(node.x - other.x, node.y - other.y);
        let line: PIXI.Sprite;
        if (length <= texture.baseTexture.width) {
            const lineTexure = new PIXI.Texture(texture.baseTexture, new PIXI.Rectangle(0, 0, length, texture.baseTexture.height));
            line = new PIXI.Sprite(lineTexure);
        } else {
            line = new PIXI.TilingSprite(texture, length, texture.baseTexture.height);
        }
        line.anchor.set(0, 0.5);
        line.position.set(node.x, node.y);
        line.rotation = Math.atan2(other.y - node.y, other.x - node.x);

        if (node.is(SkillNodeStates.Active | SkillNodeStates.Pathing) && other.is(SkillNodeStates.Active | SkillNodeStates.Pathing)) {
            line.tint = 0xFF0000;
        }
        return line;
    }
}