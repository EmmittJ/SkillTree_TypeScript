"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SkillNode = /** @class */ (function () {
    function SkillNode(node, group, orbitRadii, skillsPerOrbit) {
        var _this = this;
        this.getArc = function () { return _this.skillsPerOrbit.length > _this.o ? 2 * Math.PI * _this.oidx / _this.skillsPerOrbit[_this.o] : 0; };
        this.getX = function () { return _this.orbitRadii.length > _this.o ? _this.group.x - _this.orbitRadii[_this.o] * Math.sin(-_this.getArc()) : 0; };
        this.getY = function () { return _this.orbitRadii.length > _this.o ? _this.group.y - _this.orbitRadii[_this.o] * Math.cos(-_this.getArc()) : 0; };
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
    return SkillNode;
}());
exports.SkillNode = SkillNode;
//# sourceMappingURL=SkillNode.js.map