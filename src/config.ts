/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Robot } from '@authelion/common';
import { setConfig as setHTTPConfig, useClient, useClient as useHTTPClient } from 'hapic';
import {
    HTTPClient,
    ROBOT_SECRET_ENGINE_KEY,
    ServiceID,
    createRefreshRobotTokenOnResponseErrorHandler,
} from '@personalhealthtrain/central-common';
import https from 'https';
import { Client as VaultClient } from '@hapic/vault';
import { Client as HarborClient } from '@hapic/harbor';
import { Environment } from './env';
import { buildMainComponentHandler } from './components/main';

interface ConfigContext {
    env: Environment
}

export type Config = {
    aggregators: {start: () => void}[]
    components: {start: () => void}[]
};

function createConfig({ env } : ConfigContext) : Config {
    setHTTPConfig({
        clazz: HarborClient,
        driver: {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
        },
        extra: {
            connectionString: env.harborConnectionString,
        },
    }, 'harbor');

    setHTTPConfig({
        clazz: VaultClient,
        driver: {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
        },
        extra: {
            connectionString: env.vaultConnectionString,
        },
    }, 'vault');

    setHTTPConfig({
        clazz: HTTPClient,
        driver: {
            baseURL: env.apiUrl,
            withCredentials: true,
        },
    });

    useHTTPClient().mountResponseInterceptor(
        (value) => value,
        createRefreshRobotTokenOnResponseErrorHandler({
            async load() {
                return useClient<VaultClient>('vault').keyValue
                    .find(ROBOT_SECRET_ENGINE_KEY, ServiceID.SYSTEM)
                    .then((response) => response.data as Robot);
            },
            httpClient: useClient(),
        }),
    );

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
