const Koa = require('koa')
const Router = require('koa-router')
const KoaStatic = require('koa-static')
const koaBody = require('koa-body')
const axios = require('axios')
const crypto = require('crypto')
const fs = require('fs')
const app = new Koa()
const router = new Router()
const passportBaseUrl = 'http://passport.sso.com:1280'
const axiosInstance = axios.create({
  baseURL: passportBaseUrl,
  withCredentials: true
})
const isLogin = {}
router.get('/', async (ctx, next) => {
  const cookies = ctx.cookies.get('WEB-TWO')
  const ticket = ctx.query.ticket
  console.log('web2 access\n', cookies, ticket)
  if (isLogin[cookies]) {
    ctx.response.type = 'html'
    return (ctx.response.body = fs.createReadStream('index.html'))
  } else if (ticket) {
    console.log('ticket is', ticket)
    const res = await axiosInstance.post('/validate', { ticket: ticket })
    if (res.data.code !== 200) {
      ctx.response.redirect(passportBaseUrl + '?service=http://web2.com:1280/')
    } else {
      const cookie = crypto
        .createHash('md5')
        .update(ticket)
        .digest('hex')
      isLogin[cookie] = ticket
      ctx.cookies.set('WEB-TWO', cookie)
      ctx.response.type = 'html'
      return (ctx.response.body = fs.createReadStream('web2.html'))
    }
  } else {
    ctx.response.redirect(passportBaseUrl + '?service=http://web2.com:1280/')
  }
})
router.post('/logout', async (ctx, next) => {
  const cookie = ctx.cookies.get('WEB-TWO')
  await axiosInstance.post('/logout', { ST: cookie })
  delete isLogin[cookie]
  ctx.response.redirect(passportBaseUrl + '?service=http://web2.com:1280/')
})
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', 'http://passport.sso.com:1280')
  ctx.set('Access-Control-Allow-Credentials', true)
  ctx.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Content-Length, Authorization, Accept, X-Requested-With'
  )
  ctx.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS')
  if (ctx.method === 'OPTIONS') {
    ctx.body = 200
  } else {
    await next()
  }
})
app.use(koaBody())
app.use(router.routes()).use(router.allowedMethods())
app.use(KoaStatic('./'))
app.listen(11002, () =>
  console.log('successfuly，web2 is runing on port 11002')
)
