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

import { countryLogo } from '@countryconfig/api/application/country-logo'
import { defineApplicationConfig } from '@opencrvs/toolkit/application-config'

export const applicationConfig = defineApplicationConfig({
  APPLICATION_NAME: 'Nigeria CRS',
  COUNTRY_LOGO: countryLogo,
  SYSTEM_IANA_TIMEZONE: 'Africa/Lagos', // Default timezone for the country. Basis for date and time calculations during searches.
  CURRENCY: {
    languagesAndCountry: ['en-NG'],
    isoCode: 'NGN'
  },
  ADMIN_STRUCTURE: [
    {
      // id stays `province` because form fields use locationLevel('province')
      id: 'province',
      label: {
        id: 'field.address.province.label',
        defaultMessage: 'State',
        description: 'Label for state in address'
      }
    },
    {
      // id stays `district` because form fields use locationLevel('district')
      id: 'district',
      label: {
        id: 'field.address.district.label',
        defaultMessage: 'LGA',
        description: 'Label for LGA in address'
      }
    }
  ],
  // Nigeria mobile: 11 digits starting 07, 08 or 09 (e.g. 08067896546)
  PHONE_NUMBER_PATTERN: '^0[789][0-9]{9}$',
  USER_NOTIFICATION_DELIVERY_METHOD: 'email', // or 'sms', or '' ... You can use 'sms' for WhatsApp
  INFORMANT_NOTIFICATION_DELIVERY_METHOD: 'email', // or 'sms', or '' ... You can use 'sms' for WhatsApp
  SEARCH_DEFAULT_CRITERIA: 'TRACKING_ID'
  /*
   * SEARCH_DEFAULT_CRITERIA's value can be one of the following
   * | 'TRACKING_ID',
   * | 'REGISTRATION_NUMBER',
   * | 'NATIONAL_ID',
   * | 'NAME',
   * | 'PHONE_NUMBER',
   * | 'EMAIL'
   */
})
