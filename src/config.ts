/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ROBOT_SYSTEM_NAME, mountClientResponseErrorTokenHook } from '@authup/core';
import { setClient } from 'hapic';
import {
    APIClient,
} from '@personalhealthtrain/central-common';
import { HarborClient, setClient as setHarborClient } from '@hapic/harbor';
import type { Environment } from './env';
import { buildMainComponentHandler } from './components/main';

interface ConfigContext {
    env: Environment
}

export type Config = {
    aggregators: {start: () => void}[]
    components: {start: () => void}[]
};

function createConfig({ env } : ConfigContext) : Config {
    const harborClient = new HarborClient({
        connectionString: env.harborConnectionString,
    });
    setHarborClient(harborClient);

    const apiClient = new APIClient({
        baseURL: env.apiUrl,
    });

    mountClientResponseErrorTokenHook(apiClient, {
        baseURL: env.apiUrl,
        tokenCreator: {
            type: 'robotInVault',
            name: ROBOT_SYSTEM_NAME,
            vault: env.vaultConnectionString,
        },
    });
    setClient(apiClient);

    const aggregators : {start: () => void}[] = [
    ];

    const components : {start: () => void}[] = [
        buildMainComponentHandler(),
    ];

    return {
        aggregators,
        components,
    };
}

export default createConfig;
