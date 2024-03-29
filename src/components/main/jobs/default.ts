/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parentPort } from 'node:worker_threads';
import process from 'node:process';
import { useClient } from 'hapic';
import { parseConnectionString, useClient as useHarborClient } from '@hapic/harbor';
import type { APIClient } from '@personalhealthtrain/central-common';
import {
    Ecosystem,
    RegistryProjectType,
} from '@personalhealthtrain/central-common';
import { URL } from 'url';
import createConfig from '../../../config';

import env from '../../../env';
import { pullDockerImage } from '../helpers/image-pull';
import { pushDockerImages } from '../helpers/image-push';
import type { DockerAuthConfig } from '../helpers/type';

createConfig({ env });

(async () => {
    try {
        console.log('Start station scanning...');

        const harborClient = useHarborClient();
        const harborConfig = parseConnectionString(env.harborConnectionString);
        const harborUrL = new URL(harborConfig.host);

        const { data: projects } = await useClient<APIClient>().registryProject.getMany({
            filter: {
                type: RegistryProjectType.STATION,
                ecosystem: Ecosystem.DEFAULT,
            },
            fields: ['+account_name', '+account_secret', '+external_name'],
        });

        for (let i = 0; i < projects.length; i++) {
            console.log(`Scanning station: ${projects[i].name} (${projects[i].external_name})...`);
            const authConfig: DockerAuthConfig = {
                serveraddress: harborUrL.hostname,
                username: projects[i].account_name,
                password: projects[i].account_secret,
            };

            if (!projects[i].account_name || !projects[i].account_secret) {
                console.log(`Skipping station: ${projects[i].name}...`);
                continue;
            }

            const projectName = projects[i].external_name;
            const { data: repositories } = await harborClient.projectRepository.getMany({ projectName });

            for (let j = 0; j < repositories.length; j++) {
                if (repositories[j].artifact_count < 2) {
                    continue;
                }

                const fullPath = `${harborUrL.hostname}/${repositories[j].name}:latest`;

                console.log(`Pulling: ${fullPath}...`);
                await pullDockerImage(fullPath, authConfig);
                console.log(`Pulled: ${fullPath}.`);

                console.log(`Pushing: ${fullPath}...`);
                await pushDockerImages(fullPath, authConfig);

                console.log(`Pushed train: ${fullPath}.`);
            }

            console.log(`Scanned station: ${projects[i].name} (${projects[i].external_name}).`);

            const repositoriesWithArtifact = repositories.filter((repository) => repository.artifact_count === 2);
            if (repositoriesWithArtifact.length > 0) {
                break;
            }
        }

        if (parentPort) {
            parentPort.postMessage('done');
        } else {
            process.exit(0);
        }
    } catch (e) {
        console.log(e);

        process.exit(0);
    }
})();
