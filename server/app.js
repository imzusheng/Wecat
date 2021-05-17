const Koa = require('koa')
const router = require('./route/router')
const koaBody = require('koa-body')
const cors = require('koa2-cors')
const app = new Koa()
const commonFunction = require('./module/commonFunction')
const Config = require('./config')
try {
  require('./module/ws').link(Config.wsServerPort)
} catch (e) {
  console.error(e)
}
app.listen(Config.serverPort, console.log(`server running at http://localhost:${Config.serverPort}`))
app
  .use(koaBody())
  .use(cors())
  .use((ctx, next) => commonFunction.verifyToken(ctx, next))
  .use(router.routes())
  .use(router.allowedMethods()) // allowedMethods，官方文档推荐，自动根据ctx.status设置响应头
