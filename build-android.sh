#!/bin/bash
set -e

echo ========== Cleaning Builds ==========
rm -rf flintlock-bin
mkdir flintlock-bin

echo ========== Building Android ==========
ionic build android

echo ========== Moving Binaries ==========
mkdir -p flintlock-bin/android
mv platforms/android/build/outputs/apk/android-debug.apk flintlock-bin/android/flintlock.apk

echo ========== Done ==========
