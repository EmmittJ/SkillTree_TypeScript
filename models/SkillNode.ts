import { Container, Point, Rectangle } from "pixi.js";

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
    g: number;
    o: number;
    oidx: number;
    da: number;
    ia: number;
    sa: number;
    out: number[];
    in: number[];

    orbitRadii: Array<number>;
    skillsPerOrbit: Array<number>;
    group: IGroup;
    arc: number;
    x: number;
    y: number;
    private downScale: number = 2.6;

    constructor(node: ISkillNode, group: IGroup, orbitRadii: Array<number>, skillsPerOrbit: Array<number>) {
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
        this.g = node.g || 0;
        this.o = node.o || 0;
        this.oidx = node.oidx || 0;
        this.da = node.da || 0;
        this.ia = node.ia || 0;
        this.sa = node.sa || 0;
        this.out = node.out || [];
        this.in = node.in || [];

        this.group = group;
        this.orbitRadii = orbitRadii;
        this.skillsPerOrbit = skillsPerOrbit;
        this.arc = this.getArc(this.oidx);
        this.x = this.getX(this.arc);
        this.y = this.getY(this.arc);
    }

    private getArc = (oidx: number): number => this.skillsPerOrbit.length > this.o ? 2 * Math.PI * oidx / this.skillsPerOrbit[this.o] : 0;
    private getX = (arc: number): number => this.orbitRadii.length > this.o ? (this.group.x - this.orbitRadii[this.o] * Math.sin(-arc)) / this.downScale : 0;
    private getY = (arc: number): number => this.orbitRadii.length > this.o ? (this.group.y - this.orbitRadii[this.o] * Math.cos(-arc)) / this.downScale : 0;

    public getNodeFrame = (drawType: "Allocated" | "CanAllocate" | "Unallocated"): PIXI.Container => {
        var node_frame = new PIXI.Sprite();
        let assetKey = "";
        if (this.isAscendancyStart) {
            assetKey = "PassiveSkillScreenAscendancyMiddle";
        } else if (this.isJewelSocket) {
            assetKey = `JewelFrame${drawType}`;
        }else if (this.ks) {
            assetKey = `KeystoneFrame${drawType}`;
        } else if (this.not) {
            assetKey = this.ascendancyName === ""
                ? `NotableFrame${drawType}`
                : `PassiveSkillScreenAscendancyFrameLarge${drawType === "Unallocated" ? "Normal" : drawType}`;;
        } else if (this.m) {
            return node_frame;
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

        node_frame = PIXI.Sprite.fromImage(`data/assets/${assetKey}.png`);
        node_frame.x = this.x;
        node_frame.y = this.y;
        node_frame.anchor.set(.5);
        return node_frame;
    }

    public getGraphic = (skillSprites: { [id: string]: Array<ISpriteSheet> }, drawType: "Inactive" | "Active" = "Inactive", zoomLevel: number = 3): PIXI.Container => {
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
        var spriteSheetTexture = PIXI.BaseTexture.fromImage(`data/assets/${spriteSheet.filename}`);
        var coords = spriteSheet.coords[this.icon];
        var spriteTexture = new PIXI.Texture(spriteSheetTexture, new Rectangle(coords.x, coords.y, coords.w, coords.h));
        var node_graphic = new PIXI.Sprite(spriteTexture);
        node_graphic.x = this.x;
        node_graphic.y = this.y;
        node_graphic.anchor.set(.5);

        return node_graphic;
    }

    public getGraphicConnectionsTo = (nodes: Array<SkillNode>, connectionType: "Normal" | "Intermediate" | "Active" = "Normal"): Array<Container> => {
        let graphics: Array<Container> = new Array<Container>();
        for (let node of nodes) {
            if (node.isAscendancyStart || (this.ascendancyName !== "" && node.ascendancyName === "") || (this.ascendancyName === "" && node.ascendancyName !== "")) {
                continue;
            }

            if (this.g === node.g && this.o === node.o) {
                var oidx = this.getOidxBetween(this, node, this.skillsPerOrbit);
                let arc = this.getArc(oidx);
                let x = this.getX(arc);
                let y = this.getY(arc);

                // Create a mask in order to crop out unwanted arc overlap
                let arc_graphic = new PIXI.Graphics();
                arc_graphic.moveTo(this.x, this.y);
                arc_graphic.beginFill(0xFF00FF, 1);
                arc_graphic.lineStyle(this.orbitRadii[this.o] / this.downScale, 0xFF00FF, 1)
                arc_graphic.arc(this.group.x / this.downScale, this.group.y / this.downScale, this.orbitRadii[this.o] / this.downScale, this.arc - Math.PI / 2, node.arc - Math.PI / 2, this.isCounterClockWise(node.arc - this.arc));
                arc_graphic.endFill();
                graphics.push(arc_graphic);

                // Create orbit sprite and apply the mask
                let graphic = PIXI.Sprite.fromImage(`data/assets/Orbit${this.o}${connectionType}.png`);
                graphic.mask = arc_graphic
                graphic.x = x;
                graphic.y = y;
                graphic.rotation = arc + Math.PI / 4;
                graphic.anchor.set(.3);
                graphics.push(graphic);
            } else {
                let graphic = PIXI.Sprite.fromImage(`data/assets/LineConnector${connectionType}.png`);
                let rot = Math.atan2(node.y - this.y, node.x - this.x);
                graphic.anchor.set(0, 0.5);
                graphic.x = this.x;
                graphic.y = this.y;
                graphic.width = Math.hypot(this.x - node.x, this.y - node.y);
                graphic.rotation = rot;
                graphics.push(graphic);
            }

        }

        return graphics
    }

    private getOidxBetween = (n1: SkillNode, n2: SkillNode, skillsPerOrbit: Array<number>) => {
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
        if ((!n1.isCounterClockWise(n2.arc - n1.arc) && n1.oidx > n2.oidx)
            || (n1.isCounterClockWise(n2.arc - n1.arc) && n1.oidx < n2.oidx)) {
            oidx += skillsPerOrbit[n1.o]
        }
        oidx /= 2;
        while (oidx >= skillsPerOrbit[n1.o]) {
            oidx -= skillsPerOrbit[n1.o];
        }
        return oidx;
    }
    private isCounterClockWise(angle: number) {
        while (angle <= -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;
        return angle < 0;
    }

    private getOrbitLocationsText = (): Array<Container> => {
        let graphics = new Array<Container>();
        for (let i = 0; i < this.skillsPerOrbit[this.o]; i++) {
            graphics.push(this.nodeTextOverlay(i));
        }
        return graphics;
    }

    private nodeTextOverlay = (oidx: number, text: string = ""): Container => {
        if (text === "") {
            text = oidx.toString();
        }
        let text_graphic = new PIXI.Text(text, { fill: 0xFFFFFF, align: 'center', fontSize: 24 });
        let arc = this.getArc(oidx);
        text_graphic.x = this.getX(arc);
        text_graphic.y = this.getY(arc);
        text_graphic.anchor.set(.5);
        return text_graphic;
    }
}
