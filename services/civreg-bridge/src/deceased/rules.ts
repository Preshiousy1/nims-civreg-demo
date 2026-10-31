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

export function assertCanApprove(
  row: Pick<DeceasedStatusRequestEntity, 'status' | 'makerId'>,
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
  if (user.sub === row.makerId) {
    throw new ForbiddenException('maker cannot approve their own request')
  }
}

export function assertCanReject(
  row: Pick<DeceasedStatusRequestEntity, 'status' | 'makerId'>,
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
  if (user.sub === row.makerId) {
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
