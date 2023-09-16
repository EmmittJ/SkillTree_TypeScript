/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { SemVer } from "semver";
import { App } from "./app";
import { versions } from '../models/versions/verions';

window.onload = async () => {
    const query = App.decodeURLParams(window.location.search);

    const versionsJson: IVersions = {
        versions: []
    }
    const semversions = Object.fromEntries(Object.entries(versions))
    for (const key in semversions) {
        const value = semversions[key];
        if (!(value instanceof SemVer)) {
            continue
        }
        versionsJson.versions.push(value.version)
    }

    if (versionsJson.versions.indexOf(query['v']) === -1) {
        query['v'] = versionsJson.versions[versionsJson.versions.length - 1];
    }

    if (!query['c']) {
        query['c'] = '';
    }

    App.ChangeSkillTreeVersion(query['v'], query['c'], window.location.hash);
    new App().launch(query['v'], query['c'], versionsJson);
};