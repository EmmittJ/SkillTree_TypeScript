import { utils } from "../app/utils";

export enum SkillNodeStates {
    None = 0,
    Active = 1 << 0,
    Hovered = 1 << 1,
    Pathing = 1 << 2,
    Highlighted = 1 << 3,
    Compared = 1 << 4,
    Moved = 1 << 5,
}

export class SkillNode implements ISkillNode {
    skill: number;
    id: number;
    dn: string | undefined;
    name: string;
    icon: string;
    inactiveIcon: string;
    activeIcon: string;
    activeEffectImage: string;
    masteryEffects: IMasteryEffect[];
    ks: boolean | undefined;
    isKeystone: boolean;
    not: boolean | undefined;
    isNotable: boolean;
    m: boolean | undefined;
    isMastery: boolean;
    isBlighted: boolean;
    isJewelSocket: boolean;
    expansionJewel: IExpansionJewel | undefined;
    isMultipleChoice: boolean;
    isMultipleChoiceOption: boolean;
    isProxy: boolean;
    passivePointsGranted: number;
    ascendancyName: string;
    isAscendancyStart: boolean;
    spc: number[] | undefined;
    classStartIndex: number | undefined;
    sd: string[] | undefined;
    stats: string[];
    reminderText: string[];
    flavourText: string[];
    g: number | undefined;
    group: number | undefined;
    o: number | undefined;
    orbit: number;
    oidx: number | undefined;
    orbitIndex: number;
    da: number | undefined;
    grantedDexterity: number;
    ia: number | undefined;
    grantedIntelligence: number;
    sa: number | undefined;
    grantedStrength: number;
    out: number[];
    in: number[];
    state: SkillNodeStates;

    nodeGroup: IGroup | undefined;
    orbitRadii: Array<number>;
    skillsPerOrbit: Array<number>;
    scale: number;
    arc: number;
    x: number;
    y: number;
    isRegular2: boolean;
    isRegular1: boolean;
    hoverText: string | null = null;

    constructor(node: ISkillNode, group: IGroup | undefined, orbitRadii: Array<number>, skillsPerOrbit: Array<number>, scale: number) {
        this.skill = node.skill || -1;
        this.id = node.id || node.skill;
        this.dn = node.dn;
        this.name = node.name || node.dn || "";
        this.icon = node.icon || "";
        this.activeIcon = node.activeIcon || "";
        this.inactiveIcon = node.inactiveIcon || "";
        this.activeEffectImage = node.activeEffectImage || "";
        this.masteryEffects = node.masteryEffects || [];
        this.ks = node.ks;
        this.isKeystone = node.isKeystone || node.ks || false;
        this.not = node.not;
        this.isNotable = node.isNotable || node.not || false;
        this.m = node.m;
        this.isMastery = node.isMastery || node.m || false;
        this.isBlighted = node.isBlighted || false;
        this.isJewelSocket = node.isJewelSocket || false;
        this.expansionJewel = node.expansionJewel;
        this.isMultipleChoice = node.isMultipleChoice || false;
        this.isMultipleChoiceOption = node.isMultipleChoiceOption || false;
        this.isProxy = node.isProxy || false;
        this.passivePointsGranted = node.passivePointsGranted || 0;
        this.ascendancyName = node.ascendancyName || "";
        this.isAscendancyStart = node.isAscendancyStart || false;
        this.spc = node.spc;
        this.classStartIndex = node.classStartIndex !== undefined ? node.classStartIndex : (this.spc && this.spc.length > 0 ? this.spc[0] : undefined);
        this.sd = node.sd;
        this.stats = node.stats || node.sd || [];
        this.reminderText = node.reminderText || [];
        this.flavourText = node.flavourText || [];
        this.g = node.g;
        this.group = node.group || node.g;
        this.o = node.o;
        this.orbit = node.orbit || node.o || 0;
        this.oidx = node.oidx;
        this.orbitIndex = node.orbitIndex || node.oidx || 0;
        this.da = node.da;
        this.grantedDexterity = node.grantedDexterity || node.da || 0;
        this.ia = node.ia;
        this.grantedIntelligence = node.grantedIntelligence || node.ia || 0;
        this.sa = node.sa;
        this.grantedStrength = node.grantedStrength || node.sa || 0;
        this.out = node.out || [];
        this.in = node.in || [];
        this.state = SkillNodeStates.None;

        this.nodeGroup = group;
        this.orbitRadii = orbitRadii;
        this.skillsPerOrbit = skillsPerOrbit;
        this.scale = scale;
        this.arc = this.getArc(this.orbitIndex);
        this.x = this.getX(this.arc);
        this.y = this.getY(this.arc);
        this.isRegular2 = !this.isKeystone && !this.isNotable && !this.isJewelSocket && !this.isMastery;
        this.isRegular1 = this.isRegular2 && (this.grantedStrength > 0 || this.grantedDexterity > 0 || this.grantedIntelligence > 0) && this.stats.filter(utils.NotNullOrWhiteSpace).length === 1;

        if (this.passivePointsGranted > 0) {
            this.stats.push(`Grants ${this.passivePointsGranted} Passive Skill Point${this.passivePointsGranted > 1 ? 's' : ''}`);
        }
    }

    private getArc = (oidx: number): number => this.skillsPerOrbit.length > this.orbit ? 2 * Math.PI * oidx / this.skillsPerOrbit[this.orbit] : 0;
    private getX = (arc: number): number => this.orbitRadii.length > this.orbit && this.nodeGroup !== undefined ? (this.nodeGroup.x * this.scale) - (this.orbitRadii[this.orbit] * this.scale) * Math.sin(-arc) : 0;
    private getY = (arc: number): number => this.orbitRadii.length > this.orbit && this.nodeGroup !== undefined ? (this.nodeGroup.y * this.scale) - (this.orbitRadii[this.orbit] * this.scale) * Math.cos(-arc) : 0;

    public is = (test: SkillNodeStates) => {
        return (this.state & test) === test;
    }

    public _add = (state: SkillNodeStates) => {
        this.state |= state;
    }

    public _remove = (state: SkillNodeStates) => {
        this.state &= ~state;
    }

    public GetId = (): string => {
        return `${this.id}`;
    }

    public GetIcon = () => {
        if (this.isMastery) {
            if (this.is(SkillNodeStates.Active) && this.activeIcon) {
                return this.activeIcon;
            }

            if (this.inactiveIcon) {
                return this.inactiveIcon;
            }
        }

        return this.icon;
    }

    public GetDrawType = (others: SkillNode[]): "Allocated" | "Active" | "CanAllocate" | "Unallocated" | "Normal" => {
        if (this.is(SkillNodeStates.Active) || this.is(SkillNodeStates.Hovered)) {
            if (this.expansionJewel !== undefined || this.isProxy || this.nodeGroup?.isProxy) {
                return "Active";
            }
            return "Allocated";
        } else if (others.filter(x => x && x.is(SkillNodeStates.Active)).length > 0) {
            return "CanAllocate";
        } else if (this.ascendancyName !== "" || this.expansionJewel !== undefined || this.isProxy || this.nodeGroup?.isProxy) {
            return "Normal";
        }

        return "Unallocated";
    }

    public GetFrameAssetKey = (others: SkillNode[]): string | null => {
        const drawType = this.GetDrawType(others);

        if (this.isAscendancyStart) {
            return "AscendancyMiddle";
        } else if (this.isJewelSocket) {
            if (this.expansionJewel !== undefined || this.isProxy || this.nodeGroup?.isProxy) {
                return `JewelSocketAlt${drawType}`;
            }
            return `JewelFrame${drawType}`;
        } else if (this.isKeystone) {
            return `KeystoneFrame${drawType}`;
        } else if (this.isNotable && this.ascendancyName === "") {
            if (this.isBlighted) {
                return `BlightedNotableFrame${drawType}`
            }
            return `NotableFrame${drawType}`;
        } else if (this.isNotable && this.ascendancyName !== "") {
            return `AscendancyFrameLarge${drawType}`;
        } else if (this.isMastery) {
            return null;
        } else if (this.ascendancyName !== "") {
            return `AscendancyFrameSmall${drawType}`;
        }

        switch (drawType) {
            case "Normal":
            case "Unallocated":
                return "PSSkillFrame";
            case "CanAllocate":
                return "PSSkillFrameHighlighted";
            case "Active":
            case "Allocated":
                return "PSSkillFrameActive";
        }
    }

    public GetConnectionType = (other: SkillNode): "Active" | "Intermediate" | "Normal" => {
        return this.is(SkillNodeStates.Active) && other.is(SkillNodeStates.Active) ? "Active" : (this.is(SkillNodeStates.Active) || other.is(SkillNodeStates.Active) || (this.is(SkillNodeStates.Pathing) && other.is(SkillNodeStates.Pathing)) ? "Intermediate" : "Normal");
    }

    public GetPassiveType = (): 0 | 1 | 2 | 3 | 4 => {
        if (this.isRegular1) {
            return 1;
        }

        if (this.isRegular2) {
            return 2;
        }

        if (this.isNotable) {
            return 3;
        }

        if (this.isKeystone) {
            return 4;
        }

        return 0;
    }

    public GetTargetSize = (): { width: number, height: number } => {
        if (this.isRegular1 || this.isRegular2) {
            return { width: 70 * this.scale, height: 70 * this.scale };
        }

        if (this.isNotable || this.isJewelSocket || this.isMastery) {
            return { width: 99 * this.scale, height: 99 * this.scale };
        }

        if (this.isKeystone) {
            return { width: 138 * this.scale, height: 140 * this.scale };
        }

        return { width: 0, height: 0 };
    }
}