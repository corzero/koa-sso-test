const Koa = require('koa')
const Router = require('koa-router')
const KoaStatic = require('koa-static')
const koaBody = require('koa-body')
const uuid = require('uuid')
const crypto = require('crypto')
const fs = require('fs')
const app = new Koa()
const router = new Router()
const redisTGC = {}
const redisST = {}

router.get('/', async (ctx, next) => {
  console.log('passport assess')
  const service = ctx.query.service
  console.log('service', service)
  // const token = ctx.header.authorization
  const token = ctx.cookies.get('SSO-TGC')
  console.log('token', token)
  if (!token) {
    ctx.response.type = 'text/html;charset=utf-8'
    return (ctx.response.body = fs.createReadStream('login.html'))
  } else {
    let ticket
    for (let key in redisST) {
      if (redisST[key] === redisTGC[token]) {
        ticket = key
        break
      }
    }
    ctx.response.redirect(service + '?ticket=' + ticket)
    // ctx.response.redirect(service)
  }
})
router.post('/login', async (ctx, next) => {
  const service = ctx.query.service
  const { username, password } = ctx.request.body
  console.log(
    `service:${service},\nusername:${username},\npassword:${password}`
  )
  if (username === password) {
    let encodeParams = JSON.stringify({ username, password })
    let salt = 'hhug6dcKyCNBQ5sUC0i6hja5dCTqdSzV' // 盐值
    console.log()
    let TGC = crypto
      .createHash('md5')
      .update(encodeParams + salt)
      .digest('hex')
    let TGT = uuid.v1()
    let ST = crypto
      .createHash('md5')
      .update(uuid.v4())
      .digest('hex')
    redisST[ST] = TGT
    redisTGC[TGC] = TGT
    ctx.cookies.set('SSO-TGC', TGC, {
      // domain: 'passport.sso.com:1280',
      path: '/',
      maxAge: 1000 * 60 * 60 * 1,
      expires: new Date(),
      httpOnly: true,
      overwrite: false
    })
    ctx.response.redirect(service + '?ticket=' + ST)
  }
})
router.post('/validate', async (ctx, next) => {
  const ticket = ctx.request.body.ticket
  if (redisST[ticket]) {
    console.log(`用户${ticket}已登录`)
    ctx.body = {
      code: 200,
      result: '用户已经登录'
    }
  } else {
    console.log('用户未登录')
    ctx.body = {
      code: 400,
      result: '用户未登录'
    }
  }
})
router.get('/user', async (ctx, next) => {
  const TGC = ctx.cookies.get('SSO-TGC')
  if (redisTGC[TGC]) {
    ctx.body = {
      code: 200,
      result: '用户已经登录'
    }
  } else {
    ctx.body = {
      code: 400,
      result: '用户未登录'
    }
  }
})
router.post('/logout', async (ctx, next) => {
  const ST = ctx.request.body.ST
  if (redisST[ST]) {
    for (let key in redisTGC) {
      if (redisTGC[key] === redisST[ST]) {
        delete redisTGC[key]
        break
      }
    }
    delete redisTGC[ST]
    ctx.body = {
      code: 200,
      result: '用户登出'
    }
  } else {
    ctx.body = {
      code: 400,
      result: '用户未登录'
    }
  }
})
// app.use(async (ctx, next) => {
//   ctx.set('Access-Control-Allow-Origin', '*')
//   ctx.set(
//     'Access-Control-Allow-Headers',
//     'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild'
//   )
//   ctx.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS')
//   if (ctx.method === 'OPTIONS') {
//     ctx.body = 200
//   } else {
//     await next()
//   }
// })
app.use(koaBody())
app.use(router.routes()).use(router.allowedMethods())
app.use(KoaStatic('./'))
app.listen(11000, () => console.log('port 11000 successfuly'))
