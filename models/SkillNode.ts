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
    isAscendancyStart: boolean ;
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
        this.arc = this.getArc();
        this.x = this.getX();
        this.y = this.getY();
    }

    private getArc = (): number => this.skillsPerOrbit.length > this.o ? 2 * Math.PI * this.oidx / this.skillsPerOrbit[this.o] : 0;
    private getX = (): number => this.orbitRadii.length > this.o ? this.group.x - this.orbitRadii[this.o] * Math.sin(-this.getArc()) : 0;
    private getY = (): number => this.orbitRadii.length > this.o ? this.group.y - this.orbitRadii[this.o] * Math.cos(-this.getArc()) : 0;
}
