## Description

Based on [lnproxy](https://github.com/lnproxy/lnproxy), couldn't get it work so built the typescript version.

## Installation

### Docker

- For docker, check the Dockerfile and the same docker-compose.yaml file in the repo.

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
yarn build:prod
```

## Example

```bash
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"request":"lnbc1u1p3ektm5pp59f52s6wsuxp9aus8s4xnksup6x0akhtaavr3jkehfatrx6uady8qdqqcqzpgxqyz5vqsp564xu29tc66kvhxut5u3t3lgfr0z5cza96smp6ryv85qg2f22zv2q9qyyssqrc4m9jtulxzw68sya046zf3vznmm7tmfwsnfattrwzuqvcf79q2pq2h8uedhvtgl026smwjseqwa225wec0he9k7xf5hvlu8em3nxtcqt0ndqh"}' \
  http://localhost:4545
```

## License

Nest is [MIT licensed](LICENSE).
