/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { setConfig as setHTTPConfig, useClient as useHTTPClient } from '@trapi/client';
import {
    HTTPClient,
    HarborAPI,
    refreshAuthRobotTokenOnResponseError, VaultAPI,
} from '@personalhealthtrain/central-common';
import https from 'https';
import { Environment } from './env';
import {buildMainComponentHandler} from "./components/main";

interface ConfigContext {
    env: Environment
}

export type Config = {
    aggregators: {start: () => void}[]
    components: {start: () => void}[]
};

function createConfig({ env } : ConfigContext) : Config {
    setHTTPConfig({
        clazz: HarborAPI,
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
        clazz: VaultAPI,
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
        refreshAuthRobotTokenOnResponseError,
    );

    const aggregators : {start: () => void}[] = [
    ];

    const components : {start: () => void}[] = [
        buildMainComponentHandler()
    ];

    return {
        aggregators,
        components,
    };
}

export default createConfig;
