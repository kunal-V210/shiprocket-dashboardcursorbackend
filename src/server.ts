import { buildApp } from './app.js'; import { env } from './config.js'
const app=buildApp(); app.listen({port:env.PORT,host:'0.0.0.0'}).catch(err=>{app.log.error(err);process.exit(1)}); const shutdown=async()=>{await app.close();process.exit(0)}; process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown)
