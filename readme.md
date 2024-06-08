# IO Hooks

clone iohook

```shell
https://github.com/wilix-team/iohook.git
```

build

```shell
npm run build
```

Install verdaccio

```shell
npm install -g verdaccio
```

Get verdaccio

```shell
docker run -it --rm --name verdaccio -p 4873:4873 verdaccio/verdaccio
```

Set npm repo

```shell
npm config set registry http://localhost:4873
npm adduser --registry  http://localhost:4873
npm config get registry
```

Publish iohooks (from the iohooks base dir after running npm run build)

```shell
npm publish
```

Then from the base of this repo

```shell
npm install iohooks
```


Then to reset registry

```shell
npm config delete registry
```

and stop docker

```shell
docker stop verdaccio
```
