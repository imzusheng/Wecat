const router = require('@koa/router')()
const MongoDB = require('../mongodb')
const db = new MongoDB()
const JsonWebToken = require('../jwt')
const jwt = new JsonWebToken()
const sendEmail = require('../EmailServer')

router.post('/api/updateTime', async (ctx) => {
  ctx.status = 200
  const data = ctx.request.body
  console.log('login.js > updateTime ---- ', data)
  // 更新时间
  const date = new Date()
  const formatTime = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
  await db.updateOne('user', { email: data.email }, { $set: { RecentlyTime: formatTime } })
  ctx.body = {
    type: data.type,
    msg: 'success'
  }
})

router.post('/api/login', async (ctx, next) => {
  ctx.status = 200
  const data = ctx.request.body
  const queryData = {}
  queryData.email = data.uid
  // eslint-disable-next-line no-unused-expressions
  data.type === 'pwd' ? queryData.pwd = data.pwd : '' // 当验证密码时，查询条件加上密码
  const result = await db.find('user', queryData) // 查询数据
  if (result.length > 0) { // 当查询到匹配的数据则验证成功
    const token = data.type === 'pwd' ? jwt.getToken(ctx.uid) : '' // 当密码验证成功时，返回token给客户端
    const resultArr = [{
      msg: '验证成功',
      type: 'uid'
    }, {
      msg: '登录成功',
      token: token,
      nickName: result[0].nickName,
      email: result[0].email,
      avatar: result[0].avatar,
      type: 'pwd'
    }]
    ctx.body = data.type === 'uid' ? resultArr[0] : resultArr[1]
  } else {
    const resultArr = [{
      msg: '请输入有效的邮箱地址或账号',
      type: 'err'
    }, {
      msg: '密码错误，请重试或点击“忘记密码”以重置密码',
      type: 'err'
    }]
    ctx.body = data.type === 'uid' ? resultArr[0] : resultArr[1]
  }
})

router.post('/api/signSuc', async (ctx) => {
  ctx.status = 200
  const data = ctx.request.body
  // 注册时间
  const date = new Date()
  const formatTime = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
  // 用户信息写入
  const queryData = {}
  queryData.nickName = data.firstName
  queryData.trueName = data.lastName
  queryData.pwd = data.pwd
  queryData.email = data.email
  queryData.avatar = data.avatar
  queryData.access = 'user'
  queryData.time = formatTime
  await db.insertOneData('user', queryData)
  const result = await db.find('user', queryData) // 查询数据
  if (result.length === 1) {
    ctx.body = {
      uid: data.uid,
      emial: data.email,
      type: 'success'
    }
  }
})

router.post('/api/forget', async (ctx) => {
  ctx.status = 200
  const data = ctx.request.body
  if (data.type === 'email') {
    const queryData = {}
    queryData.email = data.email
    const result = await db.find('user', queryData) // 查询数据
    if (result.length > 0 && result[0].email === data.email) { // 匹配到是已注册用户，则发送验证码
      const date = new Date()
      const code = date.getHours().toString() + date.getMinutes().toString() + date.getSeconds().toString()
      sendEmail({
        obj: data.email,
        code: code
      })
      ctx.body = {
        code: code,
        type: 'codeSuc'
      }
    } else { // 数据库中不存在该用户
      ctx.body = {
        code: '',
        type: 'codeErr',
        msg: '不存在该用户，请重试'
      }
    }
  } else if (data.type === 'newPwd') {
    const queryData = {}
    queryData.email = { email: data.email }
    queryData.pwd = data.pwd
    db.changePwd('user', queryData)
    ctx.body = {
      type: 'newPwd'
    }
  }
})

router.post('/api/sign', async (ctx) => {
  ctx.status = 200
  const data = ctx.request.body
  const date = new Date()
  const code = date.getHours().toString() + date.getMinutes().toString() + date.getSeconds().toString() // 利用时间组合成验证码
  if (data.type === 'Resend') { // 重新发送验证码
    sendEmail({
      obj: data.email,
      code: code
    })
    ctx.body = {
      code: code,
      type: 'code'
    }
    return
  }
  const queryData = {}
  queryData.email = data.email
  const result = await db.find('user', queryData) // 查询数据
  if (result.length !== 0) { // 能查询到用户说明邮箱已经注册过了
    ctx.body = {
      uid: data.uid,
      email: data.email,
      msg: '邮箱已被注册',
      type: 'error',
      error: '0' // 假装是错误代码，邮箱已经被注册
    }
  } else {
    const date = new Date()
    const code = date.getHours().toString() + date.getMinutes().toString() + date.getSeconds().toString() // 利用时间组合成验证码
    sendEmail({ // 发送验证码
      obj: data.email,
      code: code
    })
    ctx.body = {
      uid: data.uid,
      code: code,
      type: 'code'
    }
  }
})

module.exports = router.routes()