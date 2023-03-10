## Description

Based on [lnproxy](https://github.com/lnproxy/lnproxy), couldn't get it work so built the typescript version.

## Installation

### Docker

- For docker, check the Dockerfile and the sample docker-compose.yaml file in the repo.

### NodeJs and Yarn

- You will need NodeJs and Yarn
- You will need to pass env variables for cert, macaroon and socket. Check the .env.example file in the repo.

```bash
# Clone the repo
git clone https://github.com/niteshbalusu11/lnproxy-ts.git

# Change directory
cd lnproxy-ts

# Install dependencies
yarn

# Build app
yarn build

# Start app
yarn start:prod
```

## Example

```bash
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"request":"ADD_BOLT_11_INVOICE_HERE"}' \
  http://localhost:4545

```

## License

lnproxy-ts is [MIT licensed](License).
