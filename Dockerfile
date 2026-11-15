# Based on https://github.com/utensils/docker-opengl

FROM alpine:3.22 AS base

RUN apk -U add --no-cache \
  git

FROM base AS build

RUN apk -U add --no-cache \
  autoconf \
  automake \
  boost-dev \
  build-base \
  freetype-dev \
  glew-dev \
  glm-dev \
  glu-dev \
  libjpeg-turbo-dev \
  libpng-dev \
  libtool \
  mesa-dev \
  pcre2-dev \
  pkgconf \
  sdl2-dev \
  sdl2_image-dev

RUN git clone --recursive --shallow-submodules -b umarcor/key-overflow https://github.com/umarcor/gource \
 && cd gource \
 && ./autogen.sh \
 && ./configure --prefix=/usr/local \
 && make -j"$(nproc)" \
 && make install DESTDIR=/opt/gource

FROM base

RUN apk -U add --no-cache \
  binutils \
  expat \
  ffmpeg \
  gource \
  llvm20-libs \
  mesa-dri-gallium \
  py3-pyaml \
  setxkbmap \
  xdpyinfo \
  xrandr \
  xvfb \
  xvfb-run \
  zstd-libs

COPY --from=build /opt/gource/usr/local /usr/local

ENV PATH="/usr/local/bin:${PATH}"

ENV \
  DISPLAY=":99" \
  GALLIUM_DRIVER="llvmpipe" \
  LIBGL_ALWAYS_SOFTWARE="1" \
  LP_DEBUG="" \
  LP_NO_RAST="false" \
  LP_NUM_THREADS="" \
  LP_PERF="" \
  XVFB_WHD="1920x1080x24"

COPY xrun.sh /xrun.sh
