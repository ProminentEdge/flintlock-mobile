# vida-mobile
---
### How to install:

VIDA requires _Ionic_ which can be downloaded by using this command:
```sh
$ npm install -g ionic
```

VIDA will also require [NodeJS (v0.12.2 tested)](0) to be installed.


Once both are installed, you can begin by cloning the repo, and following these steps:
```sh
git clone <this repo>
cd vida-mobile
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
- launch platforms/ios/vida-mobile.xcodeproj in xcode
- click the "build and then run" (play) button to launch the app on device

###### Debug
- use Safari's developer tools / inspector to vew console output and debug DOM /js code
- in Safari console, run 'window.location.reload()' to reload the app to see console output from when the app is launched


Thank you and enjoy! 

_VIDA Team_


[0]: https://nodejs.org/en/blog/release/v0.12.2/
