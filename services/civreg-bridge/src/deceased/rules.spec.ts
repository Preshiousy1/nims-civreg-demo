import {
  BadRequestException,
  ConflictException,
  ForbiddenException
} from '@nestjs/common'
import { assertCanApprove, assertCanReject, assertCanReverse } from './rules'

const pending = {
  status: 'PENDING_APPROVAL' as const,
  makerId: 'maker-1',
  makerStaffId: null as string | null
}

describe('maker-checker rules', () => {
  it('refuses approval by the maker even with checker role', () => {
    expect(() =>
      assertCanApprove(pending, {
        sub: 'maker-1',
        role: 'nimc_civreg_checker'
      })
    ).toThrow(ForbiddenException)
  })

  it('allows a different checker to approve', () => {
    expect(() =>
      assertCanApprove(pending, {
        sub: 'checker-9',
        role: 'nimc_civreg_checker'
      })
    ).not.toThrow()
  })

  it('refuses reversal without a reason', () => {
    expect(() =>
      assertCanReverse(
        { status: 'APPROVED' },
        { sub: 'checker-9', role: 'nimc_civreg_checker' },
        '   '
      )
    ).toThrow(BadRequestException)
  })

  it('refuses reversal from pending', () => {
    expect(() =>
      assertCanReverse(
        { status: 'PENDING_APPROVAL' },
        { sub: 'checker-9', role: 'nimc_civreg_checker' },
        'entered in error'
      )
    ).toThrow(ConflictException)
  })

  it('refuses reject by the maker', () => {
    expect(() =>
      assertCanReject(pending, { sub: 'maker-1', role: 'nimc_civreg_checker' })
    ).toThrow(ForbiddenException)
  })

  it('refuses approval when staff ids match even if sub differs', () => {
    expect(() =>
      assertCanApprove(
        { ...pending, makerStaffId: 'staff-ada' },
        {
          sub: 'keycloak-sub-other',
          role: 'nimc_civreg_checker',
          staffId: 'staff-ada'
        }
      )
    ).toThrow(ForbiddenException)
  })
})
