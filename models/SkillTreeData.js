"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SkillNode_1 = require("./SkillNode");
var SkillTreeData = /** @class */ (function () {
    function SkillTreeData(skillTree) {
        this.characterData = skillTree.characterData;
        this.groups = skillTree.groups;
        this.root = skillTree.root;
        this.extraImages = skillTree.extraImages;
        this.min_x = skillTree.min_x;
        this.max_x = skillTree.max_x;
        this.min_y = skillTree.min_y;
        this.max_y = skillTree.max_y;
        this.assets = skillTree.assets;
        this.imageRoot = skillTree.imageRoot;
        this.imageZoomLevels = skillTree.imageZoomLevels;
        this.skillSprites = skillTree.skillSprites;
        this.constants = skillTree.constants;
        this.width = Math.abs(this.min_x) + Math.abs(this.max_x);
        this.height = Math.abs(this.min_y) + Math.abs(this.max_y);
        this.nodes = {};
        for (var id in skillTree.nodes) {
            this.nodes[id]
                = new SkillNode_1.SkillNode(skillTree.nodes[id], skillTree.groups[skillTree.nodes[id].g], skillTree.constants.orbitRadii, skillTree.constants.skillsPerOrbit);
        }
    }
    return SkillTreeData;
}());
exports.SkillTreeData = SkillTreeData;
//# sourceMappingURL=SkillTreeData.js.map