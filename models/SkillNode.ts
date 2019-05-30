import { SkillTreeUtilities } from "./SkillTreeUtilities";
import { SkillTreeEvents } from "./SkillTreeEvents";
import * as PIXI from "pixi.js";

export class SkillNode implements ISkillNode {
    id: number;
    dn: string;
    icon: string;
    ks: boolean;
    not: boolean;
    m: boolean;
    isJewelSocket: boolean;
    isMultipleChoice: boolean;
    isMultipleChoiceOption: boolean;
    passivePointsGranted: number;
    ascendancyName: string;
    isAscendancyStart: boolean;
    spc: number[];
    sd: string[];
    reminderText: string[];
    flavourText: string[];
    g: number;
    o: number;
    oidx: number;
    da: number;
    ia: number;
    sa: number;
    out: number[];
    in: number[];
    state: SkillNodeStates;

    skillTreeUtilities: SkillTreeUtilities;
    group: IGroup;
    orbitRadii: Array<number>;
    skillsPerOrbit: Array<number>;
    scale: number;
    arc: number;
    x: number;
    y: number;
    hoverText: string | null = null;

    constructor(node: ISkillNode, group: IGroup, orbitRadii: Array<number>, skillsPerOrbit: Array<number>, scale: number, skillTreeUtilities: SkillTreeUtilities) {
        this.skillTreeUtilities = skillTreeUtilities;
        this.id = node.id || -1;
        this.dn = node.dn || "";
        this.icon = node.icon || "";
        this.ks = node.ks || false;
        this.not = node.not || false;
        this.m = node.m || false;
        this.isJewelSocket = node.isJewelSocket || false;
        this.isMultipleChoice = node.isMultipleChoice || false;
        this.isMultipleChoiceOption = node.isMultipleChoiceOption || false;
        this.passivePointsGranted = node.passivePointsGranted || 0;
        this.ascendancyName = node.ascendancyName || "";
        this.isAscendancyStart = node.isAscendancyStart || false;
        this.spc = node.spc || [];
        this.sd = node.sd || [];
        this.reminderText = node.reminderText || [];
        this.flavourText = node.flavourText || [];
        this.g = node.g || 0;
        this.o = node.o || 0;
        this.oidx = node.oidx || 0;
        this.da = node.da || 0;
        this.ia = node.ia || 0;
        this.sa = node.sa || 0;
        this.out = node.out || [];
        this.in = node.in || [];
        this.state = SkillNodeStates.None;

        this.group = group;
        this.orbitRadii = orbitRadii;
        this.skillsPerOrbit = skillsPerOrbit;
        this.scale = scale;
        this.arc = this.getArc(this.oidx);
        this.x = this.getX(this.arc);
        this.y = this.getY(this.arc);

        if (this.passivePointsGranted > 0) {
            this.sd.push(`Grants ${this.passivePointsGranted} Passive Skill Point${this.passivePointsGranted > 1 ? 's' : ''}`);
        }

        SkillTreeEvents.subscribe("node", this.rebindNodeEvents);
    }

    private getArc = (oidx: number): number => this.skillsPerOrbit.length > this.o ? 2 * Math.PI * oidx / this.skillsPerOrbit[this.o] : 0;
    private getX = (arc: number): number => this.orbitRadii.length > this.o ? Math.ceil((this.group.x * this.scale)) - Math.ceil(this.orbitRadii[this.o] * this.scale) * Math.sin(-arc) : 0;
    private getY = (arc: number): number => this.orbitRadii.length > this.o ? Math.ceil((this.group.y * this.scale)) - Math.ceil(this.orbitRadii[this.o] * this.scale) * Math.cos(-arc) : 0;

    public is = (test: SkillNodeStates) => {
        return (this.state & test) === test;
    }

    public add = (state: SkillNodeStates) => {
        this.state |= state;
    }

    public remove = (state: SkillNodeStates) => {
        this.state &= ~state;
    }

    public createNodeHighlight = (color: number | undefined = undefined): PIXI.Graphics | null => {
        if ((!this.is(SkillNodeStates.Highlighted) || this.nodeFrame === null) && color === undefined) {
            return null;
        }

        if (color === undefined) {
            color = 0x00FFCC;
        }

        let graphic = new PIXI.Graphics();
        graphic.beginFill(0x000000, 0);
        graphic.lineStyle(5, color);
        graphic.drawCircle(0, 0, Math.max(this.nodeSprite.texture.width, this.nodeSprite.texture.height) * .75 * (this.m ? .5 : 1));
        graphic.endFill();
        graphic.position.set(this.x, this.y);
        return graphic;
    }

    private nodeFrame: PIXI.Sprite | null = new PIXI.Sprite();
    public createNodeFrame = (): PIXI.Sprite | null => {
        let drawType: "Allocated" | "CanAllocate" | "Unallocated" = "Unallocated";
        if (this.is(SkillNodeStates.Active) || this.is(SkillNodeStates.Hovered)) {
            drawType = "Allocated";
        } else {
            if (this.skillTreeUtilities.isAnyActive(this.out)) {
                drawType = "CanAllocate";
            }
        }
        let assetKey = "";
        if (this.isAscendancyStart) {
            assetKey = "PassiveSkillScreenAscendancyMiddle";
        } else if (this.isJewelSocket) {
            assetKey = `JewelFrame${drawType}`;
        } else if (this.ks) {
            assetKey = `KeystoneFrame${drawType}`;
        } else if (this.not) {
            assetKey = this.ascendancyName === ""
                ? `NotableFrame${drawType}`
                : `PassiveSkillScreenAscendancyFrameLarge${drawType === "Unallocated" ? "Normal" : drawType}`;;
        } else if (this.m) {
            if (this.nodeFrame !== null) {
                this.nodeFrame.destroy();
                this.nodeFrame = null;
            }
            return this.nodeFrame;
        } else {
            switch (drawType) {
                case "Unallocated":
                    assetKey = this.ascendancyName === ""
                        ? "PSSkillFrame"
                        : "PassiveSkillScreenAscendancyFrameSmallNormal";
                    break;
                case "CanAllocate":
                    assetKey = this.ascendancyName === ""
                        ? "PSSkillFrameHighlighted"
                        : "PassiveSkillScreenAscendancyFrameSmallCanAllocate";
                    break;
                case "Allocated":
                    assetKey = this.ascendancyName === ""
                        ? "PSSkillFrameActive"
                        : "PassiveSkillScreenAscendancyFrameSmallAllocated";
                    break;
            }
        }

        if (assetKey !== "") {
            this.nodeFrame = PIXI.Sprite.from(`${assetKey}`);
            this.nodeFrame.position.set(this.x, this.y);
            this.nodeFrame.anchor.set(.5);
            this.nodeFrame.hitArea = new PIXI.Circle(0, 0, Math.max(this.nodeFrame.texture.width, this.nodeFrame.texture.height) / 2);
            if (this.is(SkillNodeStates.Active | SkillNodeStates.Hovered)
                || (this.is(SkillNodeStates.Active | SkillNodeStates.Pathing) && (this.isMultipleChoice || this.isMultipleChoiceOption))) {
                this.nodeFrame.tint = 0xFF0000;
            }

            //if (this.hoverText) {
            //    let text = new PIXI.Text(this.hoverText, { fill: 0xFFFFFF, align: 'center', fontSize: 20, stroke: 0x000000, strokeThickness: 2 });
            //    text.anchor.set(.5);
            //    this.nodeFrame.addChild(text);
            //}
        }


        this.rebindNodeEvents();

        return this.nodeFrame;
    }

    private nodeSprite: PIXI.Sprite = new PIXI.Sprite();
    public createNodeGraphic = (skillSprites: { [id: string]: Array<ISpriteSheet> }, zoomLevel: number = 3): PIXI.Sprite => {
        let drawType = this.is(SkillNodeStates.Active) ? "Active" : "Inactive";
        let spriteSheetKey: string = "";
        if (this.ks) {
            spriteSheetKey = `keystone${drawType}`;
        } else if (this.not) {
            spriteSheetKey = `notable${drawType}`;
        } else if (this.m) {
            spriteSheetKey = "mastery";
        } else {
            spriteSheetKey = `normal${drawType}`;
        }

        let spriteSheets = skillSprites[spriteSheetKey];
        if (spriteSheets === undefined || zoomLevel >= spriteSheets.length) {
            if (skillSprites[drawType.toLowerCase()] && skillSprites[drawType.toLowerCase()].length - 1 <= zoomLevel) {
                spriteSheets = new Array<ISpriteSheet>();
                for (var i = 0; i < skillSprites[drawType.toLowerCase()].length; i++) {
                    var old_style_sprites: ISpriteSheetOld = <any>skillSprites[drawType.toLowerCase()][i];
                    if (this.ks && old_style_sprites.keystoneCoords !== undefined) {
                        spriteSheets.push({ filename: old_style_sprites.filename, coords: old_style_sprites.keystoneCoords });
                    } else if (this.not && old_style_sprites.notableCoords !== undefined) {
                        spriteSheets.push({ filename: old_style_sprites.filename, coords: old_style_sprites.notableCoords });
                    } else {
                        spriteSheets.push({ filename: old_style_sprites.filename, coords: old_style_sprites.coords });
                    }
                }
            }
            else {
                throw Error(`Not sprite sheet for at zoomLevel: ${zoomLevel}`);
            }
        }

        var spriteSheet = spriteSheets[zoomLevel];
        if (!spriteSheet) {
            throw Error(`Sprite Sheet (${spriteSheetKey}) not found in SpriteSheets (${spriteSheets})`);
        }
        var spriteSheetTexture = PIXI.Texture.from(`${spriteSheet.filename}`);
        var coords = spriteSheet.coords[this.icon];
        var spriteTexture = new PIXI.Texture(spriteSheetTexture.baseTexture, new PIXI.Rectangle(coords.x, coords.y, coords.w, coords.h));
        this.nodeSprite = this.isAscendancyStart ? new PIXI.Sprite() : new PIXI.Sprite(spriteTexture);
        this.nodeSprite.position.set(this.x, this.y);
        this.nodeSprite.anchor.set(.5);
        this.nodeSprite.hitArea = new PIXI.Circle(0, 0, Math.max(this.nodeSprite.texture.width, this.nodeSprite.texture.height) / 2);
        this.rebindNodeEvents();

        return this.nodeSprite;
    }

    public rebindNodeEvents = () => {
        this.nodeSprite.removeAllListeners();
        if (this.nodeFrame !== null) {
            this.nodeFrame.removeAllListeners();
        }

        if (!this.m && SkillTreeEvents.events["node"] !== undefined) {
            this.nodeSprite.interactive = true;
            if (this.nodeFrame !== null) {
                this.nodeFrame.interactive = true;
            }
            for (let event in SkillTreeEvents.events["node"]) {
                this.nodeSprite.on(event, () => SkillTreeEvents.fire("node", event, this));
                if (this.nodeFrame !== null) {
                    this.nodeFrame.on(event, () => SkillTreeEvents.fire("node", event, this));
                }
            }
        }
    }

    private tooltipTimeout: number | null = null;
    private PIXI_tooltip: PIXI.Container | null = null;
    public createTooltipText = (): PIXI.Container => {
        if (this.tooltipTimeout !== null) {
            clearTimeout(this.tooltipTimeout);
        }
        if (this.PIXI_tooltip !== null) {
            return this.PIXI_tooltip;
        }

        let title: PIXI.Text | null = this.dn.length > 0 ? new PIXI.Text(`${this.dn}`, { fill: 0xFFFFFF, fontSize: 18 }) : null;
        let stats: PIXI.Text | null = this.sd.length > 0 ? new PIXI.Text(`\n${this.sd.join('\n')}`, { fill: 0xFFFFFF, fontSize: 14 }) : null;
        let flavour: PIXI.Text | null = this.flavourText.length > 0 ? new PIXI.Text(`\n${this.flavourText.join('\n')}`, { fill: 0xAF6025, fontSize: 14 }) : null;
        let reminder: PIXI.Text | null = this.reminderText.length > 0 ? new PIXI.Text(`\n${this.reminderText.join('\n')}`, { fill: 0x808080, fontSize: 14 }) : null;

        this.PIXI_tooltip = new PIXI.Container();
        this.PIXI_tooltip.position.set(0, 0);
        let height = 0;
        if (title !== null) {
            this.PIXI_tooltip.addChild(title);
            title.position.set(0, height);
            height += title.height;
        }

        if (stats !== null) {
            this.PIXI_tooltip.addChild(stats);
            stats.position.set(0, height);
            height += stats.height;
        }

        if (flavour !== null) {
            this.PIXI_tooltip.addChild(flavour);
            flavour.position.set(0, height);
            height += flavour.height;
        }

        if (reminder !== null) {
            this.PIXI_tooltip.addChild(reminder);
            reminder.position.set(0, height);
            height += reminder.height;
        }

        return this.PIXI_tooltip;
    }

    public destroyTooltip = () => {
        this.tooltipTimeout = setTimeout(() => {
            this.tooltipTimeout = null;
            if (this.PIXI_tooltip !== null) {
                this.PIXI_tooltip.destroy({ children: true, texture: true, baseTexture: true });
                this.PIXI_tooltip = null
            }
        }, 5000);
    }

    public createConnections = (others: Array<SkillNode>): PIXI.Container => {
        let container = new PIXI.Container();
        for (let other of others) {
            let connection = this.createConnection(other);
            if (connection) {
                container.addChild(connection);
            }
        }
        return container;
    }

    private createConnection = (other: SkillNode): PIXI.Sprite | PIXI.Container | null => {
        if ((this.ascendancyName !== "" && other.ascendancyName === "") || (this.ascendancyName === "" && other.ascendancyName !== "")) {
            return null;
        }
        if (this.spc.length > 0 || other.spc.length > 0) {
            return null;
        }
        if ((this.is(SkillNodeStates.Pathing) || this.is(SkillNodeStates.Hovered)) && (!other.is(SkillNodeStates.Pathing) && !other.is(SkillNodeStates.Hovered) && !other.is(SkillNodeStates.Active))) {
            return null;
        }
        if (this.g === other.g && this.o === other.o) {
            return this.createArcConnection(other);
        } else {
            return this.createLineConnection(other);
        }
    }

    public createArcConnection = (other: SkillNode): PIXI.Container => {
        let startAngle = this.arc < other.arc ? this.arc : other.arc;
        let endAngle = this.arc < other.arc ? other.arc : this.arc;

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
            mask.arc(this.group.x * this.scale, this.group.y * this.scale, this.orbitRadii[this.o] * this.scale, startAngle, endAngle, false);
            arcContainer.addChild(mask);

            let texture = PIXI.Texture.from(`Orbit${this.o}${this.getConnectionType(other)}`);
            let sprite = new PIXI.Sprite(texture);
            sprite.rotation = angle + initial_rotation;
            sprite.position.set(this.group.x * this.scale, this.group.y * this.scale);
            sprite.anchor.set(1);
            sprite.mask = mask;
            arcContainer.addChild(sprite);

            if (this.is(SkillNodeStates.Active | SkillNodeStates.Pathing) && other.is(SkillNodeStates.Active | SkillNodeStates.Pathing)) {
                sprite.tint = 0xFF0000;
            }

            if (angle < Math.PI / 2) {
                continue
            }
            angle -= Math.PI / 2
        }

        return arcContainer;
    }

    private createLineConnection = (other: SkillNode): PIXI.Sprite => {
        let assetName = `LineConnector${this.getConnectionType(other)}`;
        let texture = PIXI.Texture.from(assetName);
        let length = Math.hypot(this.x - other.x, this.y - other.y);
        let line: PIXI.Sprite;
        if (length <= texture.baseTexture.width) {
            var lineTexure = new PIXI.Texture(texture.baseTexture, new PIXI.Rectangle(0, 0, length, texture.baseTexture.height));
            line = new PIXI.Sprite(lineTexure);
        } else {
            line = PIXI.TilingSprite.from(assetName, length, texture.baseTexture.height);
        }
        line.anchor.set(0, 0.5);
        line.position.set(this.x, this.y);
        line.rotation = Math.atan2(other.y - this.y, other.x - this.x);

        if (this.is(SkillNodeStates.Active | SkillNodeStates.Pathing) && other.is(SkillNodeStates.Active | SkillNodeStates.Pathing)) {
            line.tint = 0xFF0000;
        }
        return line;
    }

    private getConnectionType = (other: SkillNode): "Active" | "Intermediate" | "Normal" => {
        return this.is(SkillNodeStates.Active) && other.is(SkillNodeStates.Active) ? "Active" : (this.is(SkillNodeStates.Active) || other.is(SkillNodeStates.Active) || (this.is(SkillNodeStates.Pathing) && other.is(SkillNodeStates.Pathing)) ? "Intermediate" : "Normal");
    }

    private createOrbitLocationsText = (): Array<PIXI.Container> => {
        let graphics = new Array<PIXI.Container>();
        for (let i = 0; i < this.skillsPerOrbit[this.o]; i++) {
            graphics.push(this.createTextAtOidx(i));
        }
        return graphics;
    }

    private createTextAtOidx = (oidx: number, text: string = ""): PIXI.Container => {
        if (text === "") {
            text = `${oidx}: ${this.g}`;
        }
        let text_graphic = new PIXI.Text(text, { fill: 0xFFFFFF, align: 'center', fontSize: 24 });
        let arc = this.getArc(oidx);
        text_graphic.x = this.getX(arc);
        text_graphic.y = this.getY(arc);
        text_graphic.anchor.set(.5);
        return text_graphic;
    }

}

export enum SkillNodeStates {
    None = 0,
    Active = 1 << 0,
    Hovered = 1 << 1,
    Pathing = 1 << 2,
    Highlighted = 1 << 3,
    Compared = 1 << 4
}
