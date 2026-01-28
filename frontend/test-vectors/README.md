# Test Vectors

This directory contains test vectors for cryptographic operations and data parsing.

## Structure

### AES Test Vectors (aes-vectors.json)
Test vectors for AES-256-GCM encryption/decryption:
```json
{
  "vectors": [
    {
      "name": "Test Vector 1",
      "plaintext": "Hello World",
      "key": "base64-encoded-256-bit-key",
      "iv": "base64-encoded-96-bit-iv",
      "ciphertext": "base64-encoded-ciphertext",
      "tag": "base64-encoded-128-bit-auth-tag"
    }
  ]
}
```

### PGP Test Vectors (pgp-vectors.json)
Test vectors for PGP encryption/decryption:
```json
{
  "vectors": [
    {
      "name": "Test Vector 1",
      "plaintext": "Swap backup data",
      "publicKey": "ASCII-armored PGP public key",
      "privateKey": "ASCII-armored PGP private key",
      "passphrase": "optional-passphrase",
      "encrypted": "ASCII-armored PGP message"
    }
  ]
}
```

### URL Parsing Test Vectors (url-vectors.json)
Test vectors for URL fragment parsing and config encoding:
```json
{
  "vectors": [
    {
      "name": "Basic Config",
      "descriptor": "ct(...)",
      "currency": "USD",
      "showGear": false,
      "showDescription": true,
      "encoded": "expected-base64url-output"
    }
  ]
}
```

## Usage

These test vectors are used by the test suites to ensure consistent behavior across implementations and to catch regressions.

## Adding New Vectors

When adding new test vectors:
1. Include a descriptive name
2. Provide all required fields
3. Document any special conditions or edge cases
4. Verify the vector works with the actual implementation before committing
