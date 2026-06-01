FROM node:22

RUN apt-get update && \
    apt-get install -y ghostscript && \
    apt-get install -y graphicsmagick && \
    apt-get install -y vim && \
    apt-get install -y tar && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Настройка Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
# ENV PUPPETEER_CACHE_DIR=/usr/src/app/.cache/puppeteer

WORKDIR /usr/src/app

VOLUME ["/input", "/output"]

COPY . .

CMD ["/bin/bash"]