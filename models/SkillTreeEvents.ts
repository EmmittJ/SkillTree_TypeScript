type SkillTreeEvent = "node" | "skilltree" | "viewport" | "controls";

export class SkillTreeEvents {
    public static events: { [type: string]: { [event: string]: Array<Function> } } = {};
    public static on = (type: SkillTreeEvent, event: string, fn: Function) => {
        if (SkillTreeEvents.events[type] === undefined) {
            SkillTreeEvents.events[type] = {};
        }
        if (SkillTreeEvents.events[type][event] === undefined) {
            SkillTreeEvents.events[type][event] = new Array<Function>();
        }

        SkillTreeEvents.events[type][event].push(fn);
    }

    public static off = (type: SkillTreeEvent, event: string, fn: Function) => {
        if (SkillTreeEvents.events[type] === undefined || SkillTreeEvents.events[type][event] === undefined || SkillTreeEvents.events[type][event].indexOf(fn) === -1) {
            return;
        }

        SkillTreeEvents.events[type][event].splice(SkillTreeEvents.events[type][event].indexOf(fn), 1);
    }

    public static fire(type: SkillTreeEvent, event: string, context?: any) {
        if (SkillTreeEvents.events[type] === undefined || SkillTreeEvents.events[type][event] === undefined) {
            return;
        }
        for (const fn of SkillTreeEvents.events[type][event]) {
            setTimeout(() => fn(context), 0);
        }
    }
}