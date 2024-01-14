class SkillTreeEventContainer<T extends string> {
    private events: { [event: string]: Array<Function> } = {}

    public on = (event: T, fn: Function) => {
        if (this.events[event] === undefined) {
            this.events[event] = new Array<Function>();
        }

        this.events[event].push(fn);
    }

    public off = (event: T, fn: Function) => {
        if (this.events[event] === undefined || this.events[event].indexOf(fn) === -1) {
            return;
        }

        this.events[event].splice(this.events[event].indexOf(fn), 1);
    }

    public fire(event: T, context?: any) {
        if (this.events[event] === undefined) {
            return;
        }
        for (const fn of this.events[event]) {
            setTimeout(() => fn(context), 0);
        }
    }
}

export class SkillTreeEvents {
    public static controls = new SkillTreeEventContainer<
        | "ascendancy-class-change"
        | "wildwood-ascendancy-class-change"
        | "class-change"
        | "search-change"
    >();

    public static skill_tree = new SkillTreeEventContainer<
        | "active-nodes-update"
        | "ascendancy-class-change"
        | "wildwood-ascendancy-class-change"
        | "ascendancy-node-count-maximum"
        | "wildwood-ascendancy-node-count-maximum"
        | "ascendancy-node-count"
        | "wildwood-ascendancy-node-count"
        | "class-change"
        | "encode-url"
        | "highlighted-nodes-update"
        | "hovered-nodes-end"
        | "hovered-nodes-start"
        | "normal-node-count-maximum"
        | "normal-node-count"
    >();

    public static node = new SkillTreeEventContainer<
        | "click"
        | "in"
        | "out"
    >();

    public static viewport = new SkillTreeEventContainer<
        | "cancel"
        | "down"
        | "move"
        | "up"
    >();
}