const isProd = process.env.NODE_ENV === 'production';

const LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const COLORS = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', http: '\x1b[90m', debug: '\x1b[90m' };
const RESET = '\x1b[0m';

function format(level, message, meta) {
  const ts = new Date().toISOString();
  if (isProd) {
    const entry = { ts, level, message };
    if (meta && Object.keys(meta).length) Object.assign(entry, meta);
    return JSON.stringify(entry);
  }
  const color = COLORS[level] || '';
  const metaStr = meta && Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `${color}[${level.toUpperCase().padEnd(5)}]${RESET} ${ts} ${message}${metaStr}`;
}

const logger = {
  error: (msg, meta = {}) => console.error(format('error', msg, meta)),
  warn:  (msg, meta = {}) => console.warn(format('warn',  msg, meta)),
  info:  (msg, meta = {}) => console.log(format('info',   msg, meta)),
  http:  (msg, meta = {}) => { if (!isProd || LEVELS.http <= (LEVELS[process.env.LOG_LEVEL] ?? 2)) console.log(format('http', msg, meta)); },
  debug: (msg, meta = {}) => { if (!isProd) console.debug(format('debug', msg, meta)); },
  stream: { write: (msg) => console.log(format('http', msg.trim())) },
};

module.exports = logger;
