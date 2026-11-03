/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * OpenCRVS is also distributed under the terms of the Civil Registration
 * & Healthcare Disclaimer located at http://opencrvs.org/license.
 *
 * Copyright (C) The OpenCRVS Authors located at https://github.com/opencrvs/opencrvs-core/blob/master/AUTHORS.
 */
import { bool, cleanEnv, port, str, url } from 'envalid'

export const env = cleanEnv(process.env, {
  DOMAIN: str({ devDefault: '*' }),
  GATEWAY_URL: url({ devDefault: 'http://localhost:7070' }),
  LOGIN_URL: url({ devDefault: 'http://localhost:3020/' }),
  CLIENT_APP_URL: url({ devDefault: 'http://localhost:3000/' }),
  COUNTRY_CONFIG_HOST: str({ default: '0.0.0.0' }),
  COUNTRY_CONFIG_PORT: port({ default: 3040 }),
  AUTH_URL: url({ devDefault: 'http://localhost:4040' }),
  COUNTRY_CONFIG_URL: url({ devDefault: 'http://localhost:3040' }),
  TWO_FA_ENABLED: bool({ default: true }),
  OPENCRVS_ENVIRONMENT: str({ devDefault: 'development' }),
  EVENTS_URL: url({ devDefault: 'http://localhost:5555/' }),
  ANALYTICS_DATABASE_URL: url({
    devDefault:
      'postgres://events_analytics:analytics_password@localhost:5432/events',
    desc: 'The database URL for reads and writes to `analytics.events`. See `/infrastructure/postgres/setup-analytics.sh` for how the default database is set up for your country.'
  }),
  TELEMETRY_ENABLED: bool({
    default: true,
    desc: 'When true, usage telemetry received from the events service is forwarded to the OpenCRVS status service.'
  }),
  COUNTRY_CODE: str({
    default: 'NGA',
    desc: 'ISO-style country code of this instance, reported with telemetry.'
  }),
  ENVIRONMENT_NAME: str({
    default: 'development',
    desc: 'Environment name (e.g. "production", "staging") reported as the telemetry environment.'
  }),
  ORGANISATION: str({
    default: 'identiko-demo',
    desc: 'Organisation running this instance, reported with telemetry. Empty by default.'
  }),
  CIVREG_BRIDGE_URL: str({
    default: '',
    desc: 'Base URL of civreg-bridge. Birth and death REGISTER return 503 if empty.'
  }),
  CIVREG_BRIDGE_CLIENT_ID: str({
    default: '',
    desc: 'DEMO system-client id pre-shared with civreg-bridge. Empty means the integration is not registered.'
  }),
  CIVREG_BRIDGE_CLIENT_SECRET: str({
    default: '',
    desc: 'DEMO system-client secret. Not a production credential.'
  }),
  CIVREG_BRIDGE_INTERCEPT_SECRET: str({
    default: '',
    desc: 'Shared secret sent as x-civreg-intercept-secret. Must match civreg-bridge INTERCEPT_SHARED_SECRET.'
  })
})
