import {Hono} from 'hono'
import {secureHeaders} from 'hono/secure-headers'
import auth from './routes/auth'

const app = new Hono()

app.use(secureHeaders())

app.get('/', (c) => c.json({ status: 'ok' }))
app.route('/auth', auth)

export default {
  port: 3000,
  fetch: app.fetch,
}
