/** 3.19.0 */
export class SkillTreeV10Preprocessor implements ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeV10): boolean {
        return data.assets !== undefined;
    }

    Process(data: ISkillTreeV10): ISkillTreeV11 {
        const v11 = JSON.parse(JSON.stringify(data)) as ISkillTreeV11;

        const sprites: { [id: string]: { [zoomLevel: string]: ISpriteSheetV11 } } = {};
        const upgradedSpriteSheets = this.UpgradeSpriteSheets(data);
        for (const id in upgradedSpriteSheets) {
            sprites[id] = {};
            const zooms = upgradedSpriteSheets[id];
            for (const zoom in zooms) {
                sprites[id][zoom] = upgradedSpriteSheets[id][zoom];
            }
        }

        const upgradedAssets = this.UpgradeAssets(data);
        for (const id in upgradedAssets) {
            sprites[id] = {};
            const zooms = upgradedAssets[id];
            for (const zoom in zooms) {
                sprites[id][zoom] = upgradedAssets[id][zoom];
            }
        }
        v11.sprites = sprites;

        delete (v11 as any).assets;
        delete (v11 as any).skillSprites;

        return v11;
    }

    private UpgradeSpriteSheets(data: ISkillTreeV10): { [id: string]: { [zoomLevel: string]: ISpriteSheetV11 } } {
        const filesizes: { [filenameAndZoomLevel: string]: { w: number, h: number } } = {};
        for (const id in data.skillSprites) {
            const spriteSheets = data.skillSprites[id];
            for (const i in data.imageZoomLevels) {
                const zoom = data.imageZoomLevels[i].toString();
                const spriteSheet = spriteSheets[i];
                if (spriteSheet === undefined)
                    continue;
                const current = filesizes[`${spriteSheet.filename}-${zoom}`] || { w: 0, h: 0 };
                filesizes[`${spriteSheet.filename}-${zoom}`] = this.CalculateWidthAndHeight(current, spriteSheet);
            }
        }

        const sprites: { [id: string]: { [zoomLevel: string]: ISpriteSheetV11 } } = {};
        for (const id in data.skillSprites) {
            sprites[id] = {};
            const spriteSheets = data.skillSprites[id];
            for (const i in data.imageZoomLevels) {
                const zoom = data.imageZoomLevels[i].toString();
                const spriteSheet = spriteSheets[i];
                if (spriteSheet === undefined)
                    continue;
                sprites[id][zoom] = this.UpgradeSpriteSheet(spriteSheet, filesizes[`${spriteSheet.filename}-${zoom}`]);
            }
        }
        return sprites;
    }

    private UpgradeSpriteSheet(spriteSheet: ISpriteSheetV2, dimensions: { w: number, h: number }): ISpriteSheetV11 {
        const v11 = spriteSheet as ISpriteSheetV11;
        v11.w = dimensions.w;
        v11.h = dimensions.h;
        return v11;
    }

    private CalculateWidthAndHeight(initial: { w: number, h: number }, spriteSheet: ISpriteSheetV2): { w: number, h: number } {
        let width = initial.w;
        let height = initial.h;

        for (const id in spriteSheet.coords) {
            const coord = spriteSheet.coords[id];
            width = Math.max(width, coord.x + coord.w);
            height = Math.max(height, coord.y + coord.h);
        }

        return { w: width, h: height };
    }

    private UpgradeAssets(data: ISkillTreeV10): { [id: string]: { [zoomLevel: string]: ISpriteSheetV11 } } {

        const sprites: { [id: string]: { [zoomLevel: string]: ISpriteSheetV11 } } = {};
        for (const id in data.assets) {
            const key = this.MapAssetToGroup(id);
            if (key === null) continue;
            if (sprites[key] === undefined) sprites[key] = {};
            for (const zoom in data.assets[id]) {
                if (sprites[key][zoom] === undefined) {
                    sprites[key][zoom] = {
                        filename: `LOAD_COORDS`,
                        h: -1,
                        w: -1,
                        coords: {}
                    }
                }
                sprites[key][zoom].coords[id] = { x: 0, y: 0, h: -1, w: -1 };
            }
        }
        return sprites;
    }

    private MapAssetToGroup(asset: string): SpriteSheetKey | null {
        asset = asset.startsWith('PassiveSkillScreen') ? asset.replace('PassiveSkillScreen', '') : asset;

        if (asset === 'Background2' || asset === 'Background1') {
            return 'background';
        }

        if (asset === 'PassiveMasteryConnectedButton') {
            return 'masteryActiveSelected';
        }

        if (asset.startsWith('Classes')) {
            return 'ascendancyBackground';
        }

        if (asset.startsWith('Ascendancy')) {
            return 'ascendancy';
        }

        if (asset.startsWith('Background') || asset.startsWith('center') || asset === 'PSStartNodeBackgroundInactive') {
            return 'startNode';
        }

        if (asset.startsWith('PSGroupBackground') || asset.startsWith('GroupBackground')) {
            return 'groupBackground';
        }

        if (asset.indexOf('Frame') >= 0 || asset.startsWith('JewelSocketClusterAlt') || asset.startsWith('JewelSocketAlt')) {
            return 'frame';
        }

        if (asset.startsWith('JewelSocket')) {
            return 'jewel';
        }

        if (asset.startsWith('LineConnector') || asset.startsWith('Orbit') || asset.startsWith('PSLineDeco')) {
            return 'line';
        }

        if (asset.indexOf('JewelCircle') >= 0) {
            return 'jewelRadius';
        }

        if (asset === 'AtlasPassiveSkillScreenStart') {
            return 'startNode';
        }

        if (asset === 'AtlasPassiveBackground') {
            return 'atlasBackground';
        }

        if (asset === 'PSStartNodeBackgroundActive') {
            return null;
        }

        if (asset.startsWith('imgPSFade')) {
            return null;
        }

        if (asset.endsWith('Oil')) {
            return null;
        }

        throw new Error(`Unhandled Asset: ${asset}`);
    }

}