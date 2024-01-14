export class SkillTreeOptionsPreprocessor implements ISkillTreePreprocessor {
    CanProcess(_: ISkillTreeV10, options: ISkillTreeOptionsV2 | undefined): boolean {
        return options !== undefined;
    }

    Process(data: ISkillTreeV10, options: ISkillTreeOptionsV2 | undefined): ISkillTreeV10 {
        if (options === undefined)
            return data;

        if (data.classes === undefined)
            data.classes = [];

        for (const id in options.ascClasses) {
            const character = options.ascClasses[id];
            const current = data.classes[+id] || {};
            current.name = current.name || character.name;
            current.ascendancies = [];

            for (const ascId in character.classes) {
                const asc = character.classes[ascId];
                current.ascendancies[+ascId - 1] = {
                    flavourText: asc.flavourText,
                    flavourTextColour: asc.flavourTextColour,
                    flavourTextRect: this.UpgradeFlavourTextRect(asc.flavourTextRect),
                    id: asc.displayName,
                    name: asc.name
                }
            }
            data.classes[+id] = current;
        }

        return data;
    }

    private UpgradeFlavourTextRect(flavourTextRect: string): ISkillTreeRectV7 {
        const rect = flavourTextRect.split(",");
        return {
            x: +rect[0],
            y: +rect[1],
            width: +rect[2],
            height: +rect[3]
        }
    }
}