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
  defineFormPage,
  FieldType,
  PageTypes,
  field,
  user
} from '@opencrvs/toolkit/events'
import {
  farajalandNameConfig,
  invalidNameValidator,
  ninWhenPresentValidator
} from '@countryconfig/events/birth/validators'
import {
  defaultStreetAddressConfiguration,
  emptyMessage,
  getNestedFieldValidators
} from '@countryconfig/events/utils'

type Party = 'groom' | 'bride'

function partyPage(party: Party, title: string, nameLabel: string) {
  return defineFormPage({
    id: party,
    type: PageTypes.enum.FORM,
    title: {
      defaultMessage: title,
      description: `Form section title for ${party} details`,
      id: `event.marriage.action.declare.form.section.${party}.title`
    },
    fields: [
      {
        id: `${party}.name`,
        type: FieldType.NAME,
        required: true,
        configuration: farajalandNameConfig,
        hideLabel: true,
        label: {
          defaultMessage: nameLabel,
          description: 'This is the label for the field',
          id: `event.marriage.action.declare.form.section.${party}.field.name.label`
        },
        validation: [invalidNameValidator(`${party}.name`)]
      },
      {
        id: `${party}.dob`,
        type: FieldType.DATE,
        required: true,
        secured: true,
        label: {
          defaultMessage: 'Date of birth',
          description: 'This is the label for the field',
          id: `event.marriage.action.declare.form.section.${party}.field.dob.label`
        },
        validation: [
          {
            message: {
              defaultMessage: 'Must be a valid birth date',
              description: 'This is the error message for invalid date',
              id: `event.marriage.action.declare.form.section.${party}.field.dob.error`
            },
            validator: field(`${party}.dob`).isBefore().now()
          }
        ]
      },
      {
        id: `${party}.nationality`,
        type: FieldType.COUNTRY,
        required: true,
        label: {
          defaultMessage: 'Nationality',
          description: 'This is the label for the field',
          id: `event.marriage.action.declare.form.section.${party}.field.nationality.label`
        },
        defaultValue: 'NGA'
      },
      {
        id: `${party}.nin`,
        type: FieldType.ID,
        required: false,
        secured: true,
        label: {
          defaultMessage: 'NIN of parent or informant',
          description:
            'Optional 11-digit Nigerian National Identification Number',
          id: 'event.birth.action.declare.form.section.person.field.nin.label'
        },
        validation: [ninWhenPresentValidator(`${party}.nin`)]
      },
      {
        id: `${party}.address`,
        type: FieldType.ADDRESS,
        required: true,
        hideLabel: true,
        label: {
          defaultMessage: 'Usual place of residence',
          description: 'This is the label for the field',
          id: `event.marriage.action.declare.form.section.${party}.field.address.label`
        },
        validation: [
          {
            message: {
              defaultMessage: 'Invalid input',
              description: 'Error message when generic field is invalid',
              id: 'error.invalidInput'
            },
            validator: field(`${party}.address`).isValidAdministrativeLeafLevel()
          },
          ...getNestedFieldValidators(
            `${party}.address`,
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
        }
      },
      {
        id: `${party}.address.divider`,
        type: FieldType.DIVIDER,
        label: emptyMessage
      }
    ]
  })
}

export const groom = partyPage('groom', "Groom's details", "Groom's name")
export const bride = partyPage('bride', "Bride's details", "Bride's name")
