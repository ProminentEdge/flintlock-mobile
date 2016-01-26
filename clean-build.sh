#!/bin/bash
set -e

echo ========== Cleaning Bower ==========
rm -rf vendor
bower cache clean
rc=$?
if [ $rc != 0 ] ; then
    echo Failed to clean the bower cache
    exit $rc
fi

echo ========== Installing Bower Dependencies ==========
bower install
rc=$?
if [ $rc != 0 ] ; then
    echo Failed to install bower dependencies
    exit $rc
fi

echo ========== Cleaning Node Modules ==========
rm -rf node_modules

echo ========== Installing Node Modules ==========
npm install

echo ========== Cleaning Platforms ==========
rm -rf platforms

echo ========== Cleaning Plugins ==========
rm -rf plugins

ionic platform add android
ionic platform add ios
ionic plugin add ionic-plugin-keyboard
ionic plugin add cordova-plugin-whitelist
ionic plugin add cordova-plugin-device
ionic plugin add cordova-plugin-console
ionic plugin add cordova-plugin-network-information
ionic plugin add cordova-plugin-camera
ionic plugin add cordova-plugin-file
ionic plugin add cordova-plugin-file-transfer
ionic plugin add https://github.com/wildabeast/BarcodeScanner.git
ionic plugin add cordova-plugin-geofence
ionic plugin add cordova-plugin-dialogs
ionic plugin add https://github.com/EddyVerbruggen/cordova-plugin-actionsheet.git
ionic plugin add https://github.com/EddyVerbruggen/Toast-PhoneGap-Plugin.git
ionic plugin add https://github.com/brodysoft/Cordova-SQLitePlugin.git
ionic plugin add https://github.com/an-rahulpandey/cordova-plugin-dbcopy.git
ionic plugin add https://github.com/pbernasconi/cordova-progressIndicator.git
ionic plugin add cordova-plugin-geolocation
ionic plugin add cordova-plugin-inappbrowser

