import '../content/app.css';

import { SkillTreeData } from "../models/SkillTreeData";
import { SkillTreeEvents } from "../models/SkillTreeEvents";
import { ISkillTreeRenderer } from '../models/types/ISkillTreeRenderer';
import { PIXISkillTreeRenderer } from '../models/PIXISkillTreeRenderer';
import download = require("downloadjs");
import { SkillTreeAlternate } from '../models/SkillTreeAlternate';
import { SkillTreeUtilities } from '../models/SkillTreeUtilities';
import { SkillNode } from '../models/SkillNode';
import { utils } from './utils';

export class App {
    private skillTreeData!: SkillTreeData;
    private skillTreeDataCompare: SkillTreeData | undefined;
    private skillTreeAlternate!: SkillTreeAlternate;
    private skillTreeUtilities!: SkillTreeUtilities;
    private renderer: ISkillTreeRenderer;

    constructor() {
        this.renderer = new PIXISkillTreeRenderer();
    }

    public launch = async (version: string, versionCompare: string, versionJson: IVersions) => {
        for (const i of [version, versionCompare]) {
            if (i === '') {
                continue;
            }

            const options: ISkillTreeOptions | undefined = await fetch(`${utils.SKILL_TREES_URI}/${i}/Opts.json`).then(response => response.status === 200 ? response.json() : undefined);
            const data = new SkillTreeData(await fetch(`${utils.SKILL_TREES_URI}/${i}/SkillTree.json`).then(response => response.json()), i, options);

            if (i === version) {
                this.skillTreeData = data;
                this.skillTreeAlternate = new SkillTreeAlternate(await fetch(`${utils.SKILL_TREES_URI}/${i}/SkillTreeAlternate.json`).then(response => response.ok ? response.json() : undefined));
            }

            if (i === versionCompare) {
                this.skillTreeDataCompare = data;
            }
        }
        this.skillTreeUtilities = new SkillTreeUtilities(this.skillTreeData, this.skillTreeAlternate);

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

        const go = document.getElementById("skillTreeControl_VersionGo") as HTMLSelectElement;
        go.addEventListener("click", () => {
            let search = '?';
            if (versionSelect.value !== '0') {
                search += `v=${versionSelect.value}`;
            }

            if (!search.endsWith('?') && compareSelect.value !== '0') search += '&';

            if (compareSelect.value !== '0') {
                search += `c=${compareSelect.value}`;
            }

            window.location.search = search;
        });

        const container = document.getElementById("skillTreeContainer");
        if (container !== null) {
            this.renderer.Initialize(container, this.skillTreeData, this.skillTreeAlternate, this.skillTreeDataCompare)
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
                .catch((reason) => alert(`There was an issue initializing the renderer\n${reason}`));
        }
    }

    private SetupEventsAndControls = () => {
        SkillTreeEvents.on("skilltree", "highlighted-nodes-update", this.renderer.RenderHighlight);
        SkillTreeEvents.on("skilltree", "class-change", this.renderer.RenderCharacterStartsActive);

        SkillTreeEvents.on("skilltree", "hovered-nodes-start", this.renderer.StartRenderHover);
        SkillTreeEvents.on("skilltree", "hovered-nodes-end", this.renderer.StopRenderHover);
        SkillTreeEvents.on("skilltree", "active-nodes-update", this.renderer.RenderActive);

        SkillTreeEvents.on("skilltree", "normal-node-count", (count: number) => { const e = document.getElementById("skillTreeNormalNodeCount"); if (e !== null) e.innerHTML = count.toString(); });
        SkillTreeEvents.on("skilltree", "normal-node-count-maximum", (count: number) => { const e = document.getElementById("skillTreeNormalNodeCountMaximum"); if (e !== null) e.innerHTML = count.toString(); });
        SkillTreeEvents.on("skilltree", "ascendancy-node-count", (count: number) => { const e = document.getElementById("skillTreeAscendancyNodeCount"); if (e !== null) e.innerHTML = count.toString(); });
        SkillTreeEvents.on("skilltree", "ascendancy-node-count-maximum", (count: number) => { const e = document.getElementById("skillTreeAscendancyNodeCountMaximum"); if (e !== null) e.innerHTML = count.toString(); });

        SkillTreeEvents.on("skilltree", "jewel-click-start", this.showJewelPopup);
        SkillTreeEvents.on("skilltree", "faction-node-start", this.showNodePopup);

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

    private showNodePopup = (event: { node: SkillNode; choices: ISkillNodeAlternate[] }) => {
        const popup = document.getElementById("skillTreeAlternateNodePopup") as HTMLDivElement;
        if (event.choices.length > 1) {
            popup.style.removeProperty('display');
        } else {
            popup.style.setProperty('display', 'none');
        }

        const replaceSelect = document.getElementById("skillTreeAlternateNodePopupReplace") as HTMLSelectElement;
        const _onchange = () => {
            const altIds: ISkillNodeAlternateState[] = [];
            if ((replaceSelect).value !== "") {
                altIds.push({ id: replaceSelect.value, values: [] } as ISkillNodeAlternateState);
            }

            for (const i of [1, 2, 3, 4]) {
                const additionSelect = document.getElementById(`skillTreeAlternateNodePopupAdditional${i}`) as HTMLSelectElement;
                if (additionSelect === null || additionSelect.value === "") {
                    continue;
                }
                altIds.push({ id: additionSelect.value, values: [] } as ISkillNodeAlternateState);
            }

            SkillTreeEvents.fire("skilltree", "faction-node-end", {
                nodeId: event.node.id,
                alteranteIds: altIds
            });
        };

        const altIds: string[] = JSON.parse(JSON.stringify(event.node.alternateIds || []));
        replaceSelect.onchange = _onchange;
        if (replaceSelect !== null) {
            while (replaceSelect.firstChild) {
                replaceSelect.removeChild(replaceSelect.firstChild);
            }

            const o = document.createElement("option");
            o.value = "";
            o.text = "None";
            replaceSelect.appendChild(o);

            for (const c of event.choices) {
                if (c.isAddition) {
                    continue;
                }

                const o = document.createElement("option");
                o.value = c.id;
                o.text = c.name;
                if (altIds.indexOf(c.id) > -1) {
                    o.selected = true;
                    altIds.splice(altIds.indexOf(c.id), 1);
                }
                replaceSelect.appendChild(o);
            }
        }

        const vaal = document.getElementById("skillTreeAlternateNodePopupVaalRequired");
        if (vaal !== null) {
            if (event.node.faction === 1) {
                vaal.style.removeProperty('display');
            }
            else {
                vaal.style.setProperty('display', 'none');
            }
        }

        for (const i of [1, 2, 3, 4]) {
            const additionSelect = document.getElementById(`skillTreeAlternateNodePopupAdditional${i}`) as HTMLSelectElement;
            const additionLabel = document.getElementById(`skillTreeAlternateNodePopupAdditional${i}Label`);
            if (additionSelect === null) {
                continue;
            }
            additionSelect.style.setProperty('display', 'none');
            additionSelect.onchange = _onchange;

            if (additionLabel !== null) {
                additionLabel.style.setProperty('display', 'none');
            }

            while (additionSelect.firstChild) {
                additionSelect.removeChild(additionSelect.firstChild);
            }

            const o = document.createElement("option");
            o.value = "";
            o.text = "None";
            additionSelect.appendChild(o);

            let selected = false;
            for (const c of event.choices) {
                if (!c.isAddition) {
                    continue;
                }

                const o = document.createElement("option");
                o.value = c.id;
                o.text = c.stats.map(x => x.text).join('\n');
                if (!selected && altIds.indexOf(c.id) > -1) {
                    o.selected = true;
                    selected = true;
                    altIds.splice(altIds.indexOf(c.id), 1);
                }
                additionSelect.appendChild(o);
                additionSelect.style.removeProperty('display');
                if (additionLabel !== null) {
                    additionLabel.style.removeProperty('display');
                }
            }
        }

        const button = document.getElementById("skillTreeAlternateNodePopupOk") as HTMLButtonElement;
        button.onclick = () => {
            popup.style.setProperty('display', 'none');
            _onchange();
        };
    }

    private seedTimeout: number | null = null;
    private showJewelPopup = (settings: ISkillTreeAlternateJewelSettings) => {
        const sizeSelect = document.getElementById("skillTreeJewelPopupSize") as HTMLSelectElement;
        const factionSelect = document.getElementById("skillTreeJewelPopupFaction") as HTMLSelectElement;
        const nameSelect = document.getElementById("skillTreeJewelPopupName") as HTMLSelectElement;
        const seedInput = document.getElementById("skillTreeJewelPopupSeed") as HTMLInputElement;
        const factionDiv = document.getElementById('skillTreeJewelPopupFactionRequired') as HTMLDivElement;

        if (factionSelect.children.length === 0) {
            for (const i in this.skillTreeAlternate.factions) {
                const o = document.createElement('option');
                o.value = i;
                o.text = this.skillTreeAlternate.factions[i].name;
                factionSelect.appendChild(o);
            }
        }

        if (settings.size !== undefined) {
            sizeSelect.value = settings.size;
        }

        if (settings.factionId !== undefined) {
            factionSelect.value = settings.factionId.toString();
        }

        if (settings.seed !== undefined) {
            seedInput.value = settings.seed;
        }

        if (settings.name !== undefined) {
            nameSelect.value = settings.name;
        }

        const _onchange = () => {
            if (factionDiv !== null) {
                if (factionSelect.value !== "0") {
                    factionDiv.style.removeProperty('display');
                    sizeSelect.value = "Large";
                    sizeSelect.disabled = true;
                } else {
                    factionDiv.style.setProperty('display', 'none');
                    sizeSelect.disabled = false;
                }
            }

            if (this.skillTreeAlternate.alternate_tree_keystones[+factionSelect.value] === undefined || !(nameSelect.value in this.skillTreeAlternate.alternate_tree_keystones[+factionSelect.value])) {
                while (nameSelect.firstChild) {
                    nameSelect.removeChild(nameSelect.firstChild);
                }
            }

            if (nameSelect.children.length === 0) {
                for (const i in this.skillTreeAlternate.alternate_tree_keystones[+factionSelect.value]) {
                    const o = document.createElement('option');
                    o.value = i;
                    o.text = i;
                    nameSelect.appendChild(o);
                }
            }

            SkillTreeEvents.fire("skilltree", "jewel-click-end",
                {
                    nodeId: settings.nodeId,
                    size: sizeSelect.value,
                    factionId: sizeSelect.value !== "None" ? +factionSelect.value : 0,
                    seed: seedInput.value,
                    name: nameSelect.value
                } as ISkillTreeAlternateJewelSettings
            );
        };

        _onchange();
        factionSelect.onchange = _onchange;
        sizeSelect.onchange = _onchange;
        nameSelect.onchange = _onchange;
        seedInput.onkeyup = () => {
            if (this.seedTimeout !== null) {
                clearTimeout(this.seedTimeout);
            }

            this.seedTimeout = setTimeout(_onchange, 250);
        };

        const popup = document.getElementById("skillTreeJewelPopup") as HTMLDivElement;
        popup.style.removeProperty('display');
        const button = document.getElementById("skillTreeJewelPopupOk") as HTMLButtonElement;
        button.onclick = () => {
            popup.style.setProperty('display', 'none');
            _onchange();
        };
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
            e.text = this.skillTreeData.constants.classIdToName[classId];
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

    private searchTimout: number | null = null;
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