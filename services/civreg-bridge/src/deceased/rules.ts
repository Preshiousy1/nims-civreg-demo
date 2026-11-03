import {
  BadRequestException,
  ConflictException,
  ForbiddenException
} from '@nestjs/common'
import { isCheckerRole, type DevJwtUser } from '../auth/jwt'
import type {
  DeceasedStatus,
  DeceasedStatusRequestEntity
} from '../database/entities/deceased-status-request.entity'

/**
 * Prefer staffId when both sides have it (Keycloak/OpenCRVS map to one id).
 * Fall back to sub === makerId for the demo JWT.
 */
export function isSamePerson(
  row: Pick<DeceasedStatusRequestEntity, 'makerId' | 'makerStaffId'>,
  user: DevJwtUser
): boolean {
  if (row.makerStaffId && user.staffId) {
    return row.makerStaffId === user.staffId
  }
  return user.sub === row.makerId
}

export function assertCanApprove(
  row: Pick<DeceasedStatusRequestEntity, 'status' | 'makerId' | 'makerStaffId'>,
  user: DevJwtUser
): void {
  if (row.status === 'APPROVED') {
    return
  }
  if (row.status !== 'PENDING_APPROVAL') {
    throw new ConflictException(`cannot approve from ${row.status}`)
  }
  if (!isCheckerRole(user.role)) {
    throw new ForbiddenException('checker role required')
  }
  if (isSamePerson(row, user)) {
    throw new ForbiddenException('maker cannot approve their own request')
  }
}

export function assertCanReject(
  row: Pick<DeceasedStatusRequestEntity, 'status' | 'makerId' | 'makerStaffId'>,
  user: DevJwtUser
): void {
  if (row.status === 'REJECTED') {
    return
  }
  if (row.status !== 'PENDING_APPROVAL') {
    throw new ConflictException(`cannot reject from ${row.status}`)
  }
  if (!isCheckerRole(user.role)) {
    throw new ForbiddenException('checker role required')
  }
  if (isSamePerson(row, user)) {
    throw new ForbiddenException('maker cannot reject their own request')
  }
}

export function assertCanReverse(
  row: Pick<DeceasedStatusRequestEntity, 'status'>,
  user: DevJwtUser,
  reason: string | undefined
): void {
  if (row.status === 'REVERSED') {
    return
  }
  if (row.status !== 'APPROVED') {
    throw new ConflictException(`cannot reverse from ${row.status}`)
  }
  if (!isCheckerRole(user.role)) {
    throw new ForbiddenException('checker role required')
  }
  if (!reason || reason.trim().length === 0) {
    throw new BadRequestException('reversal reason is required')
  }
}

export function isTerminal(status: DeceasedStatus): boolean {
  return status === 'APPROVED' || status === 'REJECTED' || status === 'REVERSED'
}
