import { expressjwt, GetVerificationKey } from "express-jwt";
import jwksRsa from "jwks-rsa";
import dotenv from "dotenv";

dotenv.config();

const issuerBaseUrl = process.env.AUTH0_ISSUER_BASE_URL?.endsWith('/') 
  ? process.env.AUTH0_ISSUER_BASE_URL 
  : `${process.env.AUTH0_ISSUER_BASE_URL}/`;

export const checkJwt = expressjwt({
  // Dynamically provide a signing key based on the 'kid' in the header and the signing keys provided by the JWKS endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `${issuerBaseUrl}.well-known/jwks.json`
  }) as GetVerificationKey,

  // Validate the audience and the issuer.
  audience: process.env.AUTH0_AUDIENCE,
  issuer: issuerBaseUrl,
  algorithms: ["RS256"]
});
