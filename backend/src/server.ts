import { buildApp } from './app.js'
import { env } from './config/env.js'

async function start() {
  const app = await buildApp()

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown — Cloud Run sends SIGTERM before killing the instance
const signals = ['SIGTERM', 'SIGINT'] as const
signals.forEach((signal) => {
  process.on(signal, async () => {
    const app = await buildApp()
    await app.close()
    process.exit(0)
  })
})

start()
