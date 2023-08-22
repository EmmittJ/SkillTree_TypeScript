import { SemVer } from "semver";
import { utils } from "../app/utils";

export declare type DrawType = "Allocated" | "Active" | "CanAllocate" | "Unallocated" | "Normal";

export enum SkillNodeStates {
    None = 0,
    Active = 1 << 0,
    Hovered = 1 << 1,
    Pathing = 1 << 2,
    Highlighted = 1 << 3,
    Compared = 1 << 4,
    Moved = 1 << 5,
}

export enum ConnectionStyle {
    Line,
    Arc
}

export class SkillNode implements ISkillNode {
    id: string;
    activeEffectImage: string;
    activeIcon: string;
    ascendancyName: string;
    classStartIndex: number | undefined;
    expansionJewel: IExpansionJewel | undefined;
    flavourText: string[];
    grantedDexterity: number;
    grantedIntelligence: number;
    grantedPassivePoints: number;
    grantedStrength: number;
    group: number | undefined;
    icon: string;
    in: string[];
    inactiveIcon: string;
    isAscendancyStart: boolean;
    isBlighted: boolean;
    isJewelSocket: boolean;
    isKeystone: boolean;
    isMastery: boolean;
    isMultipleChoice: boolean;
    isMultipleChoiceOption: boolean;
    isNotable: boolean;
    isProxy: boolean;
    isWormhole: boolean;
    masteryEffects: IMasteryEffect[];
    name: string;
    orbit: number;
    orbitIndex: number;
    out: string[];
    recipe: string[];
    reminderText: string[];
    skill: number;
    stats: string[];
    
    state: SkillNodeStates;

    nodeGroup: IGroup | undefined;
    orbitAngles: { [orbit: number]: Array<number> };
    orbitRadii: Array<number>;
    scale: number;
    arc: number;
    x: number;
    y: number;
    isRegular2: boolean;
    isRegular1: boolean;
    hoverText: string | null = null;
    patch: SemVer;

    constructor(id: string, node: ISkillNode, group: IGroup | undefined, orbitRadii: Array<number>, orbitAngles: { [orbit: number]: Array<number> }, scale: number, patch: SemVer) {
        this.id = id;
        this.activeEffectImage = node.activeEffectImage || "";
        this.activeIcon = node.activeIcon || "";
        this.ascendancyName = node.ascendancyName || "";
        this.classStartIndex = node.classStartIndex;
        this.expansionJewel = node.expansionJewel;
        this.flavourText = node.flavourText || [];
        this.grantedDexterity = node.grantedDexterity || 0;
        this.grantedIntelligence = node.grantedIntelligence || 0;
        this.grantedPassivePoints = node.grantedPassivePoints || 0;
        this.grantedStrength = node.grantedStrength || 0;
        this.group = node.group;
        this.icon = node.icon;
        this.in = node.in;
        this.inactiveIcon = node.inactiveIcon || "";
        this.isAscendancyStart = node.isAscendancyStart || false;
        this.isBlighted = node.isBlighted;
        this.isJewelSocket = node.isJewelSocket;
        this.isKeystone = node.isKeystone || false;
        this.isMastery = node.isMastery || false;
        this.isMultipleChoice = node.isMultipleChoice || false;
        this.isMultipleChoiceOption = node.isMultipleChoiceOption || false;
        this.isNotable = node.isNotable || false;
        this.isProxy = node.isProxy || false;
        this.isWormhole = node.isWormhole || false;
        this.masteryEffects = node.masteryEffects || [];
        this.name = node.name;
        this.orbit = node.orbit;
        this.orbitIndex = node.orbitIndex;
        this.out = node.out;
        this.recipe = node.recipe || [];
        this.reminderText = node.recipe || [];
        this.skill = node.skill;
        this.stats = node.stats;

        this.state = SkillNodeStates.None;

        this.nodeGroup = group;
        this.orbitAngles = orbitAngles;
        this.orbitRadii = orbitRadii;
        this.scale = scale;
        this.arc = this.getArc(this.orbitIndex);
        this.x = this.getX(this.arc);
        this.y = this.getY(this.arc);
        this.isRegular2 = !this.isKeystone && !this.isNotable && !this.isJewelSocket && !this.isMastery;
        this.isRegular1 = this.isRegular2 && (this.grantedStrength > 0 || this.grantedDexterity > 0 || this.grantedIntelligence > 0) && this.stats.filter(utils.NotNullOrWhiteSpace).length === 1;
        this.patch = patch;

        if (this.grantedPassivePoints > 0) {
            this.stats.push(`Grants ${this.grantedPassivePoints} Passive Skill Point${this.grantedPassivePoints > 1 ? 's' : ''}`);
        }
    }

    private getArc = (oidx: number): number => this.orbitAngles[this.orbit] !== undefined && this.orbitAngles[this.orbit].length > oidx ? this.orbitAngles[this.orbit][oidx] : 0;
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

    public GetDrawType = (others: SkillNode[]): DrawType => {
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

    public GetSpriteSheetKey = (): SpriteSheetKey => {
        const drawType = this.is(SkillNodeStates.Active) ? "Active" : "Inactive";
        if (this.isKeystone) {
            return `keystone${drawType}`;
        } else if (this.isNotable) {
            return `notable${drawType}`;
        } else if (this.isMastery) {
            if (this.activeEffectImage !== "") {
                if (this.is(SkillNodeStates.Active)) {
                    return "masteryActiveSelected";
                } else if (this.is(SkillNodeStates.Hovered) || this.is(SkillNodeStates.Pathing)) {
                    return "masteryConnected";
                } else {
                    return "masteryInactive";
                }
            } else if (this.is(SkillNodeStates.Active) || this.is(SkillNodeStates.Hovered)) {
                return "masteryConnected";
            } else {
                return "mastery";
            }
        }

        return `normal${drawType}`;
    }

    public GetConnectionType = (other: SkillNode): "Active" | "Intermediate" | "Normal" => {
        return this.is(SkillNodeStates.Active) && other.is(SkillNodeStates.Active) ? "Active" : (this.is(SkillNodeStates.Active) || other.is(SkillNodeStates.Active) || (this.is(SkillNodeStates.Pathing) && other.is(SkillNodeStates.Pathing)) ? "Intermediate" : "Normal");
    }

    public GetTargetSize = (): { width: number, height: number } => {
        if (this.isRegular1 || this.isRegular2) {
            return { width: Math.floor(70 * this.scale), height: Math.floor(70 * this.scale) };
        }

        if (this.isNotable || this.isJewelSocket || this.isMastery) {
            return { width: Math.floor(100 * this.scale), height: Math.floor(100 * this.scale) };
        }

        if (this.isKeystone) {
            return { width: Math.floor(138 * this.scale), height: Math.floor(140 * this.scale) };
        }

        return { width: 0, height: 0 };
    }
}