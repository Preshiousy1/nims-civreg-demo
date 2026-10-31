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

import { MessageDescriptor } from 'react-intl'
import { defineScopes, EncodedScope } from '@opencrvs/toolkit/scopes'

/**
 * JD prefix is `nimc.civreg.*`. Dots seed and login fine, but core
 * `formatUserRole` uses ICU `{role, select, KEY {...}}` and select keys
 * cannot contain dots, so Team always showed Unknown. Underscores keep
 * the prefix readable and are valid ICU keys.
 */
export const NimsRole = {
  FieldAgent: 'nimc_civreg_field_agent',
  HospitalClerk: 'nimc_civreg_hospital_clerk',
  RegistrationAgent: 'nimc_civreg_registration_agent',
  Registrar: 'nimc_civreg_registrar',
  Maker: 'nimc_civreg_maker',
  Checker: 'nimc_civreg_checker',
  LocalAdmin: 'nimc_civreg_local_admin',
  NationalAdmin: 'nimc_civreg_national_admin'
} as const

export type NimsRoleId = (typeof NimsRole)[keyof typeof NimsRole]

type Role = {
  id: string
  label: MessageDescriptor
  scopes: EncodedScope[]
}

const operationalRoles: NimsRoleId[] = [
  NimsRole.FieldAgent,
  NimsRole.HospitalClerk,
  NimsRole.RegistrationAgent,
  NimsRole.Registrar,
  NimsRole.Maker,
  NimsRole.Checker
]

export const roles: Role[] = [
  {
    id: NimsRole.FieldAgent,
    label: {
      defaultMessage: 'DEMO Field Agent',
      description: 'Name for user role Field Agent',
      id: 'userRole.nimcFieldAgent'
    },
    // Same scopes as the template COMMUNITY_LEADER: notify only, no declare.
    scopes: defineScopes([
      { type: 'user.read-only-my-audit' },
      { type: 'record.search', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'workqueue', options: { ids: ['assigned-to-you', 'recent'] } },
      { type: 'record.create', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.read', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.edit', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.notify', options: { placeOfEvent: 'administrativeArea' } }
    ])
  },
  {
    id: NimsRole.HospitalClerk,
    label: {
      defaultMessage: 'DEMO Hospital Official',
      description: 'Name for user role Hospital Official (k.bwalya equivalent)',
      id: 'userRole.nimcHospitalClerk'
    },
    // Same scopes as the template HOSPITAL_CLERK: declare at own facility.
    scopes: defineScopes([
      { type: 'user.read-only-my-audit' },
      { type: 'record.search', options: { placeOfEvent: 'location' } },
      {
        type: 'workqueue',
        options: { ids: ['assigned-to-you', 'recent', 'pending-updates'] }
      },
      { type: 'record.create', options: { placeOfEvent: 'location' } },
      { type: 'record.read', options: { placeOfEvent: 'location' } },
      { type: 'record.declare', options: { placeOfEvent: 'location' } },
      { type: 'record.notify', options: { placeOfEvent: 'location' } },
      {
        type: 'record.edit',
        options: { placeOfEvent: 'location', declaredBy: 'user' }
      },
      {
        type: 'record.print-certified-copies',
        options: { templates: ['marriage-certificate'], registeredIn: 'location' }
      }
    ])
  },
  {
    id: NimsRole.RegistrationAgent,
    label: {
      defaultMessage: 'DEMO Registration Agent',
      description: 'Name for user role Registration Agent',
      id: 'userRole.nimcRegistrationAgent'
    },
    scopes: defineScopes([
      { type: 'performance.read' },
      {
        type: 'organisation.read-locations',
        options: { accessLevel: 'administrativeArea' }
      },
      { type: 'user.read', options: { accessLevel: 'administrativeArea' } },
      { type: 'user.search', options: { accessLevel: 'administrativeArea' } },
      { type: 'performance.read-dashboards' },
      {
        type: 'workqueue',
        options: {
          ids: [
            'assigned-to-you',
            'recent',
            'requires-completion',
            'in-external-validation',
            'escalated',
            'pending-validation',
            'pending-updates',
            'pending-approval',
            'pending-certification',
            'pending-issuance',
            'correction-requested'
          ]
        }
      },
      { type: 'record.search', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.create', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.read', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.declare', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.edit', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.reject', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.archive', options: { declaredIn: 'administrativeArea' } },
      {
        type: 'record.print-certified-copies',
        options: { registeredIn: 'administrativeArea' }
      },
      {
        type: 'record.request-correction',
        options: { registeredIn: 'administrativeArea' }
      },
      {
        type: 'record.custom-action',
        options: {
          event: ['birth'],
          customActionTypes: ['VALIDATE_DECLARATION']
        }
      },
      {
        type: 'record.custom-action',
        options: {
          event: ['birth'],
          customActionTypes: ['REINSTATE_REVOKE_REGISTRATION'],
          placeOfEvent: 'administrativeArea'
        }
      },
      {
        type: 'record.custom-action',
        options: {
          event: ['birth'],
          customActionTypes: [
            'ISSUE_CERTIFIED_COPY',
            'ISSUE_VERIFIABLE_CREDENTIAL'
          ]
        }
      },
      {
        type: 'record.custom-action',
        options: {
          event: ['death'],
          customActionTypes: ['VALIDATE_DECLARATION']
        }
      },
      {
        type: 'dashboard.view',
        options: { ids: ['registrations', 'completeness', 'registry'] }
      }
    ])
  },
  {
    id: NimsRole.Registrar,
    label: {
      defaultMessage: 'DEMO Registrar',
      description: 'Name for user role Registrar',
      id: 'userRole.nimcRegistrar'
    },
    scopes: defineScopes([
      { type: 'profile.electronic-signature' },
      { type: 'performance.read' },
      {
        type: 'organisation.read-locations',
        options: { accessLevel: 'administrativeArea' }
      },
      { type: 'user.read', options: { accessLevel: 'administrativeArea' } },
      { type: 'user.search', options: { accessLevel: 'administrativeArea' } },
      { type: 'performance.read-dashboards' },
      {
        type: 'workqueue',
        options: {
          ids: [
            'assigned-to-you',
            'recent',
            'requires-completion',
            'in-external-validation',
            'escalated',
            'potential-duplicate',
            'pending-updates',
            'pending-registration',
            'pending-approval',
            'pending-certification',
            'pending-issuance',
            'correction-requested'
          ]
        }
      },
      { type: 'record.search', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.create', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.read', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.declare', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.edit', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.reject', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.archive', options: { declaredIn: 'administrativeArea' } },
      {
        type: 'record.review-duplicates',
        options: { placeOfEvent: 'administrativeArea' }
      },
      {
        type: 'record.register',
        options: { placeOfEvent: 'administrativeArea' }
      },
      {
        type: 'record.print-certified-copies',
        options: { registeredIn: 'administrativeArea' }
      },
      {
        type: 'record.correct',
        options: { registeredIn: 'administrativeArea' }
      },
      {
        type: 'record.custom-action',
        options: {
          event: ['birth'],
          customActionTypes: ['REINSTATE_REVOKE_REGISTRATION'],
          placeOfEvent: 'administrativeArea'
        }
      },
      {
        type: 'record.custom-action',
        options: {
          event: ['birth'],
          customActionTypes: [
            'ISSUE_CERTIFIED_COPY',
            'ISSUE_VERIFIABLE_CREDENTIAL'
          ],
          registeredIn: 'administrativeArea'
        }
      },
      { type: 'record.unassign-others' },
      {
        type: 'dashboard.view',
        options: { ids: ['registrations', 'completeness', 'registry'] }
      }
    ])
  },
  {
    id: NimsRole.Maker,
    label: {
      defaultMessage: 'DEMO Maker',
      description: 'Name for user role Maker (capture, cannot register)',
      id: 'userRole.nimcMaker'
    },
    scopes: defineScopes([
      { type: 'user.read-only-my-audit' },
      { type: 'record.search', options: { placeOfEvent: 'administrativeArea' } },
      {
        type: 'workqueue',
        options: { ids: ['assigned-to-you', 'recent', 'pending-updates'] }
      },
      { type: 'record.create', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.read', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.declare', options: { placeOfEvent: 'administrativeArea' } },
      {
        type: 'record.edit',
        options: { placeOfEvent: 'administrativeArea', declaredBy: 'user' }
      }
    ])
  },
  {
    id: NimsRole.Checker,
    label: {
      defaultMessage: 'DEMO Checker',
      description: 'Name for user role Checker (review, cannot create)',
      id: 'userRole.nimcChecker'
    },
    scopes: defineScopes([
      { type: 'user.read-only-my-audit' },
      { type: 'record.search', options: { placeOfEvent: 'administrativeArea' } },
      {
        type: 'workqueue',
        options: {
          ids: ['assigned-to-you', 'recent', 'pending-validation']
        }
      },
      { type: 'record.read', options: { placeOfEvent: 'administrativeArea' } },
      { type: 'record.reject', options: { placeOfEvent: 'administrativeArea' } },
      {
        type: 'record.custom-action',
        options: {
          event: ['birth'],
          customActionTypes: ['VALIDATE_DECLARATION']
        }
      },
      {
        type: 'record.custom-action',
        options: {
          event: ['death'],
          customActionTypes: ['VALIDATE_DECLARATION']
        }
      }
    ])
  },
  {
    id: NimsRole.LocalAdmin,
    label: {
      defaultMessage: 'DEMO Local Admin',
      description: 'Name for user role Local System Admin',
      id: 'userRole.nimcLocalAdmin'
    },
    scopes: [
      ...defineScopes([
        {
          type: 'organisation.read-locations',
          options: { accessLevel: 'administrativeArea' }
        },
        {
          type: 'user.create',
          options: {
            accessLevel: 'administrativeArea',
            role: operationalRoles
          }
        },
        {
          type: 'user.edit',
          options: {
            accessLevel: 'administrativeArea',
            role: operationalRoles
          }
        },
        { type: 'user.read', options: { accessLevel: 'administrativeArea' } },
        { type: 'user.search', options: { accessLevel: 'administrativeArea' } }
      ])
    ]
  },
  {
    id: NimsRole.NationalAdmin,
    label: {
      defaultMessage: 'DEMO National Admin',
      description: 'Name for user role National Administrator',
      id: 'userRole.nimcNationalAdmin'
    },
    scopes: [
      ...defineScopes([
        { type: 'config.update-all' },
        { type: 'organisation.read-locations' },
        {
          type: 'user.create',
          options: { role: Object.values(NimsRole) }
        },
        {
          type: 'user.edit',
          options: { role: Object.values(NimsRole) }
        },
        { type: 'user.read' },
        { type: 'user.search' },
        { type: 'performance.read' },
        { type: 'record.reindex' },
        { type: 'integration.create' },
        { type: 'performance.read-dashboards' },
        {
          type: 'dashboard.view',
          options: { ids: ['registrations', 'completeness', 'registry'] }
        }
      ])
    ]
  }
]
