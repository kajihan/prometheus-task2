const path = require('path');
const serve = require('koa-static');
const views = require('koa-views');
const Koa = require('koa');
const redis = require('./db/redis');
const appPort = require('../config/app');
const client = require('prom-client'); // Added for Prometheus

const app = module.exports = new Koa();

// Prometheus setup
const register = new client.Registry();
client.collectDefaultMetrics({ register }); // Collect default metrics (CPU, memory, etc.)

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  registers: [register],
});

// Setup views
app.use(serve(`${__dirname}/public`));
app.use(views(path.join(__dirname, '/views'), { extension: 'ejs' }));

// Dummy data
const user = {
  name: {
    first: 'Tobi',
    last: 'Holowaychuk'
  },
  species: 'ferret',
  age: 3
};

// Metrics endpoint
app.use(async (ctx, next) => {
  if (ctx.url === '/metrics') {
    ctx.set('Content-Type', register.contentType);
    ctx.body = await register.metrics();
  } else {
    await next();
  }
});

// Render routes
app.use(async (ctx) => {
  httpRequestCounter.inc(); // Increment request counter for every request
  if (ctx.url === '/redis') {
    const data = await redis.ping();
    return ctx.render('redis', { redisData: data });
  }
  return ctx.render('user', { user });
});

if (!module.parent) app.listen(appPort);
