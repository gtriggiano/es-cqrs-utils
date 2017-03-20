#!/bin/bash

PKG_NAME=es-utils

function cleanContainers () {
  echo
  echo -n 'Stopping and removing all containers... '
  docker-compose -p $PKG_NAME stop &>/dev/null
  docker-compose -p $PKG_NAME rm -f &>/dev/null
  echo 'Done.'
  echo
}

function cleanService () {
  local SERVICE=$1
  if [[ -n "$SERVICE" ]]; then
    echo
    echo -n "Stopping and removing all '$SERVICE' containers... "
    docker-compose -p $PKG_NAME stop $SERVICE &>/dev/null
    docker-compose -p $PKG_NAME rm -f $SERVICE &>/dev/null
    echo 'Done.'
    echo
  fi
}

function startService () {
  local SERVICE=$1
  if [[ -n "$SERVICE" ]]; then
    echo
    echo -n "Starting service '$SERVICE'... "
    docker-compose -p $PKG_NAME up -d $SERVICE &>/dev/null
    echo 'Done.'
    echo
  fi
}

function stopService () {
  local SERVICE=$1
  if [[ -n "$SERVICE" ]]; then
    echo
    echo -n "Stopping all '$SERVICE' containers... "
    docker-compose -p $PKG_NAME stop $SERVICE &>/dev/null
    echo 'Done.'
    echo
  fi
}

function runAsService () {
  local SERVICE=$1
  shift
  local CMD=$@
  if [[ -n "$SERVICE" && -n "$CMD"  ]]; then
    docker-compose -p $PKG_NAME run $SERVICE $CMD
  fi
}

function separator () {
  echo "================================================="
}
