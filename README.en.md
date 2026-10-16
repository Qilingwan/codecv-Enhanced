# codecv-Enhanced

This is a tool for creating resumes using `markdown`. It can convert your written `markdown` resume into a `PDF` format, supports multiple templates, and runs on love.

Fork from: https://github.com/acmenlei/codecv .

<div style="font-size: 1.5rem;">
  <a href="./README.md">中文</a> |
  <a href="./README.en.md">English</a>
</div>
</br>

> Declaration: This project is published on GitHub/Gitee, free and as an open source learning use, use spare time for continuous development, deployment please indicate the original author and the original warehouse address in a prominent place on the website, do not use for commercial purposes without the author's permission!

## Docker deploy

You can directly run using the image I have already built.

```sh
docker run -d -t -p 8080:80 --name codecv --restart=always docker.io/wenyang0/codecv:latest
```

Or, you can manually compile it yourself if you prefer.

```sh
#clone the code
git clone https://github.com/acmenlei/codecv.git

#docker build
cd codecv/
docker build -t codecv:v1 .

#start server
docker run -d -t -p 8080:80 --name codecv --restart=always codecv:v1
```

Finally, open your browser and access the service's address at http://serverIP:8080

## Preview of the result

<p>Resume template</p>

<img style="max-width: 1000px" src="./docs/templates.webp" alt="模板" />

<p>Resume editing and dark themes</p>

<img style="max-width: 1000px" src="./docs/editor.webp" alt="编辑页" />

<p>Built-in multiple vector ICONS</p>

<img style="max-width: 1000px" src="./docs/iconfont.webp" alt="矢量图标" />

## ChangeLOG

|    DATE    | VERSION |                             LOG                              |
| :--------: | :-----: | :----------------------------------------------------------: |
| 2026.10.16 | v1.1.2  | Added gridLayout syntax to support center alignment of elements within the container. |
| 2026.10.16 | v1.1.1  | Fixed an issue where the original tool was unable to export correctly. |



MIT © [Coderlei](./license)
