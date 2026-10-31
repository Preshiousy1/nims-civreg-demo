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
  AddressType,
  and,
  ConditionalType,
  defineFormPage,
  FieldType,
  or,
  TranslationConfig,
  field,
  user
} from '@opencrvs/toolkit/events'
import { not } from '@opencrvs/toolkit/conditionals'
import {
  farajalandNameConfig,
  invalidNameValidator,
  ninWhenPresentValidator
} from '@countryconfig/events/birth/validators'
import { applicationConfig } from '@countryconfig/api/application/application-config'
import {
  createSelectOptions,
  defaultStreetAddressConfiguration,
  emptyMessage,
  getNestedFieldValidators,
  informantMessageDescriptors
} from '@countryconfig/events/utils'

export const InformantType = {
  GROOM: 'GROOM',
  BRIDE: 'BRIDE',
  OTHER: 'OTHER'
} as const

const informantRelationMessages = {
  GROOM: informantMessageDescriptors.GROOM,
  BRIDE: informantMessageDescriptors.BRIDE,
  OTHER: informantMessageDescriptors.OTHER
} satisfies Record<keyof typeof InformantType, TranslationConfig>

const informantTypeOptions = createSelectOptions(
  InformantType,
  informantRelationMessages
)

const PHONE_NUMBER_REGEX = applicationConfig.PHONE_NUMBER_PATTERN

const informantOtherThanParty = and(
  not(
    field('informant.relation').inArray([
      InformantType.GROOM,
      InformantType.BRIDE
    ])
  ),
  not(field('informant.relation').isFalsy())
)

export const informant = defineFormPage({
  id: 'informant',
  title: {
    defaultMessage: "Informant's details",
    description: 'Form section title for informants details',
    id: 'form.section.informant.title'
  },
  fields: [
    {
      id: 'informant.relation',
      type: FieldType.SELECT,
      analytics: true,
      required: true,
      label: informantMessageDescriptors.marriageInformantTitle,
      options: informantTypeOptions
    },
    {
      id: 'informant.other.relation',
      type: FieldType.TEXT,
      required: true,
      label: {
        defaultMessage: 'Relationship to couple',
        description: 'This is the label for the field',
        id: 'event.marriage.action.declare.form.section.informant.field.other.relation.label'
      },
      conditionals: [
        {
          type: ConditionalType.SHOW,
          conditional: field('informant.relation').isEqualTo(InformantType.OTHER)
        }
      ],
      parent: field('informant.relation')
    },
    {
      id: 'informant.name',
      type: FieldType.NAME,
      required: true,
      configuration: farajalandNameConfig,
      hideLabel: true,
      label: {
        defaultMessage: "Informant's name",
        description: 'This is the label for the field',
        id: 'event.marriage.action.declare.form.section.informant.field.name.label'
      },
      conditionals: [
        {
          type: ConditionalType.SHOW,
          conditional: informantOtherThanParty
        }
      ],
      parent: field('informant.relation'),
      validation: [invalidNameValidator('informant.name')]
    },
    {
      id: 'informant.dob',
      type: FieldType.DATE,
      required: true,
      label: {
        defaultMessage: 'Date of birth',
        description: 'This is the label for the field',
        id: 'event.marriage.action.declare.form.section.informant.field.dob.label'
      },
      validation: [
        {
          message: {
            defaultMessage: 'Must be a valid Birthdate',
            description: 'This is the error message for invalid date',
            id: 'event.marriage.action.declare.form.section.informant.field.dob.error'
          },
          validator: field('informant.dob').isBefore().now()
        }
      ],
      conditionals: [
        {
          type: ConditionalType.SHOW,
          conditional: informantOtherThanParty
        }
      ],
      parent: field('informant.relation')
    },
    {
      id: 'informant.nationality',
      type: FieldType.COUNTRY,
      required: true,
      label: {
        defaultMessage: 'Nationality',
        description: 'This is the label for the field',
        id: 'event.marriage.action.declare.form.section.informant.field.nationality.label'
      },
      defaultValue: 'NGA',
      conditionals: [
        {
          type: ConditionalType.SHOW,
          conditional: informantOtherThanParty
        }
      ],
      parent: field('informant.relation')
    },
    {
      id: 'informant.address',
      type: FieldType.ADDRESS,
      required: true,
      hideLabel: true,
      label: {
        defaultMessage: 'Usual place of residence',
        description: 'This is the label for the field',
        id: 'event.marriage.action.declare.form.section.informant.field.address.label'
      },
      conditionals: [
        {
          type: ConditionalType.SHOW,
          conditional: informantOtherThanParty
        }
      ],
      validation: [
        {
          message: {
            defaultMessage: 'Invalid input',
            description: 'Error message when generic field is invalid',
            id: 'error.invalidInput'
          },
          validator: field('informant.address').isValidAdministrativeLeafLevel()
        },
        ...getNestedFieldValidators(
          'informant.address',
          defaultStreetAddressConfiguration
        )
      ],
      defaultValue: {
        country: 'NGA',
        addressType: AddressType.DOMESTIC,
        administrativeArea: user('administrativeAreaId')
      },
      configuration: {
        streetAddressForm: defaultStreetAddressConfiguration
      },
      parent: field('informant.relation')
    },
    {
      id: 'informant.address.divider.end',
      type: FieldType.DIVIDER,
      label: emptyMessage,
      conditionals: [
        {
          type: ConditionalType.SHOW,
          conditional: informantOtherThanParty
        }
      ],
      parent: field('informant.relation')
    },
    {
      id: 'informant.phoneNo',
      type: FieldType.PHONE,
      required: false,
      secured: true,
      label: {
        defaultMessage: 'Phone number',
        description: 'This is the label for the field',
        id: 'event.marriage.action.declare.form.section.informant.field.phoneNo.label'
      },
      validation: [
        {
          message: {
            defaultMessage:
              'Must be a valid 11 digit number that starts with 07, 08 or 09',
            description:
              'The error message that appears on phone numbers where the first two characters must be 07, 08 or 09, and length must be 11',
            id: 'event.birth.action.declare.form.section.informant.field.phoneNo.error'
          },
          validator: or(
            field('informant.phoneNo').matches(PHONE_NUMBER_REGEX),
            field('informant.phoneNo').isFalsy()
          )
        }
      ],
      parent: field('informant.relation')
    },
    {
      id: 'informant.nin',
      type: FieldType.ID,
      required: false,
      secured: true,
      label: {
        defaultMessage: 'NIN of parent or informant',
        description: 'Optional 11-digit Nigerian National Identification Number',
        id: 'event.birth.action.declare.form.section.person.field.nin.label'
      },
      validation: [ninWhenPresentValidator('informant.nin')],
      parent: field('informant.relation')
    },
    {
      id: 'informant.email',
      type: FieldType.EMAIL,
      required: false,
      secured: true,
      label: {
        defaultMessage: 'Email',
        description: 'This is the label for the field',
        id: 'event.marriage.action.declare.form.section.informant.field.email.label'
      },
      configuration: {
        maxLength: 255
      },
      parent: field('informant.relation')
    }
  ]
})
