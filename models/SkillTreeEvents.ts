type SkillTreeEvent = "node" | "skilltree" | "viewport" | "controls";

export class SkillTreeEvents {
    public static events: { [type: string]: { [event: string]: Array<Function> } } = {};
    public static on = (type: SkillTreeEvent, event: PIXI.interaction.InteractionEventTypes | string, fn: Function, notify = true) => {
        if (SkillTreeEvents.events[type] === undefined) {
            SkillTreeEvents.events[type] = {};
        }
        if (SkillTreeEvents.events[type][event] === undefined) {
            SkillTreeEvents.events[type][event] = new Array<Function>();
        }

        SkillTreeEvents.events[type][event].push(fn);
        if (notify) SkillTreeEvents.notify(type);
    }

    public static off = (type: SkillTreeEvent, event: PIXI.interaction.InteractionEventTypes | string, fn: Function, notify = true) => {
        if (SkillTreeEvents.events[type] === undefined || SkillTreeEvents.events[type][event] === undefined || SkillTreeEvents.events[type][event].indexOf(fn) === -1) {
            return;
        }

        SkillTreeEvents.events[type][event].splice(SkillTreeEvents.events[type][event].indexOf(fn), 1);
        if (notify) SkillTreeEvents.notify(type);
    }

    public static fire(type: SkillTreeEvent, event: PIXI.interaction.InteractionEventTypes | string, context?: any) {
        if (SkillTreeEvents.events[type] === undefined || SkillTreeEvents.events[type][event] === undefined) {
            return;
        }
        for (const fn of SkillTreeEvents.events[type][event]) {
            setTimeout(() => fn(context), 0);
        }
    }

    private static _subscribers: { [type: string]: Array<Function> } = {};
    public static subscribe = (type: SkillTreeEvent, fn: Function) => {
        if (SkillTreeEvents._subscribers[type] === undefined) {
            SkillTreeEvents._subscribers[type] = new Array<Function>();
        }

        SkillTreeEvents._subscribers[type].push(fn);
    }

    public static unsubscribe = (type: SkillTreeEvent, fn: Function) => {
        if (SkillTreeEvents._subscribers[type] === undefined) {
            return;
        }

        SkillTreeEvents._subscribers[type].splice(SkillTreeEvents._subscribers[type].indexOf(fn), 1);
    }

    private static notify(type: SkillTreeEvent, context?: any) {
        if (SkillTreeEvents._subscribers[type] === undefined) {
            return;
        }
        for (const fn of SkillTreeEvents._subscribers[type]) {
            setTimeout(() => fn(context), 0);
        }
    }
}