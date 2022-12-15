## Description

Based on [lnproxy](https://github.com/lnproxy/lnproxy), couldn't get it work so built the typescript version.

## Installation

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
yarn build:prod
```

## License

Nest is [MIT licensed](LICENSE).
