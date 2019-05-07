FROM node:10-stretch

# Note that there is already a node user with UID/GID 1000
ARG UID=1000
ARG GID=1000
ARG USER=node

ARG DAFNY_RELEASE=v2.3.0
ARG DAFNY_RELEASEFILE=dafny-2.3.0.10506-x64-debian-8.11.zip

RUN if [ "${USER}" != "node" ]; then \
      addgroup --gid ${GID} ${USER}; \
      useradd -d /home/${USER} -m -u ${UID} -g ${USER} ${USER};\
    fi

RUN apt-get update && \
    apt-get install -y mono-complete unzip xvfb x11-utils \
                       libdbus-1-3 libgtk-3-0 libnotify-bin libgnome-keyring0 libgconf2-4 \
                       libasound2 libcap2 libcups2 libxtst6 libxss1 libnss3

RUN wget -q -O /tmp/dafny.zip https://github.com/Microsoft/dafny/releases/download/${DAFNY_RELEASE}/${DAFNY_RELEASEFILE} && \
    unzip /tmp/dafny.zip -d /usr/local/bin/ && \
    rm /tmp/dafny.zip && \
    chmod -R 755 /usr/local/bin/dafny
ENV DAFNY_PATH=/usr/local/bin/dafny


USER ${USER}

RUN mkdir /home/${USER}/source
VOLUME [ "/home/${USER}/source" ]

WORKDIR /home/${USER}/source
ENTRYPOINT scripts/test-docker.bash --inside
