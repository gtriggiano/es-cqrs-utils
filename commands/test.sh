#! /bin/bash

set -e

source "${BASH_SOURCE%/*}/common.sh"

cleanService development

if [[ "$1" == "live" ]]; then
  CMD="mocha --compilers js:babel-register -b -w tests"
else
  echo -n "Transpiling package and tests... "
  source "${BASH_SOURCE%/*}/transpile.sh" &> /dev/null
  cleanService development &> /dev/null
  echo "Done."
  CMD="mocha lib-tests"
fi

runAsService development $CMD

cleanService development
