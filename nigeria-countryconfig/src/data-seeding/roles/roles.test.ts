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
import { describe, expect, test } from 'vitest'
import { NimsRole, roles } from './roles'

describe('NIMS demo roles', () => {
  test('defines one role per JD id including hospital clerk', () => {
    expect(roles.map((role) => role.id).sort()).toEqual(
      Object.values(NimsRole).slice().sort()
    )
    expect(roles.some((role) => role.id === NimsRole.HospitalClerk)).toBe(true)
  })

  test('each role has encoded scopes from defineScopes', () => {
    for (const role of roles) {
      expect(role.scopes.length).toBeGreaterThan(0)
      for (const scope of role.scopes) {
        expect(scope.startsWith('type=')).toBe(true)
      }
    }
  })

  test('hospital clerk is limited to location, not administrativeArea', () => {
    const clerk = roles.find((role) => role.id === NimsRole.HospitalClerk)
    expect(clerk).toBeDefined()
    expect(
      clerk!.scopes.some((scope) => scope.includes('placeOfEvent=location'))
    ).toBe(true)
    expect(
      clerk!.scopes.some((scope) =>
        scope.includes('placeOfEvent=administrativeArea')
      )
    ).toBe(false)
  })

  test('maker cannot register; checker cannot create', () => {
    const maker = roles.find((role) => role.id === NimsRole.Maker)!
    const checker = roles.find((role) => role.id === NimsRole.Checker)!
    expect(maker.scopes.some((scope) => scope.includes('type=record.register'))).toBe(
      false
    )
    expect(
      checker.scopes.some((scope) => scope.includes('type=record.create'))
    ).toBe(false)
  })

  test('no human role has record.action.accept or record.action.reject', () => {
    for (const role of roles) {
      expect(
        role.scopes.some((scope) => scope.includes('type=record.action.accept'))
      ).toBe(false)
      expect(
        role.scopes.some((scope) => scope.includes('type=record.action.reject'))
      ).toBe(false)
    }
  })
})
