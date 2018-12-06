#!/bin/bash
set -e

# If not yet inside of Docker-container, build and run it.
if [ "$1" != "--inside" ]; then
    echo -e "\n---------------------------------------------------------"\
            "Build and Run Docker Testing Containers..."\
            "---------------------------------------------------------\n"
    ROOT="`git rev-parse --show-toplevel`/"
    cd "$ROOT"

    # Add user build args if the local uid does not match `node` default user,
    #  so that files created inside the container have the same owner as the
    #  user running the test command.
    build_args=""
    user="node"
    uid=`id --user`
    if [ "$uid" != 1000 ]; then
        gid=`id --group`
        user="dafny"
        build_args="--build-arg UID=${uid} --build-arg GID=${gid} --build-arg USER=${user}"
    fi

    docker build -f scripts/Dockerfile ${build_args} -t instituteforsoftware/dafny-vscode-test .
    docker run --rm --mount type=bind,source="$ROOT",target="/home/${user}/source" \
        instituteforsoftware/dafny-vscode-test
    exit $?
fi

echo -e "\n---------------------------------------------------------"\
        "Prepare Test Environment..."\
        "---------------------------------------------------------\n"
export NODE_ENV=dev \
       DISPLAY=:99 \
       XVFB_WHD=${XVFB_WHD:-1280x720x16} \
       CXX="g++-4.9" \
       CC="gcc-4.9"

# Start Xvfb and filter out non-root error message
Xvfb :99 -ac -screen 0 $XVFB_WHD -nolisten tcp 2>&1\
    | grep -v "_XSERVTransmkdir: ERROR: euid != 0,directory /tmp/.X11-unix will not be created." &
xvfb=$!

for i in $(seq 1 10)
do
    echo "Waiting for Xvfb..."
    sleep 1
    xdpyinfo -display ${DISPLAY} >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        break
    fi

    if [ "$i" -gt 9 ]; then
        echo "Waiting for Xvfb timed out. (Waited for $i seconds)"
        exit 255
    fi
done


echo -e "\n---------------------------------------------------------"\
        "Building and Testing Server..."\
        "---------------------------------------------------------\n"
pushd server >/dev/null
    npm install
    npm run compile
popd >/dev/null


echo -e "\n---------------------------------------------------------"\
        "Building and Testing Client..."\
        "---------------------------------------------------------\n"
pushd client >/dev/null
    npm install
    npm run vscode:prepublish
    npm run test
popd >/dev/null

echo "Done."
