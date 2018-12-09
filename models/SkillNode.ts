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
    private downScale: number = 2.75;

    constructor(node: ISkillNode, group: IGroup, orbitRadii: Array<number>, skillsPerOrbit: Array<number>) {
        this.id = node.id;
        this.dn = node.dn;
        this.icon = node.icon;
        this.ks = node.ks;
        this.not = node.not;
        this.m = node.m;
        this.isJewelSocket = node.isJewelSocket;
        this.isMultipleChoice = node.isMultipleChoice;
        this.isMultipleChoiceOption = node.isMultipleChoiceOption;
        this.passivePointsGranted = node.passivePointsGranted;
        this.ascendancyName = node.ascendancyName;
        this.isAscendancyStart = node.isAscendancyStart;
        this.spc = node.spc;
        this.sd = node.sd;
        this.reminderText = node.reminderText;
        this.g = node.g;
        this.o = node.o;
        this.oidx = node.oidx;
        this.da = node.da;
        this.ia = node.ia;
        this.sa = node.sa;
        this.out = node.out;
        this.in = node.in;

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

    public getGraphic = (): PIXI.Graphics => {
        var node_color = 0xFF0000;
        var node_size = 15;
        if (this.ks) {
            node_color = 0x0000FF;
            node_size *= 2;
        } else if (this.not) {
            node_color = 0x00FFFF;
            node_size *= 1.5;
        } else if (this.m) {
            node_color = 0xFFFFFF;
        }

        var node_graphic = new PIXI.Graphics();
        node_graphic.beginFill(this.spc.length > 0 || this.isAscendancyStart ? 0x00FF00 : node_color);
        node_graphic.lineStyle(0);
        node_graphic.drawCircle(this.x, this.y, node_size);
        node_graphic.endFill();

        return node_graphic;
    }

    public getGraphicConnections = (nodes: { [id: string]: SkillNode }): Array<Container> => {
        let graphics: Array<Container> = new Array<Container>();
        for (let id of this.out) {
            let node = nodes[id];
            if (node.isAscendancyStart || this.dn.toLowerCase().startsWith("path of the") || node.dn.toLowerCase().startsWith("path of the")) {
                continue;
            }
            let dist = Math.hypot(this.x - node.x, this.y - node.y);
            if (this.g === node.g && this.o === node.o) {
                //for (let text of this.getOrbitLocationsText()) {
                //    graphics.push(text);
                //}
                var oidx = this.getOidxBetween(this, node, this.skillsPerOrbit);
                let arc = this.getArc(oidx);
                let x = this.getX(arc);
                let y = this.getY(arc);

                //var midpoint_graphic = new PIXI.Graphics();
                //midpoint_graphic.beginFill(0xFF00FF);
                //midpoint_graphic.lineStyle(0);
                //midpoint_graphic.drawCircle(x, y, 5);
                //midpoint_graphic.endFill();
                //graphics.push(midpoint_graphic);

                // Create a mask in order to crop out unwanted arc overlap
                let arc_graphic = new PIXI.Graphics();
                arc_graphic.moveTo(this.x, this.y);
                arc_graphic.beginFill(0xFF00FF, 1);
                arc_graphic.lineStyle(15, 0xFF00FF, 1)
                arc_graphic.arc(this.group.x / this.downScale, this.group.y / this.downScale, this.orbitRadii[this.o] / 2.5, this.arc - Math.PI / 2, node.arc - Math.PI / 2, this.isCounterClockWise(node.arc - this.arc));
                arc_graphic.endFill();
                graphics.push(arc_graphic);

                // Create orbit sprite and apply the mask
                let graphic = PIXI.Sprite.fromImage(`data/assets/Orbit${this.o}Normal.png`);
                graphic.mask = arc_graphic
                graphic.x = x;
                graphic.y = y;
                graphic.rotation = arc + Math.PI / 4;
                graphic.anchor.set(.3);
                graphics.push(graphic);
            } else {
                let graphic = PIXI.Sprite.fromImage("data/assets/LineConnectorNormal.png");
                let rot = Math.atan2(node.y - this.y, node.x - this.x);
                graphic.anchor.set(0, 0.5);
                graphic.x = this.x;
                graphic.y = this.y;
                graphic.width = dist;
                graphic.rotation = rot;
                graphics.push(graphic);

                //let text_graphic = new PIXI.Text(`${dist.toFixed(2)}, ${rot.toFixed(2)}`, { fill: 0xFFFFFF, align: 'center', fontSize: 24 });
                //text_graphic.x = this.x;
                //text_graphic.y = this.y;
                //text_graphic.rotation = rot;
                //text_graphic.anchor.set(.5);
                //graphics.push(text_graphic);
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
         * (11 + 2 + 12) / 2 = 13, oh no... well, we sustract 12 (a full orbit)
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
