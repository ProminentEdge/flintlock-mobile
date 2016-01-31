# flintlock-mobile
---
### How to install:

VIDA uses [Ionic Framework](1)  but before you can insatll Ionic, you need to have Node Package Manager ```npm``` and ```bower```. 
To install npm you can install it from (we've tested with this version):
```
https://nodejs.org/dist/v0.12.0/node-v0.12.9.pkg
```

To install bower:
```sh
$ sudo npm install -g bower
```

To install ionic run:
```sh
$ sudo npm install -g cordova
$ sudo npm install -g ionic
```

To install the emulators for iOS and Android run:
```sh
$ npm install -g ios-sim
$ npm install -g android-sim
```

At this point you can build the mobile app:
```sh
git clone https://github.com/ROGUE-JCTD/flintlock-mobile.git
cd flintlock-mobile
./clean-build.sh
```
Next, run the app in one of the following platforms

#### Chrome
```sh
# launch app in chrome for easy and fast development
ionic serve
```

#### Android
```sh
# launch the android emulator
ionic emulate android

# launch the application on the connected android device
ionic run android

# build an APK (needs to be signed to install)
ionic build android --release
```
###### Debug
- launch chrome and use the developer tools. Works for emulator and you can and you can go to 'chrome://inspect/#devices'
  in the address bar to connect to a physical android device

#### iOS
```sh
# launch ios emulator (on OSX only)
ionic emulate ios

# build the iOS version of the app
ionic build ios
```
###### Launch on iOS device
- you need to have a Apple Developer License which costs 99$ per year
- when you launch xcode, you can log in with your apple account to utilize the license
- launch platforms/ios/flintlock-mobile.xcodeproj in xcode
- click the "build and then run" (play) button to launch the app on device

###### Debug
- use Safari's developer tools / inspector to vew console output and debug DOM /js code
- in Safari console, run 'window.location.reload()' to reload the app to see console output from when the app is launched

#### Notes
- to add a new plugin, add it to `clean-build.sh` and then run clean bulild as opposed to running the ionic/cordova command directly. This will ensure that all platforms get the plug ing setup properly. 
- before committing, run `clean-build.sh` and do a test on emulators as well as any devices you have to help catch problems across platforms


[0]: https://nodejs.org/en/blog/release/v0.12.2/
[1]: http://ionicframework.com/
