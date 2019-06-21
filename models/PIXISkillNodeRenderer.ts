import { ISkillNodeRenderer } from "./types/ISkillNodeRenderer";
import { SkillNode, SkillNodeStates } from './SkillNode'
import * as PIXI from "pixi.js";
import { SkillTreeEvents } from "./SkillTreeEvents";
import { SkillTreeAlternate } from "./SkillTreeAlternate";
import { utils } from "../app/utils";

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

    constructor(skillSprites: { [id: string]: Array<ISpriteSheet> }, skillTreeAlternate: SkillTreeAlternate, skillSpritesCompare: { [id: string]: Array<ISpriteSheet> } | undefined, zoomLevel: number = 3) {
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
        return `${node.id}_${node.alternate_ids}_${node.is(SkillNodeStates.Active)}_${source}`;
    }

    private GetNodeSpriteKey = (node: SkillNode, source: "Base" | "Compare"): string => {
        return `${node.icon}_${node.alternate_ids}_${node.not}_${node.m}_${node.ks}_${node.is(SkillNodeStates.Active)}_${source}`;
    }

    public CreateFrame = (node: SkillNode, others: SkillNode[]): PIXI.Sprite | null => {
        var asset = node.GetFrameAssetKey(others);
        if (asset === "") {
            return null;
        }

        let texture: PIXI.Texture | undefined = this.NodeFrameTextures[asset];
        if (texture === undefined) {
            texture = PIXI.Texture.from(asset);
            this.NodeFrameTextures[asset] = texture;
        }

        let frame = new PIXI.Sprite(texture);
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
        let drawType = node.is(SkillNodeStates.Active) ? "Active" : "Inactive";
        let spriteSheetKey: string = "";
        if (node.ks) {
            spriteSheetKey = `keystone${drawType}`;
        } else if (node.not) {
            spriteSheetKey = `notable${drawType}`;
        } else if (node.m) {
            spriteSheetKey = "mastery";
        } else {
            spriteSheetKey = `normal${drawType}`;
        }

        let texture: PIXI.Texture | undefined = this.NodeSpriteTextures[this.GetNodeSpriteKey(node, source)];
        let skillSprites = this.SkillSprites;
        let icon = node.icon;
        if (source === "Compare") {
            skillSprites = this.SkillSpritesCompare;
        } else if (node.alternate_ids !== undefined) {
            let alternate = node.alternate_ids.find(x => this.skillTreeAlternate.nodes[typeof x === "string" ? x : x.id].icon !== "");
            if (alternate !== undefined) {
                skillSprites = this.skillTreeAlternate.skillSprites;
                icon = this.skillTreeAlternate.nodes[typeof alternate === "string" ? alternate : alternate.id].icon;
            }
        }
        if (texture === undefined) {
            let spriteSheets = skillSprites[spriteSheetKey];
            if (spriteSheets === undefined || this.ZoomLevel >= spriteSheets.length) {
                if (skillSprites[drawType.toLowerCase()] && skillSprites[drawType.toLowerCase()].length - 1 <= this.ZoomLevel) {
                    spriteSheets = new Array<ISpriteSheet>();
                    for (var i = 0; i < skillSprites[drawType.toLowerCase()].length; i++) {
                        var old_style_sprites: ISpriteSheetOld = <any>skillSprites[drawType.toLowerCase()][i];
                        if (node.ks && old_style_sprites.keystoneCoords !== undefined) {
                            spriteSheets.push({ filename: old_style_sprites.filename, coords: old_style_sprites.keystoneCoords });
                        } else if (node.not && old_style_sprites.notableCoords !== undefined) {
                            spriteSheets.push({ filename: old_style_sprites.filename, coords: old_style_sprites.notableCoords });
                        } else {
                            spriteSheets.push({ filename: old_style_sprites.filename, coords: old_style_sprites.coords });
                        }
                    }
                }
                else {
                    throw Error(`Not sprite sheet for at zoomLevel: ${this.ZoomLevel}`);
                }
            }

            var spriteSheet = spriteSheets[this.ZoomLevel];
            if (!spriteSheet) {
                throw Error(`Sprite Sheet (${spriteSheetKey}) not found in SpriteSheets (${spriteSheets})`);
            }
            var spriteSheetTexture = PIXI.Texture.from(`${spriteSheet.filename}`);
            var coords = spriteSheet.coords[icon];
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

    private RebindNodeEvents = (node: SkillNode, sprite: PIXI.Sprite) => {
        sprite.removeAllListeners();
        sprite.name = `${node.id}`;

        if (!node.m && SkillTreeEvents.events["node"] !== undefined) {
            sprite.interactive = true;

            for (let event in SkillTreeEvents.events["node"]) {
                sprite.on(event, (interaction: PIXI.interaction.InteractionEvent) => {
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
        let sprite = this.NodeSprites[this.GetNodeKey(node, source)];
        if (sprite === undefined) {
            return null;
        }

        if (color === undefined) {
            color = 0x00FFCC;
        }

        let graphic = new PIXI.Graphics();
        graphic.beginFill(0x000000, 0);
        graphic.lineStyle(5, color);
        graphic.drawCircle(0, 0, Math.max(sprite.texture.width, sprite.texture.height) * .75 * (node.m ? .5 : 1));
        graphic.endFill();
        graphic.position.set(node.x, node.y);
        return graphic;
    }

    public CreateTooltip = (node: SkillNode, source: "Base" | "Compare") => {
        var tooltip: PIXI.Container | undefined = this.NodeTooltips[`${node.id}_${source}`];

        if (tooltip === undefined) {
            let title: PIXI.Text | null = node.dn.length > 0 ? new PIXI.Text(`${node.dn}`, { fill: 0xFFFFFF, fontSize: 18 }) : null;
            let stats: PIXI.Text | null = node.sd.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${node.sd.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0xFFFFFF, fontSize: 14 }) : null;
            let flavour: PIXI.Text | null = node.flavourText.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${node.flavourText.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0xAF6025, fontSize: 14 }) : null;
            let reminder: PIXI.Text | null = node.reminderText.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${node.reminderText.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0x808080, fontSize: 14 }) : null;

            if (node.alternate_ids !== undefined) {
                let text: string[] = [];
                for (let state of node.alternate_ids) {
                    let alternate = this.skillTreeAlternate.nodes[typeof state === "string" ? state : state.id];
                    for (let stat of alternate.stats) {
                        text.push(stat.text.replace(/#/g, stat.min === stat.max ? stat.min : `${stat.min}-${stat.max}`));
                    }
                }

                let state = node.alternate_ids.find(x => !this.skillTreeAlternate.nodes[typeof x === "string" ? x : x.id].isAddition)
                if (state !== undefined) {
                    let alternate = this.skillTreeAlternate.nodes[typeof state === "string" ? state : state.id];
                    title = alternate.name.length > 0 ? new PIXI.Text(`${alternate.name}`, { fill: 0xFFFFFF, fontSize: 18 }) : null;
                    stats = text.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${text.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0xFFFFFF, fontSize: 14 }) : null;
                    flavour = alternate.flavourText.filter(utils.NotNullOrWhiteSpace).length > 0 ? new PIXI.Text(`\n${alternate.flavourText.filter(utils.NotNullOrWhiteSpace).join('\n')}`, { fill: 0xAF6025, fontSize: 14 }) : null;
                    reminder = null;
                }
                else {
                    for (let stat of node.sd) {
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
            this.NodeTooltips[`${node.id}_${source}`];
        }

        return tooltip;
    }

    public DestroyTooltip = (node: SkillNode, source: "Base" | "Compare") => {
        var tooltip: PIXI.Container | undefined = this.NodeTooltips[`${node.id}_${source}`];
        if (tooltip === undefined) {
            return;
        }

        tooltip.destroy({ children: true, texture: true, baseTexture: true });
        this.NodeTooltips[`${node.id}_${source}`] = undefined;
    }

    public CreateConnections = (node: SkillNode, others: SkillNode[]) => {
        let container = new PIXI.Container();
        for (let other of others) {
            let connection = this.CreateConnection(node, other);
            if (connection !== null) {
                container.addChild(connection);
            }
        }
        return container;
    }

    public CreateConnection = (node: SkillNode, other: SkillNode): PIXI.Sprite | PIXI.Container | null => {
        if ((node.ascendancyName !== "" && other.ascendancyName === "") || (node.ascendancyName === "" && other.ascendancyName !== "")) {
            return null;
        }

        if (node.spc.length > 0 || other.spc.length > 0) {
            return null;
        }

        if ((node.is(SkillNodeStates.Pathing) || node.is(SkillNodeStates.Hovered)) && (!other.is(SkillNodeStates.Pathing) && !other.is(SkillNodeStates.Hovered) && !other.is(SkillNodeStates.Active))) {
            return null;
        }

        return node.g === other.g && node.o === other.o ? this.createArcConnection(node, other) : this.createLineConnection(node, other);
    }

    private createArcConnection = (node: SkillNode, other: SkillNode): PIXI.Container => {
        let startAngle = node.arc < other.arc ? node.arc : other.arc;
        let endAngle = node.arc < other.arc ? other.arc : node.arc;

        var diff = endAngle - startAngle;
        if (diff > Math.PI) {
            var c = 2 * Math.PI - diff;
            startAngle = endAngle;
            endAngle = startAngle + c;
        }
        startAngle -= Math.PI / 2;
        endAngle -= Math.PI / 2;

        let angle = endAngle - startAngle;
        let arcsNeeded = Math.ceil(angle / (Math.PI / 2));
        let initial_rotation = Math.PI / 2 + startAngle;
        let arcContainer = new PIXI.Container();

        for (var i = 0; i < arcsNeeded; ++i) {
            let mask = new PIXI.Graphics();
            mask.lineStyle(8, 0x00FF00);
            mask.arc(node.group.x * node.scale, node.group.y * node.scale, node.orbitRadii[node.o] * node.scale, startAngle, endAngle, false);
            arcContainer.addChild(mask);

            let asset = `Orbit${node.o}${node.GetConnectionType(other)}`;
            let texture: PIXI.Texture | undefined = this.NodeConnectionTextures[asset];
            if (texture === undefined) {
                texture = PIXI.Texture.from(asset);
                this.NodeConnectionTextures[asset] = texture;
            }

            let sprite = new PIXI.Sprite(texture);
            sprite.rotation = angle + initial_rotation;
            sprite.position.set(node.group.x * node.scale, node.group.y * node.scale);
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
        let asset = `LineConnector${node.GetConnectionType(other)}`;
        let texture: PIXI.Texture | undefined = this.NodeConnectionTextures[asset];
        if (texture === undefined) {
            texture = PIXI.Texture.from(asset);
            this.NodeConnectionTextures[asset] = texture;
        }

        let length = Math.hypot(node.x - other.x, node.y - other.y);
        let line: PIXI.Sprite;
        if (length <= texture.baseTexture.width) {
            var lineTexure = new PIXI.Texture(texture.baseTexture, new PIXI.Rectangle(0, 0, length, texture.baseTexture.height));
            line = new PIXI.Sprite(lineTexure);
        } else {
            line = PIXI.TilingSprite.from(asset, length, texture.baseTexture.height);
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