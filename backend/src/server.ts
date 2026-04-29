import * as Sentry from '@sentry/node'
import { buildApp } from './app.js'
import { env } from './config/env.js'

// Initialise Sentry before anything else so uncaught exceptions are captured.
// Disabled in test and when no DSN is configured.
if (env.SENTRY_DSN && env.NODE_ENV !== 'test') {
  Sentry.init({
    dsn:         env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Never send PII — strip user context from events
    beforeSend(event) {
      if (event.user) {
        delete event.user.email
        delete event.user.username
        delete event.user.ip_address
      }
      return event
    },
  })
}

async function start() {
  const app = await buildApp()

  // Wire Sentry to capture unhandled errors that reach the Fastify error boundary
  app.addHook('onError', (_request, _reply, error, done) => {
    if (env.SENTRY_DSN) Sentry.captureException(error)
    done()
  })

  const signals = ['SIGTERM', 'SIGINT'] as const
  signals.forEach((signal) => {
    process.once(signal, async () => {
      app.log.info({ signal }, 'Received shutdown signal — draining')
      try {
        await Sentry.flush(2000)   // flush pending events before shutdown
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
    Sentry.captureException(err)
    app.log.error(err)
    process.exit(1)
  }
}

start()
