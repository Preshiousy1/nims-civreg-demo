import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { loadEnv } from './env'

async function bootstrap(): Promise<void> {
  const env = loadEnv()
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  )
  await app.listen(env.port, '0.0.0.0')
}

bootstrap().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
