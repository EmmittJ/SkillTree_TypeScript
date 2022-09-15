/** 0.9.6 to 0.9.11 */
export class SkillTreeV1Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV1): boolean {
        return data.root !== undefined
            && data.root.g !== undefined
            && Array.isArray(data.nodes)
            && Object.keys(data.skillSprites).length === 2
            && data.skillSprites["active"] !== undefined
            && data.skillSprites["inactive"] !== undefined
    }

    Process(data: ISkillTreeV1): ISkillTreeV2 {
        var v2 = JSON.parse(JSON.stringify(data)) as ISkillTreeV2;

        for (const i in data.skillSprites) {
            const sprites = data.skillSprites[i];
            if (!(i === "active" || i === "inactive"))
                continue;

            const key = i.charAt(0).toUpperCase() + i.slice(1);
            const sheets: { [id: string]: ISpriteSheetV2[] } = {};
            sheets[`notable${key}`] = [];
            sheets[`keystone${key}`] = [];
            sheets[`normal${key}`] = [];

            for (const sheet of sprites) {
                const notableCoords = sheet.notableCoords === undefined ? sheet.coords : sheet.notableCoords;
                const keystoneCoords = sheet.notableCoords === undefined ? sheet.coords : sheet.notableCoords;
                const normalCoords = sheet.coords;

                sheets[`notable${key}`].push({ filename: sheet.filename, coords: notableCoords });
                sheets[`keystone${key}`].push({ filename: sheet.filename, coords: keystoneCoords });
                sheets[`normal${key}`].push({ filename: sheet.filename, coords: normalCoords });
            }
            
            for (const j in sheets) {
                v2.skillSprites[j] = sheets[j];
            }
        }

        return v2;
    }
}