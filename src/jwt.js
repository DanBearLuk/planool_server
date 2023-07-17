const jose = require('jose');

let secret;
jose.generateSecret('HS256').then(value => {
    secret = value;
})

async function createJWT(payload, expTime) {
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expTime)
      .sign(secret);
  
    return jwt;
}

async function verifyJWT(token) {
    const { payload } = await jose.jwtVerify(token, secret);

    if (payload.exp >= Date.now()) {
        throw new Error('JWT expired');
    }

    return payload;
}

module.exports = {
    createJWT, verifyJWT
};
