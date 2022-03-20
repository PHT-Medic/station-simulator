/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Bree, {JobOptions} from 'bree';
import path from "path";

export function buildMainComponentHandler() {
    async function  start() {
        const bree = new Bree({
            root: path.join(__dirname, 'jobs'),
            defaultExtension: 'ts',
            jobs: [
                {
                    name: 'default',
                    interval: '30s'
                }
            ]
        });

        bree.start();
    }

    return {
        start
    }
}
