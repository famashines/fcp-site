FROM node:24.22.1-alpine AS build
WORKDIR /app
COPY figure figure
COPY public public
RUN node figure/build.mjs

FROM nginxinc/nginx-unprivileged:1.30.6-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/public /usr/share/nginx/html
RUN nginx -t
