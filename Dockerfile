FROM socrata/nodejs

ENV APP sr-shelter-sync

WORKDIR /srv

ADD index.js /srv/${APP}/
ADD package.json /srv/${APP}/

COPY ship.d /etc/ship.d

WORKDIR /srv/${APP}

RUN npm install
