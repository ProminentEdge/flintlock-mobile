angular.module('vida.controllers', ['ngCordova.plugins.camera', 'pascalprecht.translate'])


.controller('AppCtrl', function($rootScope, $scope, $ionicModal, $timeout, shelterService, $translate, configService) {
  console.log('---------------------------------- AppCtrl');
  $translate.instant("title_search");
  console.log('---------------------------------- translate: ', $translate.instant("title_search"));



    $rootScope.$on('$stateChangeStart',function(event, toState, toParams, fromState, fromParams){
    console.log('$stateChangeStart to '+toState.to+'- fired when the transition begins. toState,toParams : \n',toState, toParams);
    });

  $rootScope.$on('$stateChangeError',function(event, toState, toParams, fromState, fromParams){
    console.log('$stateChangeError - fired when an error occurs during transition.');
    console.log(arguments);
  });

  $rootScope.$on('$stateChangeSuccess',function(event, toState, toParams, fromState, fromParams){
    console.log('$stateChangeSuccess to '+toState.name+'- fired once the state transition is complete.');
  });

  $rootScope.$on('$viewContentLoaded',function(event){
    console.log('$viewContentLoaded - fired after dom rendered',event);
  });

  $rootScope.$on('$stateNotFound',function(event, unfoundState, fromState, fromParams){
    console.log('$stateNotFound '+unfoundState.to+'  - fired when a state cannot be found by its name.');
    console.log(unfoundState, fromState, fromParams);
  });

  // Create the login modal that we will use later
  //$ionicModal.fromTemplateUrl('views/modal-sample.html', {
  //  scope: $scope
  //}).then(function(modal) {
  //  $scope.modal = modal;
  //});

  // Triggered in the login modal to close it
  $scope.cancelModal = function() {
    $scope.modal.hide();
  };

  // Open the login modal
  $scope.modal_sample = function() {
    $scope.modal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.okayModal = function() {
    console.log('Doing login', $scope.loginData);
  };

  $rootScope.center = {
    lat: 0,
    lng: 0,
    zoom: 0
  };

  // initialize once. we will only work with this created object from now on
  $rootScope.markers = {};

})

.controller('PersonDetailEditCtrl', function($scope, $state, $rootScope, $stateParams, $http, shelter_array, $cordovaToast,
                                             $filter, $cordovaActionSheet, $cordovaCamera, configService, shelterService,
                                             $cordovaProgress) {
  console.log('---------------------------------- PersonDetailEditCtrl');

  $scope.setupSaveCancelButtons = function() {
    // Setup tab-specific buttons
    var tabs = document.getElementsByClassName("tab-item");
    for (var i=0; i < tabs.length; i++) {
      tabs[i].setAttribute('style', 'display: none;');
    }

    var editDeleteButtons = document.getElementsByClassName("button-person-edit");
    var saveCancelButtons = document.getElementsByClassName("button-person-post-edit");
    for (i=0; i < saveCancelButtons.length; i++) {
      saveCancelButtons[i].setAttribute('style', 'display: block;');  // Enables buttons
    }

    $scope.$on("$destroy", function(){
      for (var i=0; i < tabs.length; i++) {
        tabs[i].setAttribute('style', 'display: none;');
      }

      for (i=0; i < saveCancelButtons.length; i++) {
        saveCancelButtons[i].setAttribute('style', 'display: none;');   // Removes buttons
      }

      for (i=0; i < editDeleteButtons.length; i++) {
        editDeleteButtons[i].setAttribute('style', 'display: block;');   // Enables buttons
      }
    });
  };

  $rootScope.buttonPersonCancel = function() {
    console.log('PersonDetailCtrl - buttonPersonCancel()');

    if (confirm($filter('translate')('dialog_confirm_cancel'))) {
      window.history.back();
    }
  };

  // Startup
  $scope.setupSaveCancelButtons();
  $cordovaProgress.hide();
})

.controller('ShelterSearchCtrl', function($scope, $location, $http){
  console.log('---------------------------------- ShelterSearchCtrl');
})

.controller('SettingsCtrl', function($scope, $location, configService, $translate, $cordovaOauth, $ionicPopup,
                                     localDBService, $rootScope, $cordovaToast, $cordovaInAppBrowser, loginService,
                                     $http, $state, reportService, utilService){
  console.log('---------------------------------- SettingsCtrl');

  $scope.configService = configService;
  $scope.reportService = reportService;
  $scope.isPushingMedia = false;

  $scope.languageOptions = [
    {
      "name": 'settings_language_english',
      "value": "English"
    },
    {
      "name": 'settings_language_spanish',
      "value": "Spanish"
    }
  ];

  $scope.protocolOptions = [
    {
      "name": 'Http',
      "value": 'http'
    },
    {
      "name": 'Https (SSL)',
      "value": 'https'
    }
  ];

  $scope.logout = function(url) {
    // Can go directly to '/login'
    $location.path(url);
  };

  $scope.deauthorize = function() {
    configService.resetAuthorizationConfig();
    configService.saveConfig().then(function(){
      $state.go('vida.report-create');
    });
  };

  $scope.authorize = function() {
    if (utilService.isConnected()) {
      loginService.loginDjangoGoogleOauth().then(function () {
        $cordovaToast.showShortBottom('Authorization suceeded');
        $state.go('vida.report-create');
      }, function () {
        console.log('==== authorization failed! ====');
      });
    } else {
      $cordovaToast.showShortBottom('Cannot authorize without network connectivity');
    }
  };

  $scope.switchLanguage = function() {
    if (configService.getConfig().language.value === "English")
      $translate.use('en');
    else if (configService.getConfig().language.value === "Spanish")
      $translate.use('es');
    else
      $translate.use('en');

    configService.saveConfig();
  };

  $scope.resetDB = function() {
    $ionicPopup.confirm({
      title: 'Reset Database',
      template: 'All pending reports and media will be reset. Continue?'
    }).then(function(res) {
      if (res) {
        localDBService.removeAllKeys('reports').then(function(){
          localDBService.removeAllKeys('media').then(function(){
            localDBService.getRowsCount('reports').then(function(count) {
              $rootScope.pendingReportsCount = count;
              $cordovaToast.showShortBottom('Reports and media were reset');
            });
          });
        });
      }
    });
  };

  $scope.dumpDB = function() {
    localDBService.getAllRows('reports').then(function(res) {
      console.log('reports, keys: ', localDBService.getAllRowsKeys(res));
      console.log('reports, values: ', localDBService.getAllRowsValues(res, true));
    });
    localDBService.getAllRows('media').then(function(res) {
      console.log('media, keys: ', localDBService.getAllRowsKeys(res));
      console.log('media, values: ', localDBService.getAllRowsValues(res));
    });
    localDBService.getAllRows('forms').then(function(res) {
      console.log('forms, keys: ', localDBService.getAllRowsKeys(res));
      console.log('forms, values: ', localDBService.getAllRowsValues(res));
    });
    localDBService.getAllRows('properties').then(function(res) {
      console.log('properties, keys: ', localDBService.getAllRowsKeys(res));
      console.log('properties, values: ', localDBService.getAllRowsValues(res));
    });

    console.log('current config: ', configService.getConfig());
  };

  $scope.pushMedia = function() {
    console.log('---------- pushMedia');
    if ($scope.isPushingMedia === false) {
      $scope.isPushingMedia = true;

      var onSuccess = function(){
        $scope.isPushingMedia = false;
        $cordovaToast.showShortBottom('Completed pushing media');
      };

      var onError = function(){
        $scope.isPushingMedia = false;
      };

      localDBService.getRowsCount('media').then(function (count) {
        if (count > 0) {
          $ionicPopup.confirm({
            title: 'Push Media',
            template: 'Push the ' + count + ' media as opposed to a full sync?'
          }).then(function (res) {
            if (res) {
              reportService.pushMedia().then(onSuccess, onError);
            } else {
              onError();
            }
          });
        } else {
          $scope.isPushingMedia = false;
          $cordovaToast.showShortBottom('No media to push');
        }
      }, onError);
    }
  }

})

.controller('TrackingCtrl', function($scope, $location, configService,
                                     $translate, $interval, geolocationService, trackerService,
                                     $filter, $timeout, $cordovaToast){
  console.log('---------------------------------- TrackingCtrl');
  // Note: due to an angular scoping bug, toggle sate needs to be in another object
  $scope.tracking = { state: false };
  $scope.mayday = { state: false };
  $scope.trackingInterval = null;
  $scope.configService = configService;
  $scope.isLoading = false;

  $scope.$watch('mayday.state', function(newVal, oldVal) {
    if (newVal !== oldVal) {
      if (newVal === true) {
        $scope.tracking.state = true;
      }
    }
  });

  $scope.$watch('tracking.state', function(newVal, oldVal) {
    if (newVal !== oldVal) {
      if (newVal === false) {
        $scope.mayday.state = false;
        $scope.trackingStop();
      } else {
        $scope.trackingStart();
      }
    }
  });

  $scope.trackingStart = function() {
    console.log('----[ trackingStart');
    if ( $scope.trackingInterval !== null ) return;
    $scope.trackingProcess(); // call immediately and schedule another
  };

  $scope.trackingScheduleNext = function() {
    if ($scope.tracking.state) {
      if ($scope.trackingInterval !== null) return;
      $scope.trackingInterval = $timeout($scope.trackingProcess, 10000);
    }
  };

  $scope.trackingStop = function() {
    console.log('----[ trackingStop');
    if ($scope.trackingInterval !== null) {
      $timeout.cancel($scope.trackingInterval);
      $scope.trackingInterval = null;
    }
  };

  $scope.trackingProcess = function() {
    console.log('---[ trackingProcess ');
    $scope.isLoading = true;
    geolocationService.getCurrentPosition().then(function (position) {
      trackerService.push(position, $scope.mayday.state).then(function(){
        $scope.isLoading = false;
        configService.getConfig().trackinglastSuccess = new Date();
        configService.saveConfig();
        $scope.trackingInterval = null;
        $scope.trackingScheduleNext();
      }, function(error) {
        $scope.isLoading = false;
        $scope.trackingInterval = null;
        $scope.trackingScheduleNext();
      });
    }, function (reason) {
      $scope.isLoading = false;
      $scope.trackingInterval = null;
      $scope.trackingScheduleNext();
    });
  };
})

.controller('loginCtrl', function($scope, $location, $http, configService, $filter, $cordovaToast,
                                  loginService, $cordovaProgress){
  console.log('---------------------------------- loginCtrl');
  $scope.configService = configService;

  $scope.login = function(gotoUrl, verify) {
    // Request authorization
    if ((configService.getConfig().username) && (configService.getConfig().password)) {
      configService.saveConfig();
      if (verify) {
        $cordovaProgress.showSimpleWithLabelDetail(true, "Logging in", "Verifying Credentials");

        loginService.login(configService.getConfig().username, configService.getConfig().password).then(function () {
            $location.path(gotoUrl);
            $cordovaProgress.hide();
          },
          function () {
            $cordovaProgress.hide();
          }
        );
      } else {
        $location.path(gotoUrl);
      }
    } else {
      if (!(configService.getConfig().username) && !(configService.getConfig().password)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_username_password'));
      } else if (!(configService.getConfig().username)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_username'));
      } else if (!(configService.getConfig().password)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_password'));
      }
    }
  };
})

.controller('ReportCreateCtrl', function($scope, $rootScope, $q, $stateParams, formService, $cordovaToast, $filter,
                                         localDBService, utilService, reportService, configService){
  console.log("---- ReportCreateCtrl");
  $scope.configService = configService;
  $scope.isLoading = false;
  $scope.formService = formService;

  $scope.$on('appReady', function(){
    $scope.updateBadge(); // move after defining method and remove anon func
  });

  $scope.updateBadge = function() {
    var deferred = $q.defer();
    //-- update badge for pending reports
    localDBService.getRowsCount('reports').then(function (count) {
      $rootScope.pendingReportsCount = count;
      deferred.resolve();
    }, function() {
      console.log('Badge update failed.');
      deferred.reject();
    });
    return deferred.promise;
  };

  $scope.sync = function() {
    if (!$scope.isLoading) {
      $scope.isLoading = true;

      var rejected = function() {
        utilService.notify('sync failed.');
      };

      //-- pull forms
      formService.pullFroms().then(function(forms) {
        //--save forms
        formService.saveForms().then(function() {
          //-- push reports
          localDBService.getAllRows('reports').then(function (result) {
            var reports = localDBService.getAllRowsValues(result, true);
            var reportsKeys = localDBService.getAllRowsKeys(result);
            var promisesUpload = [];
            for (var index in reports) {
              promisesUpload.push(reportService.uploadReport(reports[index]));
            }
            $q.all(promisesUpload).then(function () {
              //-- remove pushed reports from local db
              var promises = [];
              for (var index in reportsKeys) {
                promises.push(localDBService.removeKey('reports', reportsKeys[index]));
              }
              $q.all(promises).then(function () {
                //-- push media
                var mediaCompleted = function(){
                  //-- update badge for pending reports
                  $scope.updateBadge().then(function () {
                    configService.getConfig().syncLastSuccess = new Date();
                    configService.saveConfig();
                    $scope.isLoading = false;
                    utilService.notify('Sync Completed.');
                  }, function() {
                    $scope.isLoading = false;
                    utilService.notify('Sync Completed.');
                  });
                };

                reportService.pushMedia().then(function(){
                  mediaCompleted();
                }, function(){
                  mediaCompleted();
                });
              }, function () {
                utilService.notify("failed to remove pushed reports");
                $scope.isLoading = false;
              });
            }, function (e) {
              utilService.notify('failed to push reports: ' + e);
              $scope.isLoading = false;
            });
          }, function () {
            console.log("---- sync, error");
            $cordovaToast.showShortBottom(($filter('translate')('error_server_not_found')));
            $scope.isLoading = false;
          });
        }, function() {
          utilService.notify('failed to remove all existing forms from local db');
        });
      }, function (e) {
        console.log('----------------- error: ', e);
        if (e && e.status === 401){
          utilService.notify('Please Authorize the app to connect to the server through the settings tab');
        } else {
          utilService.notify('failed to pull forms');
        }
        $scope.isLoading = false;
      });
    }
  };
})

.controller('ReportDetailCtrl', function($scope, $rootScope, $stateParams, $cordovaActionSheet, $cordovaCamera, $filter,
                                         $ionicLoading, reportService, utilService, localDBService, geolocationService,
                                         $cordovaToast, $cordovaProgress, $q, $state, formService, $window, $cordovaFile,
                                         $cordovaFileTransfer){
  console.log("---- ReportDetailCtrl");
  $scope.formService = formService;
  $scope.report = {};
  $scope.mediaPendingUploadMap = {};

  formService.setCurrentForm($stateParams.reportId);

  // iOS:  store pics in temp folder needs to be moved to application folder
  // Android: pics from library have uri 'content://....' format
  $scope.addMedia = function(tempFilePath) {
    var deferred = $q.defer();
    console.log('----[ addMedia, tempfile: ', tempFilePath);

    var processAddMedia = function(filePath) {
      console.log('----[ processAddMedia, filePath: ', filePath);
      if (($scope.report[$scope.getMediaPropName()] instanceof Array) === false) {
        $scope.report[$scope.getMediaPropName()] = [];
      }
      utilService.getFileAsBinaryString(filePath, false).then( function(result) {
        var filenameSha1 = utilService.getSHA1(result) + '.jpg';
        $scope.mediaPendingUploadMap[filenameSha1] = filePath;
        $scope.report[$scope.getMediaPropName()].push(filenameSha1);
        deferred.resolve();
        console.log('----[ filenameSha1: ', filenameSha1);
      }, function(err) {
        deferred.reject(err);
        console.log('---[ error. failed to get media file binary data: ', err);
      });
    };

    console.log('----[ platform.ionic: ', ionic.Platform.isIOS());
    $window.resolveLocalFileSystemURL(tempFilePath, function(fileSystem) {
      console.log('tempFilePath fileSystem: ', fileSystem);
      // iOS: uri returned from camera / library points to a file in tmp folder which will be removed when
      //      application is resatrted. Need to move file to application folder first.
      //
      // Android: when choosing from library/gallery on NEWER androids, it is not a file path. instead something like:
      //          content://com.google.android.apps.photos.contentprovider/-1/1/content%3A%2F%2Fmedia%2Fexternal%2Fimages%2Fmedia%2F85271/ACTUAL/2115746354
      //          can download it using file transfer but got permission error.
      //
      // Other option is to just get teh image as base64 encoded string from 'camera' (DATA_URL) and write a file.
      if (tempFilePath.indexOf('content://') !== 0) {
          //Move the temp file to permanent storage
        var localFileInfo = utilService.getFilePathComponents(tempFilePath);
        var newFilename = (new Date()).getTime() + ".jpg";
        $cordovaFile.copyFile(localFileInfo.dir, localFileInfo.filename, cordova.file.dataDirectory, newFilename)
          .then(function(success){
            processAddMedia(success.nativeURL);
          }, function(error){
            deferred.reject(error);
            utilService.notify('Failed to move media to permanent storage: ' + error);
          });
      } else {
        deferred.reject('not supported');
        utilService.notify('Cannot use file from library on this version of the OS');
      }
    }, function(e) {
      console.log('fileSystem failed. e ', e);
      deferred.reject(e);
    });

    return deferred.promise;
  };

  $scope.addMediaFix = function(tempFilePath) {
    var deferred = $q.defer();
    console.log('----[ addMedia, tempfile: ', tempFilePath);
    //tempFilePath = tempFilePath.replace("%", "%25");
    //console.log('----[ addMedia, r##$#$#$#$#$#$#$##$ replacing% with %25: ', tempFilePath);

    var processAddMedia = function(filePath) {
      console.log('----[ processAddMedia, filePath: ', filePath);
      if (($scope.report[$scope.getMediaPropName()] instanceof Array) === false) {
        $scope.report[$scope.getMediaPropName()] = [];
      }
      utilService.getFileAsBinaryString(filePath, false).then( function(result) {
        var filenameSha1 = utilService.getSHA1(result) + '.jpg';
        $scope.mediaPendingUploadMap[filenameSha1] = filePath;
        $scope.report[$scope.getMediaPropName()].push(filenameSha1);
        deferred.resolve();
        console.log('----[ filenameSha1: ', filenameSha1);
      }, function(err) {
        deferred.reject(err);
        console.log('---[ error. failed to get media file binary data: ', err);
      });
    };

    console.log('----[ platform.ionic: ', ionic.Platform.isIOS());
    $window.resolveLocalFileSystemURL(tempFilePath, function(theFile) {
      console.log('tempFilePath fileSystem: ', theFile);
      console.log('tempFilePath fileSystem toURL: ', theFile.toURL());
      console.log('tempFilePath fileSystem toInternalURL: ', theFile.toInternalURL());
      console.log('tempFilePath fileSystem nativeURL: ', theFile.nativeURL);

      // they say this works:
      // http://stackoverflow.com/questions/10335563/capturing-and-storing-a-picture-taken-with-the-camera-into-a-local-database-ph

      var newFilename = (new Date()).getTime() + ".jpg";
      var destDirname = "media_fl";

      $window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSys) {
        fileSys.root.getDirectory( destDirname, {
          create:true,
          exclusive: false
        },
        function(directory) {
          if (theFile.nativeURL.indexOf('content://') === 0) {
            var downloadedFilename = directory.nativeURL + newFilename;
            $cordovaFileTransfer.download(theFile.nativeURL, downloadedFilename, {}, true).then(function(){
              processAddMedia(downloadedFilename);
            }, function(e){
              deferred.reject(e);
              utilService.notify('Failed to _download_ file to permanent storage: ' + e);
            });
          } else {
            theFile.moveTo(directory, newFilename, function(file) {
              processAddMedia(file.nativeURL);
            },
            function(e){
              deferred.reject(e);
              utilService.notify('Failed to move media to permanent storage: ' + e);
            });
          }
        },
        function(e){
          deferred.reject(e);
          utilService.notify('Failed to getDirectory: ' + e);
        });
      },
      function(e){
        deferred.reject(e);
        utilService.notify('Failed to resolve fileSystem: ' + e);
      });
    }, function(e) {
      console.log('fileSystem failed. e ', e);
      deferred.reject(e);
    });

    return deferred.promise;
  };

  $scope.save = function() {
    console.log('----[ save: ', $scope.report);

    $cordovaProgress.showSimpleWithLabelDetail(true, "Saving", "Retrieving gps location");
    geolocationService.getCurrentPosition().then(function(position) {
      $cordovaProgress.hide();
      $cordovaProgress.showSimpleWithLabelDetail(true, "Saving", "Saving report to local DB");
      var payload = {
        'timestamp_local': new Date(),   // help make the object and hense the hash unique
        'data': $scope.report,
        'status': 'SUBMITTED',
        'geom': {
          'coordinates': [
            position.coords.longitude,
            position.coords.latitude
          ],
          'type': 'Point'
        },
        'form': formService.getCurrentForm().resource_uri
      };

      localDBService.insertValue('reports', payload).then(function() {
        localDBService.getRowsCount('reports').then(function(count) {
          $rootScope.pendingReportsCount = count;

          //TODO: implement foreachWaitForCompletionAsync such that it can call setKey and pass all arguments to it
          var promises = [];
          for (var key in $scope.mediaPendingUploadMap) {
            promises.push(localDBService.setKey('media', key, $scope.mediaPendingUploadMap[key], false));
          }
          $q.all(promises).then(function() {
            $scope.mediaPendingUploadMap = {};
            $cordovaProgress.hide();
            utilService.notify("Report saved to local db");
            $state.go('vida.report-create');
          },
          function(){
            utilService.notify("failed to save media to local db: " + key);
            $cordovaProgress.hide();
          });
        }, function() {
          $cordovaProgress.hide();
        });
      });
    }, function() {
      $cordovaProgress.hide();
    });
  };

  $scope.showHint = function(msg) {
    console.log('----[ ', msg);
    $ionicLoading.show({
      template: msg,
      duration: 2000
    });
  };

  $scope.hasMedia = function() {
    return typeof $scope.getMediaPropName() != 'undefined';
  };

  $scope.getMediaPropName = function() {
    if ('photos' in formService.getCurrentForm().schema.properties)
      return 'photos';
    if ('Photos' in formService.getCurrentForm().schema.properties)
      return 'Photos';
  };

  $scope.showCameraModal = function() {
    var prevPicture = false;
    var options = {
      title: $filter('translate')('title_picture_dialog'),
      buttonLabels: [$filter('translate')('modal_picture_take_picture'), $filter('translate')('modal_picture_choose_from_library')],
      addCancelButtonWithLabel: $filter('translate')('modal_cancel'),
      androidEnableCancelButton : true,
      winphoneEnableCancelButton : true
    };

    if ($scope.hasPlaceholderImage) {
      options.buttonLabels = [$filter('translate')('modal_picture_take_picture'),
        $filter('translate')('modal_picture_choose_from_library'),
        $filter('translate')('modal_picture_remove_picture')];
      prevPicture = true;
    }

    $cordovaActionSheet.show(options)
      .then(function(btnIndex) {
        if (prevPicture) {
          if (btnIndex != 3) {
            $scope.takeCameraPhoto_Personal(btnIndex);
          } else {
            //document.getElementById('personal_photo').src = peopleService.getPlaceholderImage();
            $scope.hasPlaceholderImage = true;
          }
        } else {
          $scope.takeCameraPhoto_Personal(btnIndex);
        }
      });
  };

  $scope.takeCameraPhoto_Personal = function(source) {
    var options = {
      quality: 30,  // 1 is terrible with missing colors.
                    // for low bandwidth environments, 30 seems to be decent. 400kb vs 2.1 MB
      destinationType: Camera.DestinationType.FILE_URI,  // write to file
      sourceType: source,
      allowEdit: true,
      encodingType: Camera.EncodingType.JPEG,
      popoverOptions: CameraPopoverOptions,
      saveToPhotoAlbum: false
    };

    $cordovaCamera.getPicture(options).then(
      $scope.addMedia,
      function(err) {
        console.log(err);
    });
  };
})

.controller('WebsiteCtrl', function($scope, $cordovaInAppBrowser){
  console.log("---- WebsiteCtrl");

  $scope.go = function() {
    $cordovaInAppBrowser.open('https://sites.google.com/a/flintlock.net/flintlock16dev/', '_system', {
      location: 'yes'
    });
  };
})

.controller('ShelterSearchCtrl', function ($rootScope, $scope, $state, shelterService) {
  console.log("---- ShelterSearchCtrl");
  shelterService.getAll().then(function(shelters) {
    // clear the markers object without recreating it
    for (var variableKey in $rootScope.markers){
      if ($rootScope.markers.hasOwnProperty(variableKey)){
        delete $rootScope.markers[variableKey];
      }
    }

    console.log("---- got all shelters: ", shelters);
    for (var i = 0; i < shelters.length; i++) {
      var shelter = shelters[i];

      // look for 'point' in wkt and get the pair of numbers in the string after it
      var trimParens = /^\s*\(?(.*?)\)?\s*$/;
      var coordinateString = shelter.geom.toLowerCase().split('point')[1].replace(trimParens, '$1').trim();
      var tokens = coordinateString.split(' ');
      var lng = parseFloat(tokens[0]);
      var lat = parseFloat(tokens[1]);
      var coord = shelterService.getLatLng(shelter.id);
      var detailUrl = '#/vida/shelter-search/shelter-detail/' + shelter.id;

      $rootScope.markers["shelter_" + shelter.id] = {
        draggable: false,
        message: '<div><span style="padding-right: 5px;">' + shelter.name + '</span><a class="icon ion-chevron-right trigger" href=' + detailUrl + '></a></div>',
        lat: coord.lat,
        lng: coord.lng,
        icon: {}
      };
    }
  });
})

.controller('ShelterDetailCtrl', function ($scope, $state, $stateParams, shelterService, $rootScope) {
  console.log("---- ShelterDetailCtrl. shelter id: ", $stateParams.shelterId, shelterService.getById($stateParams.shelterId));
    $scope.shelter = shelterService.getById($stateParams.shelterId);
    $scope.latlng = shelterService.getLatLng($stateParams.shelterId);

    $rootScope.buttonBack = function() {
      // Put edit/delete buttons back
      var tabs = document.getElementsByClassName("tab-item");
      for (var i=0; i < tabs.length; i++) {
        tabs[i].setAttribute('style', 'display: none;');
      }

      var backButton = document.getElementsByClassName("button-person-back");
      var editDeleteButtons = document.getElementsByClassName("button-person-edit");
      for (i=0; i < editDeleteButtons.length; i++) {
        editDeleteButtons[i].setAttribute('style', 'display: block;');    // Enables buttons
      }
      for (i=0; i < backButton.length; i++) {
        backButton[i].setAttribute('style', 'display: none;');   // Remove button
      }

      window.history.back();
    };

    $scope.$on("$destroy", function(){
      var backButton = document.getElementsByClassName("button-person-back");

      for (i=0; i < backButton.length; i++) {
        backButton[i].setAttribute('style', 'display: none;');   // Remove button
      }
    });

    $scope.buttonShelterHome = function() {
      shelterService.getAll();

      var tabs = document.getElementsByClassName("tab-item");
      for (var i=0; i < tabs.length; i++) {
        tabs[i].setAttribute('style', 'display: block;');
      }

      var backButton = document.getElementsByClassName("button-person-back");
      var editDeleteButtons = document.getElementsByClassName("button-person-edit");
      var saveCancelButtons = document.getElementsByClassName("button-person-post-edit");

      for (i=0; i < saveCancelButtons.length; i++) {
        saveCancelButtons[i].setAttribute('style', 'display: none;');  // remove buttons
      }
      for (i=0; i < editDeleteButtons.length; i++) {
        editDeleteButtons[i].setAttribute('style', 'display: none;');    // remove buttons
      }
      for (i=0; i < backButton.length; i++) {
        backButton[i].setAttribute('style', 'display: none;');   // Remove button
      }

      $state.go('vida.shelter-search');
    };
});