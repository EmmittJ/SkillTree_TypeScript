import '../content/app.css';

import { SkillTreeData } from "../models/SkillTreeData";
import { SkillTreeEvents } from "../models/SkillTreeEvents";
import { ISkillTreeRenderer } from '../models/types/ISkillTreeRenderer';
import { PIXISkillTreeRenderer } from '../models/PIXISkillTreeRenderer';
import download = require("downloadjs");
import { SkillTreeUtilities } from '../models/SkillTreeUtilities';
import { SkillNode, SkillNodeStates } from '../models/SkillNode';
import { utils } from './utils';

export class App {
    private skillTreeData!: SkillTreeData;
    private skillTreeDataCompare: SkillTreeData | undefined;
    private skillTreeUtilities!: SkillTreeUtilities;
    private renderer!: ISkillTreeRenderer;

    public launch = async (version: string, versionCompare: string, versionJson: IVersions) => {
        for (const i of [version, versionCompare]) {
            if (i === '') {
                continue;
            }

            const options: ISkillTreeOptions | undefined = await fetch(`${utils.SKILL_TREES_URI}/${i}/Opts.json`).then(response => response.status === 200 ? response.json() : undefined);
            const data = new SkillTreeData(await fetch(`${utils.SKILL_TREES_URI}/${i}/SkillTree.json`).then(response => response.json()), i, options);

            if (i === version) {
                this.skillTreeData = data;
            }

            if (i === versionCompare) {
                this.skillTreeDataCompare = data;
            }
        }
        this.skillTreeUtilities = new SkillTreeUtilities(this.skillTreeData, this.skillTreeDataCompare);

        const versionSelect = document.getElementById("skillTreeControl_Version") as HTMLSelectElement;
        const compareSelect = document.getElementById("skillTreeControl_VersionCompare") as HTMLSelectElement;
        for (const ver of versionJson.versions) {
            const v = document.createElement("option");
            v.text = v.value = ver;
            if (ver === version) {
                v.setAttribute('selected', 'selected');
            }
            versionSelect.appendChild(v);

            const c = document.createElement("option");
            c.text = c.value = ver;
            if (ver === versionCompare) {
                c.setAttribute('selected', 'selected');
            }
            compareSelect.appendChild(c);
        }

        const controls = document.getElementsByClassName("skillTreeVersions") as HTMLCollectionOf<HTMLDivElement>;
        for (const i in controls) {
            if (controls[i].style !== undefined) {
                controls[i].style.removeProperty('display');
            }
        }

        const go = document.getElementById("skillTreeControl_VersionGo") as HTMLButtonElement;
        go.addEventListener("click", () => {
            let search = '?';
            if (versionSelect.value !== '0') {
                search += `v=${versionSelect.value}`;
            }

            if (!search.endsWith('?') && compareSelect.value !== '0') search += '&';

            if (compareSelect.value !== '0') {
                search += `c=${compareSelect.value}`;
            }

            window.location.hash = "";
            window.location.search = search;
        });


        const reset = document.getElementById("skillTreeControl_Reset") as HTMLButtonElement;
        reset.addEventListener("click", () => {
            const start = this.skillTreeData.getStartClass();
            const asc = this.skillTreeData.getAscendancyClass();

            this.skillTreeData.clearState(SkillNodeStates.Active);

            SkillTreeEvents.fire("controls", "class-change", start);
            SkillTreeEvents.fire("controls", "ascendancy-class-change", asc);
        });

        const showhide = document.getElementById("skillTreeStats_ShowHide") as HTMLButtonElement;
        showhide.addEventListener("click", () => {
            const content = document.getElementById("skillTreeStats_Content") as HTMLDivElement;
            const stats = document.getElementById("skillTreeStats") as HTMLDivElement;
            if (content.toggleAttribute('hidden')) {
                stats.style.setProperty('height', 'fit-content');
            } else {
                stats.style.setProperty('height', '95vh');
            }
        });

        const container = document.getElementById("skillTreeContainer");
        if (container !== null) {
            this.renderer = new PIXISkillTreeRenderer(container, this.skillTreeData, this.skillTreeDataCompare);
            this.renderer.Initialize()
                .then(() => {
                    this.SetupEventsAndControls();
                    this.renderer.RenderBase();
                    this.skillTreeUtilities.decodeURL();
                    this.renderer.RenderCharacterStartsActive();

                    const screenshot = document.getElementById("skillTreeControl_Screenshot") as HTMLSelectElement;
                    screenshot.style.removeProperty('display');
                    screenshot.addEventListener("click", () => {
                        const mimeType: 'image/jpeg' = 'image/jpeg';
                        download(this.renderer.CreateScreenshot(mimeType), `${version.replace(/\./g, '')}_skilltree.jpg`, mimeType);
                    });
                })
                .catch((reason) => console.error(reason));
        }
    }

    private SetupEventsAndControls = () => {
        SkillTreeEvents.on("skilltree", "highlighted-nodes-update", this.renderer.RenderHighlight);
        SkillTreeEvents.on("skilltree", "class-change", this.renderer.RenderCharacterStartsActive);

        SkillTreeEvents.on("skilltree", "hovered-nodes-start", this.renderer.StartRenderHover);
        SkillTreeEvents.on("skilltree", "hovered-nodes-end", this.renderer.StopRenderHover);
        SkillTreeEvents.on("skilltree", "active-nodes-update", this.renderer.RenderActive);
        SkillTreeEvents.on("skilltree", "active-nodes-update", this.updateStats);

        SkillTreeEvents.on("skilltree", "normal-node-count", (count: number) => { const e = document.getElementById("skillTreeNormalNodeCount"); if (e !== null) e.innerHTML = count.toString(); });
        SkillTreeEvents.on("skilltree", "normal-node-count-maximum", (count: number) => { const e = document.getElementById("skillTreeNormalNodeCountMaximum"); if (e !== null) e.innerHTML = count.toString(); });
        SkillTreeEvents.on("skilltree", "ascendancy-node-count", (count: number) => { const e = document.getElementById("skillTreeAscendancyNodeCount"); if (e !== null) e.innerHTML = count.toString(); });
        SkillTreeEvents.on("skilltree", "ascendancy-node-count-maximum", (count: number) => { const e = document.getElementById("skillTreeAscendancyNodeCountMaximum"); if (e !== null) e.innerHTML = count.toString(); });

        this.populateStartClasses(document.getElementById("skillTreeControl_Class") as HTMLSelectElement);
        this.bindSearchBox(document.getElementById("skillTreeControl_Search") as HTMLInputElement);
        const controls = document.getElementsByClassName("skillTreeControls") as HTMLCollectionOf<HTMLDivElement>;
        for (const i in controls) {
            if (controls[i].style !== undefined) {
                controls[i].style.removeProperty('display');
            }
        }

        const points = document.getElementsByClassName("skillTreePoints") as HTMLCollectionOf<HTMLDivElement>;
        for (const i in points) {
            if (points[i].style !== undefined) {
                points[i].style.removeProperty('display');
            }
        }
    }

    private updateStats = () => {
        const defaultGroup = this.skillTreeData.tree === "Atlas" ? "Maps" : "Default";
        const groups: { [group: string]: string[] } = {};
        const stats: { [stat: string]: number } = {};

        const nodes = this.skillTreeData.getSkilledNodes();
        for (const id in nodes) {
            const node = nodes[id];
            for (const stat of node.stats) {
                if (stats[stat] === undefined) {
                    stats[stat] = 1;
                } else {
                    stats[stat] = stats[stat] + 1;
                }

                let set = false;
                if (node.nodeGroup !== undefined && node.nodeGroup.nodes !== undefined) {
                    for (const outId of node.nodeGroup.nodes) {
                        const out = this.skillTreeData.nodes[outId];
                        if (!out.isMastery) {
                            continue;
                        }

                        if (groups[out.name] === undefined) {
                            groups[out.name] = [];
                        }

                        set = true;
                        if (groups[out.name].indexOf(stat) === -1) {
                            groups[out.name].push(stat);
                        }
                        break;
                    }
                }

                if (!set) {
                    if (groups[defaultGroup] === undefined) {
                        groups[defaultGroup] = [];
                    }

                    if (groups[defaultGroup].indexOf(stat) === -1) {
                        groups[defaultGroup].push(stat);
                    }
                }

            }
        }

        const content = document.getElementById("skillTreeStats_Content") as HTMLDivElement;
        while (content.firstChild) {
            content.removeChild(content.firstChild);
        }

        for (const name of Object.keys(groups).sort((a, b) => a === defaultGroup ? -1 : (b === defaultGroup ? 1 : (a < b) ? -1 : 1))) {
            const groupStats: { [stat: string]: number } = {};
            for (const stat of groups[name]) {
                groupStats[stat] = stats[stat];
            }
            const div = this.createStatGroup(name, groupStats);
            content.appendChild(div);
        }
    }

    private createStatGroup = (name: string, stats: { [stat: string]: number }): HTMLDivElement => {
        const group = document.createElement("div");
        group.className = "group";

        const title = document.createElement("span");
        title.className = "title";
        title.innerText = name;
        title.addEventListener("click", () => {
            const elements = document.querySelectorAll(`[data-group-name*="${name}"]`);
            elements.forEach((element) => {
                element.toggleAttribute("hidden");
            })
        });

        group.appendChild(title);

        for (const stat of Object.keys(stats).sort()) {
            const num = stats[stat];
            group.appendChild(this.createStat(name, `${num}x ${stat}`));
        }

        return group;
    }

    private createStat = (group: string, stat: string): HTMLDivElement => {
        const div = document.createElement("div");
        div.className = "stat";
        div.innerText = stat;
        div.setAttribute("data-group-name", group);
        return div;
    }

    private populateStartClasses = (classControl: HTMLSelectElement) => {
        while (classControl.firstChild) {
            classControl.removeChild(classControl.firstChild);
        }

        const options = new Array<HTMLOptionElement>();
        for (const id in this.skillTreeData.classStartNodes) {
            const classId = this.skillTreeData.nodes[id].classStartIndex;
            if (classId === undefined) {
                continue;
            }
            const e = document.createElement("option");
            e.text = this.skillTreeData.root.out.length === 1 ? "Atlas" : this.skillTreeData.constants.classIdToName[classId];
            e.value = classId.toString();

            if (classId === this.skillTreeData.getStartClass()) {
                e.setAttribute("selected", "selected");
            }
            options.push(e);
        }

        options.sort((a, b) => {
            const first = a.value;
            const second = b.value;
            if (first !== null && second !== null) {
                return +first - +second;
            }
            return 0;
        });

        for (const e of options) {
            classControl.append(e);
        }

        const ascControl = document.getElementById("skillTreeControl_Ascendancy") as HTMLSelectElement;
        SkillTreeEvents.fire("controls", "class-change", +classControl.value);
        classControl.onchange = () => {
            const val = classControl.value;
            SkillTreeEvents.fire("controls", "class-change", +val);
            if (ascControl !== null) {
                this.populateAscendancyClasses(ascControl, +val, 0);
            }
        };

        if (ascControl !== null) {
            this.populateAscendancyClasses(ascControl);
        }
    }

    private populateAscendancyClasses = (ascControl: HTMLSelectElement, start: number | undefined = undefined, startasc: number | undefined = undefined) => {
        while (ascControl.firstChild) {
            ascControl.removeChild(ascControl.firstChild);
        }

        if (this.skillTreeData.classes.length === 0) {
            ascControl.style.display = "none";
            const e = document.getElementById("skillTreeAscendancy") as HTMLDivElement;
            if (e !== null) e.style.display = "none";
            return;
        }

        const ascStart = startasc !== undefined ? startasc : this.skillTreeData.getAscendancyClass();
        const none = document.createElement("option");
        none.text = "None";
        none.value = "0";
        if (ascStart === 0) {
            none.setAttribute("selected", "selected");
        }
        ascControl.append(none);

        const startClass = start !== undefined ? start : this.skillTreeData.getStartClass();
        if (this.skillTreeData.classes.length > 0) {
            const ascendancies = this.skillTreeData.classes[startClass].ascendancies;
            for (const ascid in ascendancies) {
                const asc = ascendancies[ascid];

                const e = document.createElement("option");
                e.text = asc.name;
                e.value = ascid;

                if (+ascid === ascStart) {
                    e.setAttribute("selected", "selected");
                }
                ascControl.append(e);
            }
        }

        ascControl.onchange = () => {
            SkillTreeEvents.fire("controls", "ascendancy-class-change", +ascControl.value);
        };
    }

    private searchTimout: NodeJS.Timeout | null = null;
    private bindSearchBox = (searchControl: HTMLInputElement) => {
        searchControl.onkeyup = () => {
            if (this.searchTimout !== null) {
                clearTimeout(this.searchTimout);
            }
            this.searchTimout = setTimeout(() => {
                SkillTreeEvents.fire("controls", "search-change", searchControl.value);
                this.searchTimout = null;
            }, 250);
        };
    }

    public static decodeURLParams = (search = ''): { [id: string]: string } => {
        const hashes = search.slice(search.indexOf("?") + 1).split("&");
        return hashes.reduce((params, hash) => {
            const split = hash.indexOf("=");

            if (split < 0) {
                return Object.assign(params, {
                    [hash]: null
                });
            }

            const key = hash.slice(0, split);
            const val = hash.slice(split + 1);

            return Object.assign(params, { [key]: decodeURIComponent(val) });
        }, {});
    };
}

window.onload = async () => {
    const query = App.decodeURLParams(window.location.search);

    const versionsJson: IVersions | undefined = await fetch(`${utils.DATA_URI}/versions.json?t=${(new Date()).getTime()}`).then(response => response.status === 200 ? response.json() : undefined);
    if (versionsJson === undefined || versionsJson.versions.length === 0) {
        console.error("Could not load skill tree versions!");
        return;
    }

    if (!query['v']) {
        query['v'] = versionsJson.versions[versionsJson.versions.length - 1];
    }

    if (!query['c']) {
        query['c'] = '';
    }

    new App().launch(query['v'], query['c'], versionsJson);
};