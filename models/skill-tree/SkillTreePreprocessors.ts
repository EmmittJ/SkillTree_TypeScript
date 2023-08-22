import { ISkillTreeData } from "../types/ISkillTreeData";
import { SkillTreeOptionsV1Preprocessor } from "./options-preprocessors/SkillTreeOptionsV1Preprocessor";
import { SkillTreeOptionsPreprocessor } from "./preprocessors/SkillTreeOptionsPreprocessor";
import { SkillTreePreprocessor } from "./preprocessors/SkillTreePreprocessor";
import { SkillTreeV10Preprocessor } from "./preprocessors/SkillTreeV10Preprocessor";
import { SkillTreeV11Preprocessor } from "./preprocessors/SkillTreeV11Preprocessor";
import { SkillTreeV12Preprocessor } from "./preprocessors/SkillTreeV12Preprocessor";
import { SkillTreeV1Preprocessor } from "./preprocessors/SkillTreeV1Preprocessor";
import { SkillTreeV2Preprocessor } from "./preprocessors/SkillTreeV2Preprocessor";
import { SkillTreeV3Preprocessor } from "./preprocessors/SkillTreeV3Preprocessor";
import { SkillTreeV4Preprocessor } from "./preprocessors/SkillTreeV4Preprocessor";
import { SkillTreeV5Preprocessor } from "./preprocessors/SkillTreeV5Preprocessor";
import { SkillTreeV6Preprocessor } from "./preprocessors/SkillTreeV6Preprocessor";
import { SkillTreeV7Preprocessor } from "./preprocessors/SkillTreeV7Preprocessor";
import { SkillTreeV8Preprocessor } from "./preprocessors/SkillTreeV8Preprocessor";
import { SkillTreeV9Preprocessor } from "./preprocessors/SkillTreeV9Preprocessor";

export class SkillTreePreprocessors {
    private static _preprocessors: Array<ISkillTreePreprocessor> = [
        new SkillTreeV1Preprocessor(),
        new SkillTreeV2Preprocessor(),
        new SkillTreeV3Preprocessor(),
        new SkillTreeV4Preprocessor(),
        new SkillTreeV5Preprocessor(),
        new SkillTreeV6Preprocessor(),
        new SkillTreeV7Preprocessor(),
        new SkillTreeV8Preprocessor(),
        new SkillTreeV9Preprocessor(),
        new SkillTreeV10Preprocessor(),
        new SkillTreeV11Preprocessor(),
        new SkillTreeV12Preprocessor(),
        new SkillTreeOptionsPreprocessor(),
        new SkillTreePreprocessor()
    ];

    private static _optionsPreprocessors: Array<ISkillTreeOptionsPreprocessor> = [
        new SkillTreeOptionsV1Preprocessor()
    ];

    public static Decode(data: ISkillTreeBase, options: ISkillTreeOptionsBase | undefined): ISkillTreeData {
        if (options !== undefined) {
            for (const preprocessor of this._optionsPreprocessors) {
                if (preprocessor.CanProcess(options)) {
                    options = preprocessor.Process(options);
                }
            }
        }

        for (const preprocessor of this._preprocessors) {
            if (preprocessor.CanProcess(data, options)) {
                data = preprocessor.Process(data, options);
            }
        }

        return data as ISkillTreeData;
    }
}
