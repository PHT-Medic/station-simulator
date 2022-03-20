/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parentPort } from 'node:worker_threads';
import process from 'node:process';
import {useClient} from "@trapi/client";
import {
    buildRegistryStationProjectName,
    HarborAPI,
    HTTPClient,
    parseHarborConnectionString,
} from "@personalhealthtrain/central-common";
import createConfig from "../../../config";

import env from "../../../env";
import {URL} from "url";
import {pullDockerImage} from "../helpers/image-pull";
import {pushDockerImages} from "../helpers/image-push";
import {DockerAuthConfig} from "../helpers/type";
createConfig({env});

(async () => {
    console.log('Start station scanning...');

    const harborClient = useClient<HarborAPI>('harbor');
    const harborConfig = parseHarborConnectionString(env.harborConnectionString);
    const harborUrL = new URL(harborConfig.host);

    const {data: stations} = await useClient<HTTPClient>().station.getMany({
        fields: ['+secure_id', '+registry_project_account_name', '+registry_project_account_token']
    });

    for(let i=0; i<stations.length; i++) {
        console.log('Scanning station: '+stations[i].name+' ('+stations[i].secure_id+')...');
        const authConfig : DockerAuthConfig = {
            serveraddress: harborUrL.hostname,
            username: stations[i].registry_project_account_name,
            password: stations[i].registry_project_account_token
        };

        if(!stations[i].registry_project_account_name || !stations[i].registry_project_account_token) {
            console.log('Skipping station: '+stations[i].name+'...', stations[i]);
            continue;
        }

        const projectName = buildRegistryStationProjectName(stations[i].secure_id);
        const repositories = await harborClient.projectRepository.getOne(projectName);

        for(let j=0; j<repositories.length; j++) {
            if(repositories[j].artifactCount !== 2) {
                continue;
            }

            const fullPath = `${harborUrL.hostname}/${projectName}/${repositories[j].name}:latest`;

            console.log('Pulling: '+fullPath+'...');
            await pullDockerImage(fullPath, authConfig);
            console.log('Pulled: '+fullPath+'.');

            console.log('Pushing: '+fullPath+'...');
            await pushDockerImages(fullPath, authConfig);

            console.log('Pushed train: '+fullPath+'.');
        }

        console.log('Scanned station: '+stations[i].name+' ('+stations[i].secure_id+').');

        const repositoriesWithArtifact = repositories.filter(repository => repository.artifactCount === 2);
        if(repositoriesWithArtifact.length > 0) {
            break;
        }
    }

    if (parentPort) {
        parentPort.postMessage('done')
    } else {
        process.exit(0);
    }
})();
