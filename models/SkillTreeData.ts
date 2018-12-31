import { SkillNode } from "./SkillNode";
import { Constants } from "./Constants";

export class SkillTreeData implements ISkillTreeData {
    characterData: { [id: string]: ICharacter };
    groups: { [id: string]: IGroup };
    root: IRootNode;
    nodes: { [id: string]: SkillNode };
    extraImages: { [id: string]: IClassImage };
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
    assets: { [id: string]: { [zoomLevel: string]: string } };
    imageRoot: string;
    imageZoomLevels: Array<number>;
    skillSprites: { [id: string]: Array<ISpriteSheet> };
    constants: Constants;
    width: number;
    height: number;

    constructor(skillTree: ISkillTreeData, options: ISkillTreeOptions) {
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
        this.skillSprites = skillTree.skillSprites
        this.constants = new Constants(skillTree.constants);
        this.width = Math.abs(this.min_x) + Math.abs(this.max_x);
        this.height = Math.abs(this.min_y) + Math.abs(this.max_y);

        // Setup in/out properties correctly
        {
            for (let id in skillTree.nodes) {
                skillTree.nodes[id].in = [];
            }
            for (let id in skillTree.nodes) {
                if (skillTree.nodes[id].m) {
                    continue;
                }
                for (let outId of skillTree.nodes[id].out) {
                    if (skillTree.nodes[id].in.indexOf(outId) < 0) {
                        skillTree.nodes[id].in.push(outId);
                    }
                    if (skillTree.nodes[outId].out.indexOf(+id) < 0) {
                        skillTree.nodes[outId].out.push(+id);
                    }
                }
                for (let inId of skillTree.nodes[id].in) {
                    if (skillTree.nodes[id].out.indexOf(inId) < 0) {
                        skillTree.nodes[id].out.push(inId);
                    }
                    if (skillTree.nodes[inId].in.indexOf(+id) < 0) {
                        skillTree.nodes[inId].in.push(+id);
                    }
                }
            }
        }

        let scale = skillTree.imageZoomLevels[skillTree.imageZoomLevels.length - 1];
        this.nodes = {};
        for (let id in skillTree.nodes) {
            let node
                = new SkillNode(
                    skillTree.nodes[id],
                    skillTree.groups[skillTree.nodes[id].g],
                    skillTree.constants.orbitRadii,
                    skillTree.constants.skillsPerOrbit,
                    scale);
            if (node.spc.length > 0 && node.spc.indexOf(options.startClass) >= 0) {
                node.isActive = true;
            }

            //TODO: Create class to handle node events
            node.click = () => {
                if (node.spc.length > 0 || node.m) {
                    return;
                }
                if (node.isActive) {
                    for (let i of this.getRefundNodes(this.nodes, node)) {
                        if (i.spc.length > 0) {
                            continue;
                        }
                        i.isActive = false;
                    }
                } else {
                    for (let i of this.getShortestPath(this.nodes, node)) {
                        if (!i.isActive) {
                            i.isActive = true;
                        }
                    }
                }
                for (let id in this.getHoveredNodes(this.nodes)) {
                    this.nodes[id].isHovered = false;
                    this.nodes[id].isPath = false;
                }
            }

            node.mouseover = () => {
                for (let i of this.getShortestPath(this.nodes, node)) {
                    if (!i.isPath && !i.isActive) {
                        i.isPath = true;
                    }
                }
                node.isHovered = true;

                for (let i of this.getRefundNodes(this.nodes, node)) {
                    i.isPath = true;
                }
            };

            node.mouseout = () => {
                for (let id in this.getHoveredNodes(this.nodes)) {
                    this.nodes[id].isHovered = false;
                    this.nodes[id].isPath = false;
                }
            }

            this.nodes[id] = node;
        }
    }

    private getShortestPath = (nodes: { [id: string]: SkillNode }, target: SkillNode): Array<SkillNode> => {
        let skilled = this.getSkilledNodes(nodes);
        if (skilled[target.id]) {
            return new Array<SkillNode>();
        }

        let frontier: Array<SkillNode> = [];
        let distance: { [id: string]: number } = {};
        let adjacent = this.getAdjacentNodes(nodes, skilled);
        for (let id in adjacent) {
            if (id === target.id.toString()) {
                let path = new Array<SkillNode>();
                path.push(target);
                return path;
            }
            frontier.push(adjacent[id]);
            distance[id] = 1;
        }

        let explored = skilled;
        let prev: { [id: string]: SkillNode } = {};
        while (frontier.length > 0) {
            let current = frontier.shift();
            if (current === undefined) {
                continue;
            }

            explored[current.id] = current;
            let dist = distance[current.id];
            for (let id of current.out) {
                let out = nodes[id];
                if ((current.ascendancyName === "" && out.ascendancyName !== "" && !out.isActive)
                    || (current.ascendancyName !== "" && out.ascendancyName === "" && !current.isActive)) {
                    continue;
                }
                if (explored[id] || distance[id]) {
                    continue;
                }
                if (out.m) {
                    continue;
                }
                if (out.isAscendancyStart && !out.isActive) {
                    continue;
                }
                if (out.spc.length > 0 && !out.isActive) {
                    continue;
                }

                distance[id] = dist + 1;
                prev[id] = current;
                frontier.push(out);
                if (out.id === target.id) {
                    frontier.length = 0;
                }
            }
        }

        if (distance[target.id.toString()] === undefined) {
            return new Array<SkillNode>();
        }

        let current: SkillNode | undefined = target;
        let path = new Array<SkillNode>();
        while (current !== undefined) {
            path.push(current);
            current = prev[current.id];
        }
        return path.reverse();
    }

    private getRefundNodes = (nodes: { [id: string]: SkillNode }, source: SkillNode): Array<SkillNode> => {
        if (!source.isActive) {
            return new Array<SkillNode>();
        }

        let characterStartNode: SkillNode | undefined = undefined;
        for (let id in nodes) {
            if (nodes[id].isActive && nodes[id].spc.length > 0) {
                characterStartNode = nodes[id];
            }
        }
        if (characterStartNode === undefined) {
            return new Array<SkillNode>();
        }

        let frontier = new Array<SkillNode>();
        let reachable: { [id: string]: SkillNode } = {};
        for (let id of characterStartNode.out) {
            if (nodes[id].isActive && nodes[id].id !== source.id) {
                frontier.push(nodes[id]);
                reachable[id] = nodes[id];
            }
        }

        while (frontier.length > 0) {
            let nextFrontier = new Array<SkillNode>();
            for (let node of frontier) {
                for (let id of node.out) {
                    let out = nodes[id];
                    if (out.id === source.id || reachable[id] || !out.isActive) {
                        continue;
                    }

                    nextFrontier.push(out);
                    reachable[id] = out;
                }
            }

            frontier = nextFrontier;
        }

        let unreachable = new Array<SkillNode>();
        let skilledNodes = this.getSkilledNodes(nodes);
        console.log(skilledNodes);
        for (let id in skilledNodes) {
            if (reachable[id] === undefined) {
                unreachable.push(nodes[id]);
            }
        }
        return unreachable;
    }

    private getSkilledNodes = (nodes: { [id: string]: SkillNode }): { [id: string]: SkillNode } => {
        let skilled: { [id: string]: SkillNode } = {};
        for (let id in nodes) {
            if (nodes[id].isActive) {
                skilled[id] = nodes[id];
            }
        }
        return skilled;
    }

    private getHoveredNodes = (nodes: { [id: string]: SkillNode }): { [id: string]: SkillNode } => {
        let hovered: { [id: string]: SkillNode } = {};
        for (let id in nodes) {
            if (nodes[id].isHovered || nodes[id].isPath) {
                hovered[id] = nodes[id];
            }
        }
        return hovered;
    }

    private getAdjacentNodes = (nodes: { [id: string]: SkillNode }, start: { [id: string]: SkillNode }): { [id: string]: SkillNode } => {
        let adjacentNodes: { [id: string]: SkillNode } = {};
        for (let parent in start) {
            for (let id of start[parent].out) {
                if (nodes[id].spc.length > 0 && !nodes[id].isActive) {
                    continue;
                }
                adjacentNodes[id] = nodes[id];
            }
        }
        return adjacentNodes;
    }
}