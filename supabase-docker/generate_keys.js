const crypto = require('crypto');

// JWT Secret
const jwtSecret = 'N3e1/1OHEVZRR8ksaxw+1xpgUY09n9enhDQWMhiCBOGHvycpJypyuix38X1he1FJ';

function base64url(source) {
  let encodedSource = Buffer.from(source).toString('base64');
  encodedSource = encodedSource.replace(/=+$/, '');
  encodedSource = encodedSource.replace(/\+/g, '-');
  encodedSource = encodedSource.replace(/\//g, '_');
  return encodedSource;
}

function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedHeader + '.' + encodedPayload)
    .digest('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return encodedHeader + '.' + encodedPayload + '.' + signature;
}

// 5 years from now
const exp = Math.floor(Date.now() / 1000) + (5 * 365 * 24 * 60 * 60);
const iat = Math.floor(Date.now() / 1000);

const anonPayload = {
  role: 'anon',
  iss: 'supabase',
  iat: iat,
  exp: exp
};

const serviceRolePayload = {
  role: 'service_role',
  iss: 'supabase',
  iat: iat,
  exp: exp
};

console.log('ANON_KEY=' + createJWT(anonPayload, jwtSecret));
console.log('SERVICE_ROLE_KEY=' + createJWT(serviceRolePayload, jwtSecret));
