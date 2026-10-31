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
  defineActionForm,
  FieldType,
  PageTypes
} from '@opencrvs/toolkit/events'

export const MARRIAGE_CERTIFICATE_COLLECTOR_FORM = defineActionForm({
  label: {
    id: 'event.marriage.action.certificate.form.label',
    defaultMessage: 'Marriage certificate collector',
    description: 'This is what this form is referred as in the system'
  },
  pages: [
    {
      id: 'collector',
      type: PageTypes.enum.FORM,
      requireCompletionToContinue: true,
      title: {
        id: 'event.marriage.action.certificate.form.section.who.title',
        defaultMessage: 'Print certified copy',
        description: 'This is the title of the section'
      },
      fields: [
        {
          id: 'collector.requesterId',
          type: FieldType.SELECT,
          required: true,
          label: {
            defaultMessage: 'Requester',
            description: 'This is the label for the field',
            id: 'event.marriage.action.certificate.form.section.requester.label'
          },
          options: [
            {
              label: {
                id: 'event.marriage.action.certificate.form.section.requester.groom.label',
                defaultMessage: 'Print and issue to Groom',
                description: 'This is the label for the field'
              },
              value: 'GROOM'
            },
            {
              label: {
                id: 'event.marriage.action.certificate.form.section.requester.bride.label',
                defaultMessage: 'Print and issue to Bride',
                description: 'This is the label for the field'
              },
              value: 'BRIDE'
            },
            {
              label: {
                id: 'event.marriage.action.certificate.form.section.requester.other.label',
                defaultMessage: 'Print and issue someone else',
                description: 'This is the label for the field'
              },
              value: 'OTHER'
            },
            {
              label: {
                id: 'event.marriage.action.certificate.form.section.requester.printInAdvance.label',
                defaultMessage: 'Print in advance',
                description: 'This is the label for the field'
              },
              value: 'PRINT_IN_ADVANCE'
            }
          ]
        }
      ]
    },
    {
      id: 'collector.collect.payment',
      type: PageTypes.enum.FORM,
      requireCompletionToContinue: true,
      title: {
        id: 'event.marriage.action.print.collectPayment',
        defaultMessage: 'Collect Payment',
        description: 'This is the title of the section'
      },
      fields: [
        {
          id: 'collector.collect.payment.data',
          type: FieldType.DATA,
          label: {
            defaultMessage: 'Payment details',
            description: 'Title for the data section',
            id: 'event.marriage.action.certificate.form.section.collectPayment.data.label'
          },
          configuration: {
            data: [
              {
                id: 'service',
                label: {
                  defaultMessage: 'Service',
                  description: 'Title for the data entry',
                  id: 'event.marriage.action.certificate.form.section.collectPayment.service.label'
                },
                value: {
                  defaultMessage: 'Marriage registration',
                  description: 'Marriage registration service message',
                  id: 'event.marriage.action.certificate.form.section.collectPayment.service.value'
                }
              },
              {
                id: 'fee',
                label: {
                  defaultMessage: 'Fee',
                  description: 'Title for the data entry',
                  id: 'event.marriage.action.certificate.form.section.collectPayment.fee.label'
                },
                value: 'NGN 5,000'
              }
            ]
          }
        }
      ]
    }
  ]
})
