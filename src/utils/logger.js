console._log = console.log;
console._debug = console.debug;
console._error = console.error;
console._info = console.info;

console.log = (...data) => {
  console._log('[LOG]', ...data);
};

console.debug = (...data) => {
  if (process.env.DEBUG !== 'true') return;
  console._debug('[DEBUG]', ...data);
};

console.error = (...data) => {
  console._error('[ERROR]', ...data);
};

console.info = (...data) => {
  console._info('[INFO]', ...data);
};
