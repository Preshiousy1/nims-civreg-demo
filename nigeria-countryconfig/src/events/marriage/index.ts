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
import {
  ActionType,
  ConditionalType,
  defineConfig,
  field,
  flag,
  or,
  user
} from '@opencrvs/toolkit/events'
import {
  MARRIAGE_DECLARATION_FORM,
  MARRIAGE_DECLARATION_REVIEW
} from './forms/declaration'
import { MARRIAGE_CERTIFICATE_COLLECTOR_FORM } from './forms/printForm'
import { Event } from '@countryconfig/events/utils'
import { NimsRole } from '@countryconfig/data-seeding/roles/roles'

export const marriageEvent = defineConfig({
  id: Event.Marriage,
  declaration: MARRIAGE_DECLARATION_FORM,
  label: {
    defaultMessage: 'Marriage',
    description: 'This is what this event is referred as in the system',
    id: 'event.marriage.label'
  },
  dateOfEvent: field('marriage.date'),
  title: {
    defaultMessage: '{bride.name.firstname} & {groom.name.firstname}',
    description: 'This is the title of the summary',
    id: 'event.marriage.title'
  },
  fallbackTitle: {
    id: 'event.marriage.fallbackTitle',
    defaultMessage: 'No names provided',
    description:
      'This is a fallback title if actual title resolves to empty string'
  },
  flags: [
    {
      id: 'validated',
      label: {
        id: 'event.birth.flag.validated',
        defaultMessage: 'Validated',
        description: 'Flag label for validated'
      },
      requiresAction: true
    },
    {
      id: 'pending-first-certificate-issuance',
      label: {
        id: 'event.birth.flag.pending-first-certificate-issuance',
        defaultMessage: 'Pending first certificate issuance',
        description: 'Flag label for first certificate issuance'
      },
      requiresAction: true
    }
  ],
  summary: {
    fields: [
      { fieldId: 'marriage.date' },
      { fieldId: 'marriage.placeOfMarriage' }
    ]
  },
  actions: [
    {
      type: ActionType.READ,
      label: {
        defaultMessage: 'Read',
        description:
          'This is shown as the action name anywhere the user can trigger the action from',
        id: 'event.marriage.action.read.label'
      },
      review: MARRIAGE_DECLARATION_REVIEW
    },
    {
      type: ActionType.DECLARE,
      label: {
        defaultMessage: 'Declare',
        description:
          'This is shown as the action name anywhere the user can trigger the action from',
        id: 'event.marriage.action.declare.label'
      },
      review: MARRIAGE_DECLARATION_REVIEW,
      flags: [
        {
          id: 'validated',
          operation: 'add',
          conditional: or(
            user.hasRole(NimsRole.RegistrationAgent),
            user.hasRole(NimsRole.Registrar)
          )
        }
      ]
    },
    {
      type: ActionType.REGISTER,
      label: {
        defaultMessage: 'Register',
        description:
          'This is shown as the action name anywhere the user can trigger the action from',
        id: 'event.marriage.action.register.label'
      },
      flags: [
        { id: 'validated', operation: 'remove' },
        { id: 'pending-first-certificate-issuance', operation: 'add' }
      ],
      conditionals: [
        {
          type: ConditionalType.ENABLE,
          conditional: flag('validated')
        }
      ]
    },
    {
      type: ActionType.PRINT_CERTIFICATE,
      label: {
        defaultMessage: 'Print',
        description:
          'This is shown as the action name anywhere the user can trigger the action from',
        id: 'event.marriage.action.collect-certificate.label'
      },
      flags: [
        { id: 'pending-first-certificate-issuance', operation: 'remove' }
      ],
      printForm: MARRIAGE_CERTIFICATE_COLLECTOR_FORM
    }
  ]
})
