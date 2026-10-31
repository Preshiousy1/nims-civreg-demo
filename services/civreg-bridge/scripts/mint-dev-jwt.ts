import { mintDevJwt } from '../src/auth/jwt'

const sub = process.argv[2] ?? 'checker-1'
const role = process.argv[3] ?? 'nimc_civreg_checker'
const secret =
  process.env.JWT_SECRET ?? 'demo-civreg-jwt-not-a-real-secret'

process.stdout.write(`${mintDevJwt({ sub, role }, secret)}\n`)
