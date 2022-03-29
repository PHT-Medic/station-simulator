/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useDocker } from '../../../config/docker';
import { DockerAuthConfig } from './type';

export async function pullDockerImage(
    path: string,
    authConfig: DockerAuthConfig,
) {
    const stream = await useDocker()
        .pull(path, { authconfig: authConfig });

    return new Promise<any>(((resolve, reject) => {
        useDocker().modem.followProgress(stream, (error: Error, output: any) => {
            if (error) {
                reject(error);
            }

            resolve(output);
        }, (e: any) => e);
    }));
}
