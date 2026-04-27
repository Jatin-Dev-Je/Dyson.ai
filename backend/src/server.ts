import { buildApp } from './app.js'
import { env } from './config/env.js'

async function start() {
  const app = await buildApp()

  // Graceful shutdown — Cloud Run sends SIGTERM before killing the instance.
  // Closes the running server (drains in-flight requests, releases the port),
  // not a fresh app instance.
  const signals = ['SIGTERM', 'SIGINT'] as const
  signals.forEach((signal) => {
    process.once(signal, async () => {
      app.log.info({ signal }, 'Received shutdown signal — draining')
      try {
        await app.close()
        process.exit(0)
      } catch (err) {
        app.log.error({ err }, 'Error during shutdown')
        process.exit(1)
      }
    })
  })

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
