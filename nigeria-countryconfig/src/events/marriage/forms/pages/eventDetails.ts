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
  field,
  FieldType,
  or,
  PageTypes,
  user
} from '@opencrvs/toolkit/events'
import {
  defaultStreetAddressConfiguration,
  emptyMessage,
  getNestedFieldValidators
} from '@countryconfig/events/utils'

export const eventDetails = defineFormPage({
  id: 'marriage',
  type: PageTypes.enum.FORM,
  title: {
    defaultMessage: 'Marriage details',
    description: 'Form section title for marriage event details',
    id: 'event.marriage.action.declare.form.section.event.title'
  },
  fields: [
    {
      id: 'marriage.date',
      type: FieldType.DATE,
      required: true,
      secured: true,
      analytics: true,
      label: {
        defaultMessage: 'Date of marriage',
        description: 'This is the label for the field',
        id: 'event.marriage.action.declare.form.section.event.field.date.label'
      },
      validation: [
        {
          message: {
            defaultMessage: 'Must be a valid date in the past',
            description: 'This is the error message for invalid date',
            id: 'event.marriage.action.declare.form.section.event.field.date.error'
          },
          validator: field('marriage.date').isBefore().now()
        },
        {
          message: {
            defaultMessage: "Date of marriage must be after the groom's birth date",
            description:
              'This is the error message for date of marriage before groom date of birth',
            id: 'event.marriage.action.declare.form.section.event.field.date.error.beforeGroom'
          },
          validator: or(
            field('marriage.date').isAfter().date(field('groom.dob')),
            field('groom.dob').isFalsy()
          )
        },
        {
          message: {
            defaultMessage: "Date of marriage must be after the bride's birth date",
            description:
              'This is the error message for date of marriage before bride date of birth',
            id: 'event.marriage.action.declare.form.section.event.field.date.error.beforeBride'
          },
          validator: or(
            field('marriage.date').isAfter().date(field('bride.dob')),
            field('bride.dob').isFalsy()
          )
        }
      ]
    },
    {
      id: 'marriage.placeOfMarriage',
      type: FieldType.ADDRESS,
      required: true,
      hideLabel: true,
      label: {
        defaultMessage: 'Place of marriage',
        description: 'This is the label for the field',
        id: 'event.marriage.action.declare.form.section.event.field.place.label'
      },
      validation: [
        {
          message: {
            defaultMessage: 'Invalid input',
            description: 'Error message when generic field is invalid',
            id: 'error.invalidInput'
          },
          validator: field(
            'marriage.placeOfMarriage'
          ).isValidAdministrativeLeafLevel()
        },
        ...getNestedFieldValidators(
          'marriage.placeOfMarriage',
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
      id: 'marriage.placeOfMarriage.divider',
      type: FieldType.DIVIDER,
      label: emptyMessage
    }
  ]
})
