import { SkillTreeUtilities } from "./SkillTreeUtilities";
import { SkillTreeEvents } from "./SkillTreeEvents";
import { SkillTreeCodec } from "./SkillTreeCodec";

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

    public createNodeHighlight = (): PIXI.Graphics | null => {
        if (!this.is(SkillNodeStates.Highlighted) || this.nodeFrame === null) {
            return null;
        }

        let graphic = new PIXI.Graphics();
        graphic.beginFill(0x000000, 0);
        graphic.lineStyle(5, 0x00FFCC);
        graphic.drawCircle(0, 0, Math.max(this.nodeSprite.texture.width, this.nodeSprite.texture.height) * 1.5 / 2);
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
            this.nodeFrame = PIXI.Sprite.from(`data/assets/${assetKey}.png`);
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
        if (zoomLevel >= spriteSheets.length) {
            throw Error(`Not sprite sheet for at zoomLevel: ${zoomLevel}`);
        }
        var spriteSheet = spriteSheets[zoomLevel];
        if (!spriteSheet) {
            throw Error(`Sprite Sheet (${spriteSheetKey}) not found in SpriteSheets (${spriteSheets})`);
        }
        var spriteSheetTexture = PIXI.Texture.from(`data/assets/${spriteSheet.filename}`);
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
                this.PIXI_tooltip.destroy();
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

    public createConnection = (other: SkillNode): PIXI.Sprite | null => {
        if ((this.ascendancyName !== "" && other.ascendancyName === "") || (this.ascendancyName === "" && other.ascendancyName !== "")) {
            return null;
        }
        if (this.spc.length > 0 || other.spc.length > 0) {
            return null;
        }
        if ((this.is(SkillNodeStates.Pathing) || this.is(SkillNodeStates.Hovered)) && (!other.is(SkillNodeStates.Pathing) && !other.is(SkillNodeStates.Hovered) && !other.is(SkillNodeStates.Active) )) {
            return null;
        }
        if (this.g === other.g && this.o === other.o) {
            return this.createArcConnection(other);
        } else {
            return this.createLineConnection(other);
        }
    }

    private createArcConnection = (other: SkillNode): PIXI.Sprite => {
        let connectionType = this.getConnectionType(other);
        var oidx = this.getMidpoint(this, other, this.skillsPerOrbit);
        let arc = this.getArc(oidx);
        let x = this.getX(arc);
        let y = this.getY(arc);
        let arc_offset = 0.3125;
        switch (connectionType) {
            case "Active":
                switch (this.o) {
                    case 1:
                        arc_offset = .42;
                        break;
                    case 2:
                        arc_offset = .37;
                        break;
                    case 3:
                        arc_offset = .34;
                        break;
                    case 4:
                        arc_offset = .33;
                        break;
                    default:
                        break;
                }
                break;
            case "Intermediate":
            case "Normal":
                break;
        }

        //Calculate the bounds of the arc
        let texture = PIXI.Texture.from(`data/assets/Orbit${this.o}${connectionType}.png`);
        let length = Math.hypot(this.x - x, this.y - y) * 2;
        let rectw = Math.min(length * .75, texture.baseTexture.width);
        let recth = Math.min(length * .75, texture.baseTexture.height);
        let rect = new PIXI.Rectangle((texture.baseTexture.width - rectw) * arc_offset, (texture.baseTexture.height - recth) * arc_offset, rectw, recth);

        //Apply the bounds of the arc
        var arcTexture = new PIXI.Texture(texture.baseTexture, rect);
        let arcGraphic = new PIXI.Sprite(arcTexture);
        arcGraphic.position.set(x, y);
        arcGraphic.rotation = arc + Math.PI / 4;
        arcGraphic.anchor.set(arc_offset);
        if (this.is(SkillNodeStates.Active | SkillNodeStates.Pathing) && other.is(SkillNodeStates.Active | SkillNodeStates.Pathing)) {
            arcGraphic.tint = 0xFF0000;
        }
        return arcGraphic;
    }

    private createLineConnection = (other: SkillNode): PIXI.Sprite => {
        let assetName = `data/assets/LineConnector${this.getConnectionType(other)}.png`;
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

    private getMidpoint = (n1: SkillNode, n2: SkillNode, skillsPerOrbit: Array<number>): number => {
        /* We nee to figure out what direction we are going, so we know where the midpoint needs to end up.
         * Basically, if we are going clockwise and this node is greater than the out node, add a full orbit.
         * orbit 11 -> orbit 0: (11 + 0) / 2 = 5.5, but we are on the wrong side of the circle.
         * (11 + 0 + 12) / 2 = 11.5, this is the correct side.
         * same goes for:
         * orbit 11 <- orbit 2: (11 + 2) / 2 = 6.5, but, again, wrong side
         * (11 + 2 + 12) / 2 = 13, oh no... well, we subtract 12 (a full orbit)
         * 13 - 12 = 1, this is correct!
         */
        let oidx = n1.oidx + n2.oidx;
        if ((!n1.isCounterclockwise(n2.arc - n1.arc) && n1.oidx > n2.oidx)
            || (n1.isCounterclockwise(n2.arc - n1.arc) && n1.oidx < n2.oidx)) {
            oidx += skillsPerOrbit[n1.o]
        }
        oidx /= 2;
        while (oidx >= skillsPerOrbit[n1.o]) {
            oidx -= skillsPerOrbit[n1.o];
        }
        return oidx;
    }

    private isCounterclockwise = (angle: number): boolean => {
        while (angle <= -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;
        return angle < 0;
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
    Highlighted = 1 << 3
}
