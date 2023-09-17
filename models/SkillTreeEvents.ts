import type { AllFederatedEventMap } from "pixi.js";

type SkillTreeEvent = "node" | "skilltree" | "viewport" | "controls";
type ObjectEvent = keyof AllFederatedEventMap;

export class SkillTreeEvents {
    private static events: { [type: string]: { [event: string]: Array<Function> } } = {};

    public static getEvents = (type: string): Array<ObjectEvent> | undefined => {
        let array = new Array<ObjectEvent>();
        for (const event in SkillTreeEvents.events[type]) {
            array.push(event as (ObjectEvent));
        }
        if (array.length === 0) {
            return undefined;
        }
        return array;
    }

    public static on = (type: SkillTreeEvent, event: ObjectEvent | string, fn: Function) => {
        if (SkillTreeEvents.events[type] === undefined) {
            SkillTreeEvents.events[type] = {};
        }
        if (SkillTreeEvents.events[type][event] === undefined) {
            SkillTreeEvents.events[type][event] = new Array<Function>();
        }

        SkillTreeEvents.events[type][event].push(fn);
    }

    public static off = (type: SkillTreeEvent, event: ObjectEvent | string, fn: Function) => {
        if (SkillTreeEvents.events[type] === undefined || SkillTreeEvents.events[type][event] === undefined || SkillTreeEvents.events[type][event].indexOf(fn) === -1) {
            return;
        }

        SkillTreeEvents.events[type][event].splice(SkillTreeEvents.events[type][event].indexOf(fn), 1);
    }

    public static fire(type: SkillTreeEvent, event: ObjectEvent | string, context?: any) {
        if (SkillTreeEvents.events[type] === undefined || SkillTreeEvents.events[type][event] === undefined) {
            return;
        }
        for (const fn of SkillTreeEvents.events[type][event]) {
            setTimeout(() => fn(context), 0);
        }
    }
}