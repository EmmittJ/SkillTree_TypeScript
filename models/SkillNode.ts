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

    group: IGroup;
    orbitRadii: Array<number>;
    skillsPerOrbit: Array<number>;
    scale: number;
    arc: number;
    x: number;
    y: number;
    alternate_ids: string[] | undefined = undefined;
    hoverText: string | null = null;

    constructor(node: ISkillNode, group: IGroup, orbitRadii: Array<number>, skillsPerOrbit: Array<number>, scale: number) {
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

    public GetDrawType = (others: SkillNode[]): "Allocated" | "CanAllocate" | "Unallocated" | "Normal" => {
        let drawType: "Allocated" | "CanAllocate" | "Unallocated" | "Normal";

        if (this.is(SkillNodeStates.Active) || this.is(SkillNodeStates.Hovered)) {
            drawType = "Allocated";
        } else if (others.filter(x => x.is(SkillNodeStates.Active)).length > 0) {
            drawType = "CanAllocate";
        } else if (this.ascendancyName !== "") {
            drawType = "Normal";
        } else {
            drawType = "Unallocated";
        }

        return drawType;
    }

    public GetFrameAssetKey = (others: SkillNode[]): string => {
        let drawType = this.GetDrawType(others);

        let assetKey = "";
        if (this.isAscendancyStart) {
            assetKey = "PassiveSkillScreenAscendancyMiddle";
        } else if (this.isJewelSocket) {
            assetKey = `JewelFrame${drawType}`;
        } else if (this.ks) {
            assetKey = `KeystoneFrame${drawType}`;
        } else if (this.not && this.ascendancyName === "") {
            assetKey = `NotableFrame${drawType}`;
        } else if (this.not && this.ascendancyName !== "") {
            assetKey = `PassiveSkillScreenAscendancyFrameLarge${drawType}`;
        } else if (this.m) {
            assetKey = "";
        } else if (this.ascendancyName !== "") {
            assetKey = `PassiveSkillScreenAscendancyFrameSmall${drawType}`;
        } else {
            switch (drawType) {
                case "Unallocated":
                    assetKey = "PSSkillFrame";
                    break;
                case "CanAllocate":
                    assetKey = "PSSkillFrameHighlighted";
                    break;
                case "Allocated":
                    assetKey = "PSSkillFrameActive";
                    break;
            }
        }

        return assetKey;
    }

    public GetConnectionType = (other: SkillNode): "Active" | "Intermediate" | "Normal" => {
        return this.is(SkillNodeStates.Active) && other.is(SkillNodeStates.Active) ? "Active" : (this.is(SkillNodeStates.Active) || other.is(SkillNodeStates.Active) || (this.is(SkillNodeStates.Pathing) && other.is(SkillNodeStates.Pathing)) ? "Intermediate" : "Normal");
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
